/**
 * Device Adapter cho InBody 260S triển khai interface quản lý thiết bị dùng chung cho Kiosk.
 * @module src/core/hardware/inbody/device/inbody.device.ts
 */

import { InBodyClient } from '../client/inbody-client'
import { TcpTransport } from '../transport/tcp-transport'
import type { PatientInfo, InBodyResult } from '../types/inbody.types'
import type { TransportConfig, DeviceTransport } from '../transport/transport.interface'

export type DeviceStatusState =
  | 'IDLE'
  | 'CONNECTING'
  | 'READY'
  | 'MEASURING'
  | 'COMPLETED'
  | 'ERROR'

export interface IMeasurementDevice {
  readonly id: string
  connect(config: TransportConfig): Promise<void>
  disconnect(): Promise<void>
  startMeasurement(patient: PatientInfo): Promise<void>
  getResult(): Promise<InBodyResult | null>
  reset(): Promise<void>
}

export class InBodyDevice implements IMeasurementDevice {
  readonly id = 'inbody-260s' as const
  private client: InBodyClient
  private currentResult: InBodyResult | null = null

  constructor(transport: DeviceTransport = new TcpTransport()) {
    this.client = new InBodyClient(transport)
  }

  /** Mở kết nối Socket TCP tới InBody */
  async connect(config: TransportConfig): Promise<void> {
    await this.client.connect(config)
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
