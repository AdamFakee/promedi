import type { AssetStatus } from './asset.types'
import type { Location } from './location.types'

/** Lý do nhập kho */
export const StockInReason = {
  /** Mua mới (Chuyển trạng thái S0 PENDING_STOCK_IN -> S1 IN_STOCK) */
  NEW_PURCHASE: 'NEW_PURCHASE',
  /** Thu hồi thiết bị từ Khoa/Phòng */
  REVOCATION: 'REVOCATION',
  /** Sau khi KTV hoàn tất sửa chữa (Chuyển S4 UNDER_REPAIR -> S1 IN_STOCK) */
  REPAIR_RETURN: 'REPAIR_RETURN',
  /** Thu hồi sau khi mượn (Chuyển S5 ON_LOAN -> S1 IN_STOCK) */
  LOAN_RETURN: 'LOAN_RETURN',
  /** Nhập kho khác */
  OTHER: 'OTHER',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type StockInReason = (typeof StockInReason)[keyof typeof StockInReason]

/** Nhãn hiển thị tiếng Việt của Lý do nhập kho */
export const StockInReasonLabels: Record<StockInReason, string> = {
  NEW_PURCHASE: 'Mua mới',
  REVOCATION: 'Thu hồi',
  REPAIR_RETURN: 'Sau sửa chữa',
  LOAN_RETURN: 'Thu hồi sau mượn',
  OTHER: 'Khác',
}

/** Trạng thái Tag RFID quét được trong phiên nhập kho */
export const StockInTagStatus = {
  /** Tag hợp lệ - Đã khớp thông tin tài sản trong DB */
  REGISTERED: 'REGISTERED',
  /** Tag lạ - Chưa có dữ liệu tài sản trong DB */
  UNREGISTERED: 'UNREGISTERED',
  /** Dữ liệu mã quét không hợp lệ */
  INVALID: 'INVALID',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type StockInTagStatus = (typeof StockInTagStatus)[keyof typeof StockInTagStatus]

/** Item tài sản trong phiên quét Nhập Kho */
export interface StockInItem {
  id: string
  code: string
  name: string
  epc: string
  categoryName?: string
  status?: AssetStatus | string
  tagStatus: StockInTagStatus
  scannedAt: string
}

/** Request payload tạo Phiếu Nhập Kho */
export interface CreateStockInReceiptRequest {
  idempotencyKey: string
  reason: StockInReason
  targetLocationId: string
  items: {
    assetId: string
    epc: string
    code?: string
  }[]
  note?: string
}

/** Response / Data Phiếu Nhập Kho */
export interface StockInReceipt {
  id: string
  receiptNo: string
  reason: StockInReason
  reasonLabel: string
  targetLocation: Location
  totalQuantity: number
  note?: string
  createdAt: string
  createdBy: string
}
