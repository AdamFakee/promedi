/**
 * Lớp vận chuyển dữ liệu qua kết nối USB-to-Serial (USB Serial Transport Layer).
 *
 * Chức năng:
 * - Là wrapper ở tầng JavaScript kết nối tới Expo Native Module `expo-usb-serial-bridge`.
 * - Điều khiển giao tiếp Serial với các thiết bị đo cắm qua dây USB (InBody 260S, BPBIO750).
 * - Cách ly sự kiện đa cổng (Multi-port Isolation): Mỗi instance lọc chính xác dữ liệu theo `portId` ('inbody' | 'bpbio').
 * - Sử dụng `Promise.race` để xử lý timeout kết nối `connectTimeoutMs` ở tầng JavaScript một cách an toàn.
 *
 * @module src/core/hardware/transport/usb-serial-transport.ts
 */

import { UsbSerialBridge, emitter } from '../../../../modules/expo-usb-serial-bridge'
import type { DeviceTransport, TransportConfig } from './transport.interface'
import { TransportError } from './transport.interface'

export class UsbSerialTransport implements DeviceTransport {
  /** Cờ theo dõi trạng thái kết nối */
  private connected = false
  /** Port ID logic riêng của instance này (VD: 'inbody', 'bpbio', 'probe:inbody') */
  private portId: string | null = null

  /**
   * Mở cổng USB Serial bất đồng bộ.
   *
   * @param config Cấu hình cổng USB (portId, deviceKey, baudRate, connectTimeoutMs).
   * @throws TransportError Nếu thiếu quyền, thiết bị bị ngắt hoặc timeout.
   */
  async connect(config: TransportConfig): Promise<void> {
    if (config.type !== 'usb-serial') {
      throw new TransportError(
        'UsbSerialTransport chỉ nhận config type "usb-serial"',
        'CONNECT_FAILED',
      )
    }
    this.portId = config.portId
    const timeoutMs = config.connectTimeoutMs ?? 5000

    try {
      // Tự động đảm bảo đã có quyền USB trước khi gọi open
      try {
        await UsbSerialBridge.requestPermission(config.deviceKey)
      } catch (_e) {
        // Bỏ qua ngoại lệ nếu thiết bị đã được cấp quyền trước đó
      }

      // Dùng Promise.race để quản lý timeout mở cổng ở JS mà không làm đơ Native code
      await Promise.race([
        UsbSerialBridge.open(config.portId, config.deviceKey, config.baudRate),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new TransportError('Timeout khi mở cổng USB Serial', 'CONNECT_FAILED')),
            timeoutMs,
          ),
        ),
      ])
      this.connected = true
    } catch (e: any) {
      if (e instanceof TransportError) throw e
      const code = e?.code as string | undefined
      const mapped =
        code === 'PERMISSION_DENIED'
          ? 'PERMISSION_DENIED'
          : code === 'DEVICE_NOT_FOUND'
            ? 'DEVICE_NOT_FOUND'
            : 'CONNECT_FAILED'
      throw new TransportError(e?.message ?? 'Không mở được cổng USB Serial', mapped)
    }
  }

  /**
   * Đóng cổng USB Serial và ngắt luồng đọc của portId này.
   */
  async disconnect(): Promise<void> {
    if (this.portId) {
      try {
        await UsbSerialBridge.close(this.portId)
      } catch {
        // Bỏ qua ngoại lệ dọn dẹp khi ngắt kết nối
      }
    }
    this.connected = false
  }

  /**
   * Ghi mảng byte nhị phân thô xuống dây cáp USB Serial.
   *
   * @param data Uint8Array Mảng byte dữ liệu cần gửi.
   */
  async write(data: Uint8Array): Promise<void> {
    if (!this.connected || !this.portId) throw new TransportError('Chưa kết nối', 'WRITE_FAILED')
    try {
      const hexStr = Array.from(data, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(
        ' ',
      )
      console.log(`[USB-SERIAL SEND] [Port: ${this.portId}] (${data.length} bytes): ${hexStr}`)
      // Native Bridge nhận mảng số ByteArray
      await UsbSerialBridge.write(this.portId, Array.from(data))
    } catch (e: any) {
      throw new TransportError(e?.message ?? 'Ghi dữ liệu thất bại', 'WRITE_FAILED')
    }
  }

  /**
   * Lắng nghe byte dữ liệu nhận từ Native Event Emitter, lọc đúng portId của instance này.
   *
   * @param cb Callback nhận mảng byte Uint8Array.
   * @return Hàm unsubscribe tháo bỏ listener.
   */
  onData(cb: (chunk: Uint8Array) => void) {
    const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
      // Lọc chính xác portId để dữ liệu từ cổng khác không lọt sang codec này
      if (e.portId === this.portId) {
        const hexStr = e.bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
        console.log(`[USB-SERIAL RECV] [Port: ${this.portId}] (${e.bytes.length} bytes): ${hexStr}`)
        cb(new Uint8Array(e.bytes))
      }
    })
    return () => sub.remove()
  }

  /**
   * Lắng nghe sự kiện lỗi cổng Serial từ Native Event Emitter.
   *
   * @param cb Callback xử lý TransportError.
   * @return Hàm unsubscribe tháo bỏ listener.
   */
  onError(cb: (err: TransportError) => void) {
    const sub = emitter.addListener('onError', (e: { portId: string; message: string }) => {
      if (e.portId === this.portId) {
        cb(new TransportError(e.message, 'SOCKET_ERROR'))
      }
    })
    return () => sub.remove()
  }

  /**
   * Lắng nghe sự kiện dây USB bị rút đột ngột (Detached Event).
   *
   * @param cb Callback xử lý khi ngắt cáp vật lý.
   * @return Hàm unsubscribe tháo bỏ listener.
   */
  onClose(cb: () => void) {
    const sub = emitter.addListener('onDetached', (e: { portId: string }) => {
      if (e.portId === this.portId) {
        this.connected = false
        cb()
      }
    })
    return () => sub.remove()
  }

  /**
   * Kiểm tra trạng thái cổng USB Serial có đang mở hay không.
   */
  isConnected(): boolean {
    return this.connected
  }
}
