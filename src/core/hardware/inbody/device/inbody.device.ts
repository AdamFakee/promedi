/**
 * Device Adapter cho InBody 260S triển khai interface quản lý thiết bị dùng chung cho Kiosk.
 * @module src/core/hardware/inbody/device/inbody.device.ts
 */

import { createTransport } from '../../transport/transport-factory'
import type { DeviceTransport, TransportConfig } from '../../transport/transport.interface'
import type { IMeasurementDevice } from '../../types/measurement-device.interface'
import { InBodyClient } from '../client/inbody-client'
import type { InBodyResult, PatientInfo } from '../types/inbody.types'

export type DeviceStatusState =
  | 'IDLE'
  | 'CONNECTING'
  | 'READY'
  | 'MEASURING'
  | 'COMPLETED'
  | 'ERROR'

export class InBodyDevice implements IMeasurementDevice<InBodyResult | null, PatientInfo> {
  readonly id = 'inbody-260s' as const
  private client: InBodyClient
  private currentResult: InBodyResult | null = null

  constructor(
    private transportConfig?: TransportConfig,
    transport?: DeviceTransport,
  ) {
    const activeTransport = transport ?? createTransport(transportConfig?.type ?? 'tcp')
    this.client = new InBodyClient(activeTransport)
  }

  /** Mở kết nối Socket TCP / USB Serial tới InBody */
  async connect(config?: TransportConfig): Promise<void> {
    const targetConfig = config ?? this.transportConfig
    if (!targetConfig) {
      throw new Error('Chưa cung cấp TransportConfig cho InBodyDevice')
    }
    await this.client.connect(targetConfig)
  }

  /** Đóng kết nối */
  async disconnect(): Promise<void> {
    await this.client.disconnect()
  }

  /** Bắt đầu quy trình đo: Khóa máy và sẵn sàng nạp dữ liệu */
  async startMeasurement(patient: PatientInfo): Promise<void> {
    this.currentResult = null
    await this.client.lock('1')
    await this.client.sendInfo(patient)
  }

  /** Rút dữ liệu kết quả đo BIA */
  async getResult(): Promise<InBodyResult | null> {
    this.currentResult = await this.client.requestResult()
    return this.currentResult
  }

  /** Khôi phục trạng thái máy: Mở khóa hoàn toàn */
  async reset(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.lock('2')
    }
  }

  /** Lấy instance của InBodyClient */
  getClient(): InBodyClient {
    return this.client
  }
}
