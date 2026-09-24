/**
 * Device Adapter cho máy đo huyết áp BPBIO750 triển khai interface dùng chung IMeasurementDevice.
 *
 * Chức năng:
 * - Đóng gói BpbioClient thành chuẩn interface `IMeasurementDevice<BloodPressureResult, void>`.
 * - Phục vụ Kiosk Session Machine tổng gọi tương tác đồng nhất không hardcode logic riêng.
 *
 * @module src/core/hardware/bpbio/device/bpbio.device.ts
 */

import type { IMeasurementDevice, DeviceStatus } from '../../types/measurement-device.interface'
import { BpbioClient } from '../client/bpbio-client'
import { createTransport } from '../../transport/transport-factory'
import type { TransportConfig, DeviceTransport } from '../../transport/transport.interface'
import type { BloodPressureResult } from '../types/bpbio.types'

export class BpbioDevice implements IMeasurementDevice<BloodPressureResult, void> {
  readonly id = 'bpbio' as const
  private client: BpbioClient

  constructor(
    private transportConfig?: TransportConfig,
    transport?: DeviceTransport,
  ) {
    const activeTransport = transport ?? createTransport(transportConfig?.type ?? 'usb-serial')
    this.client = new BpbioClient(activeTransport)
  }

  /** Mở kết nối tới BPBIO750 */
  async connect(config?: TransportConfig): Promise<void> {
    const targetConfig = config ?? this.transportConfig
    if (!targetConfig) {
      throw new Error('Chưa cung cấp TransportConfig cho BpbioDevice')
    }
    return this.client.connect(targetConfig)
  }

  /** Ngắt kết nối */
  async disconnect(): Promise<void> {
    return this.client.disconnect()
  }

  /** Bắt đầu đo: Gửi lệnh yêu cầu lấy kết quả */
  async startMeasurement(): Promise<void> {
    await this.client.requestResult()
  }

  /** Lắng nghe thay đổi trạng thái */
  onStatusChange(_cb: (status: DeviceStatus) => void): () => void {
    return () => {}
  }

  /** Rút kết quả đo huyết áp đã hoàn thành */
  async getResult(): Promise<BloodPressureResult> {
    return this.client.consumeResult()
  }

  /** Khôi phục trạng thái máy: Mở khóa màn hình */
  async reset(): Promise<void> {
    await this.client.unlock()
  }
}
