/**
 * Lớp vận chuyển dữ liệu qua kết nối TCP/IP Socket (TCP Transport Layer).
 *
 * Chức năng:
 * - Phục vụ kết nối mạng LAN / Wi-Fi với các thiết bị y tế hỗ trợ giao thức TCP (như InBody 260S kết nối qua IP:Port 2004).
 * - Sử dụng thư viện `react-native-tcp-socket` để quản lý socket không chặn (Non-blocking Socket).
 * - Mã hóa `latin1` bảo toàn nguyên vẹn dữ liệu byte Hex nhị phân thô (STX 0x02, ETX 0x03, ESC 0x1B).
 *
 * @module src/core/hardware/transport/tcp-transport.ts
 */

import TcpSockets from 'react-native-tcp-socket'
import type { DeviceTransport, TransportConfig } from './transport.interface'
import { TransportError } from './transport.interface'

export class TcpTransport implements DeviceTransport {
  /** Socket client từ react-native-tcp-socket */
  private client: TcpSockets.Socket | null = null
  /** Cờ theo dõi trạng thái kết nối */
  private connected = false

  /**
   * Mở kết nối TCP Socket tới thiết bị qua IP Host và Port.
   *
   * @param config Cấu hình kết nối TCP (host, port, connectTimeoutMs).
   * @throws TransportError Nếu kết nối thất bại hoặc quá thời gian chờ (Timeout).
   */
  async connect(config: TransportConfig): Promise<void> {
    if (config.type && config.type !== 'tcp') {
      throw new TransportError('TcpTransport chỉ nhận config type "tcp"', 'CONNECT_FAILED')
    }

    const timeoutMs = config.connectTimeoutMs ?? 5000

    return new Promise((resolve, reject) => {
      // Đặt bộ đếm thời gian Timeout kết nối
      const timer = setTimeout(() => {
        if (this.client) this.client.destroy()
        reject(new TransportError('Timeout kết nối TCP socket', 'CONNECT_FAILED'))
      }, timeoutMs)

      // Tạo socket connection tới Host:Port
      this.client = TcpSockets.createConnection({ host: config.host, port: config.port }, () => {
        clearTimeout(timer)
        this.connected = true
        resolve()
      })

      // Bắt lỗi kết nối socket ban đầu
      this.client.on('error', (err) => {
        clearTimeout(timer)
        this.connected = false
        reject(new TransportError(err.message, 'CONNECT_FAILED'))
      })

      // Lắng nghe sự kiện ngắt kết nối
      this.client.on('close', () => {
        this.connected = false
      })
    })
  }

  /**
   * Ngắt kết nối TCP socket và giải phóng tài nguyên client.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy()
      this.client = null
    }
    this.connected = false
  }

  /**
   * Ghi mảng byte nhị phân thô xuống TCP socket với encoding latin1 (bảo toàn byte).
   *
   * @param data Mảng byte dữ liệu cần gửi.
   */
  async write(data: Uint8Array): Promise<void> {
    if (!this.connected || !this.client) {
      throw new TransportError('Chưa kết nối TCP socket', 'WRITE_FAILED')
    }
    return new Promise((resolve, reject) => {
      // Ép kiểu Buffer với encoding 'latin1' để bảo toàn các byte Hex > 0x7F
      this.client?.write(Buffer.from(data), 'latin1', (err?: any) => {
        if (err) reject(new TransportError(err.message ?? 'Write failed', 'WRITE_FAILED'))
        else resolve()
      })
    })
  }

  /**
   * Lắng nghe luồng byte dữ liệu từ thiết bị gửi về qua socket.
   *
   * @param cb Callback nhận mảng byte Uint8Array khi có dữ liệu mới.
   * @return Hàm unsubscribe tháo bỏ listener.
   */
  onData(cb: (chunk: Uint8Array) => void) {
    if (!this.client) return () => {}
    const listener = (data: Buffer | string) => {
      const buf = typeof data === 'string' ? Buffer.from(data, 'latin1') : data
      cb(new Uint8Array(buf))
    }
    this.client.on('data', listener)
    return () => this.client?.removeListener('data', listener)
  }

  /**
   * Lắng nghe sự kiện lỗi socket trong quá trình hoạt động.
   *
   * @param cb Callback xử lý lỗi TransportError.
   * @return Hàm unsubscribe tháo bỏ listener.
   */
  onError(cb: (err: TransportError) => void) {
    if (!this.client) return () => {}
    const listener = (err: Error) => cb(new TransportError(err.message, 'SOCKET_ERROR'))
    this.client.on('error', listener)
    return () => this.client?.removeListener('error', listener)
  }

  /**
   * Lắng nghe sự kiện kết nối socket bị ngắt/đóng.
   *
   * @param cb Callback xử lý khi đóng kết nối.
   * @return Hàm unsubscribe tháo bỏ listener.
   */
  onClose(cb: () => void) {
    if (!this.client) return () => {}
    this.client.on('close', cb)
    return () => this.client?.removeListener('close', cb)
  }

  /**
   * Kiểm tra trạng thái socket có đang hoạt động hay không.
   */
  isConnected(): boolean {
    return this.connected
  }
}
