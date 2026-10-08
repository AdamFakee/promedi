/**
 * @file tof.device.ts
 * @brief Device Adapter ToFDistanceDevice implement IMeasurementDevice kết nối USB Serial transport.
 * @module src/core/hardware/tof/device/tof.device.ts
 */

import type { DeviceStatus } from '../../types/measurement-device.interface'
import type { TransportConfig } from '../../transport/transport.interface'
import { TransportError } from '../../transport/transport.interface'
import { listCandidateDevices, requestUsbPermission } from '../../resolver/list-candidate-devices'
import { UsbSerialTransport } from '../../transport/usb-serial-transport'
import { ToFClient } from '../client/tof-client'
import type {
  HeightCalculationResult,
  HeightEngineConfig,
  IToFDistanceDevice,
  VL53L5CXFramePayload,
} from '../types/tof.types'

export class ToFDistanceDevice implements IToFDistanceDevice {
  public readonly id = 'tof-vl53l5cx'
  private transport: UsbSerialTransport
  private client: ToFClient
  private status: DeviceStatus = 'idle'
  private statusListeners: Set<(status: DeviceStatus) => void> = new Set()
  private mockMode = false
  private latestResult: HeightCalculationResult | null = null
  private unsubscribeTransportData: (() => void) | null = null
  private unsubscribeTransportClose: (() => void) | null = null
  private unsubscribeTransportError: (() => void) | null = null

  constructor(config?: Partial<HeightEngineConfig>) {
    this.transport = new UsbSerialTransport()
    this.client = new ToFClient(config)

    this.client.onHeightResult((result) => {
      this.latestResult = result
    })
  }

  /** Cập nhật cấu hình tham số cho Engine (độ cao trần, gain, offset, calibration) */
  public updateEngineConfig(config: Partial<HeightEngineConfig>): void {
    this.client.updateEngineConfig(config)
  }

  /**
   * Bật/Tắt chế độ Mock Mode cho thiết bị
   * @param enable true = Giả lập, false = Cổng thật
   */
  public setMockMode(enable: boolean): void {
    this.mockMode = enable
  }

  /**
   * Kết nối tới thiết bị cảm biến ToF qua USB Serial với tốc độ 460800 baud.
   * Tự động dò danh sách ứng viên UsbDeviceCandidate nếu config không truyền deviceKey.
   * @param config Cấu hình khởi tạo TransportConfig (Tùy chọn)
   */
  public async connect(config?: TransportConfig): Promise<void> {
    this.updateStatus('connecting')

    if (this.mockMode) {
      this.client.startMockStream(170.0)
      this.updateStatus('connected')
      return
    }

    try {
      let targetKey: string | undefined
      let baudRate = 460800

      if (config && config.type === 'usb-serial') {
        targetKey = config.deviceKey
        if (config.baudRate) {
          baudRate = config.baudRate
        }
      }

      // Nếu không truyền deviceKey trong config, tự động gọi listCandidateDevices để lấy ứng viên USB đang cắm
      if (!targetKey) {
        const candidates = await listCandidateDevices()
        if (candidates.length === 0) {
          throw new TransportError(
            'Không tìm thấy thiết bị USB Cảm biến ToF đang cắm vào Kiosk',
            'DEVICE_NOT_FOUND',
          )
        }
        targetKey = candidates[0].deviceKey
      }

      await requestUsbPermission(targetKey)

      await this.transport.connect({
        type: 'usb-serial',
        portId: 'tof',
        deviceKey: targetKey,
        baudRate,
        connectTimeoutMs: 3000,
      })

      this.unsubscribeTransportData = this.transport.onData((chunk: Uint8Array) => {
        this.client.processChunk(chunk)
      })

      this.unsubscribeTransportClose = this.transport.onClose(() => {
        this.updateStatus('idle')
      })

      this.unsubscribeTransportError = this.transport.onError(() => {
        this.updateStatus('error')
      })

      this.updateStatus('connected')
    } catch (error) {
      this.updateStatus('error')
      throw error
    }
  }

  /**
   * Ngắt kết nối thiết bị và dừng luồng đọc
   */
  public async disconnect(): Promise<void> {
    if (this.unsubscribeTransportData) {
      this.unsubscribeTransportData()
      this.unsubscribeTransportData = null
    }
    if (this.unsubscribeTransportClose) {
      this.unsubscribeTransportClose()
      this.unsubscribeTransportClose = null
    }
    if (this.unsubscribeTransportError) {
      this.unsubscribeTransportError()
      this.unsubscribeTransportError = null
    }

    this.client.stopMockStream()

    if (this.transport.isConnected()) {
      await this.transport.disconnect()
    }

    this.updateStatus('idle')
  }

  /** Bắt đầu chu kỳ đo chiều cao */
  public async startMeasurement(): Promise<void> {
    this.updateStatus('measuring')
  }

  /**
   * Lấy kết quả đo chiều cao mới nhất từ cảm biến
   */
  public async getResult(): Promise<HeightCalculationResult> {
    if (!this.latestResult) {
      throw new Error('Chưa có kết quả đo chiều cao từ cảm biến ToF')
    }
    this.updateStatus('completed')
    return this.latestResult
  }

  /** Reset thiết bị về trạng thái ban đầu */
  public async reset(): Promise<void> {
    this.client.reset()
    this.latestResult = null
    this.updateStatus('idle')
  }

  /** Đăng ký lắng nghe raw frame */
  public onFrame(callback: (frame: VL53L5CXFramePayload) => void): () => void {
    return this.client.onFrame(callback)
  }

  /** Đăng ký lắng nghe kết quả đo chiều cao và tiến trình ổn định */
  public onHeightResult(callback: (result: HeightCalculationResult) => void): () => void {
    return this.client.onHeightResult(callback)
  }

  /** Đăng ký lắng nghe thay đổi trạng thái kết nối */
  public onStatusChange(callback: (status: DeviceStatus) => void): () => void {
    this.statusListeners.add(callback)
    callback(this.status)
    return () => {
      this.statusListeners.delete(callback)
    }
  }

  /** Cập nhật trạng thái và thông báo cho các subscriber */
  private updateStatus(newStatus: DeviceStatus): void {
    this.status = newStatus
    this.statusListeners.forEach((listener) => listener(newStatus))
  }
}
