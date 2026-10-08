/**
 * TypeScript Types cho XState Machine `inbody-session.machine`.
 * @module src/core/hardware/inbody/machine/inbody-session.types.ts
 */

import type { InBodyClient } from '../client/inbody-client'
import type { InBodyErrorCode, InBodyResult, PatientInfo } from '../types/inbody.types'

/** Context dữ liệu trạng thái của Session Machine */
export interface InBodyMachineContext {
  /** Thể hiện của client InBody */
  client: InBodyClient
  /** Hàm resolve deviceKey từ BindingStore lúc runtime */
  getDeviceKey: () => Promise<string | undefined>
  /** Baudrate kết nối USB Serial */
  baudRate: number
  /** Hồ sơ thông tin cá nhân khách hàng */
  patientInfo: PatientInfo | null
  /** Kết quả đo BIA thu thập được */
  result: InBodyResult | null
  /** Số lần retry không nhận được ETX liên tiếp */
  consecutiveNoEtxCount: number
  /** Tiến độ đo giả lập trên UI (0 - 100%) */
  progress: number
  /** Mã lỗi mới nhất nếu thiết bị báo STATUS 35 */
  lastErrorCode: InBodyErrorCode | null
}

/** Danh sách các Sự kiện (Events) của Session Machine */
export type InBodyMachineEvent =
  | { type: 'CONNECT' }
  | { type: 'START'; patientInfo: PatientInfo }
  | { type: 'STATUS_UPDATE'; status: string; errorCode?: string }
  | { type: 'RESULT_RECEIVED'; result: InBodyResult }
  | { type: 'TRANSPORT_TIMEOUT' }
  | { type: 'RESET' }
  | { type: 'DISCONNECT' }
