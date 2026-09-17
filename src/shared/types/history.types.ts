import type { PaginationParams } from './api.types'

/** Các loại giao dịch / sự cố trong Lịch sử */
export const TransactionType = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  INVENTORY: 'INVENTORY',
  DISPATCH: 'DISPATCH',
  RETURN: 'RETURN',
  REPORT_BROKEN: 'REPORT_BROKEN',
  REPAIR: 'REPAIR',
  LOAN: 'LOAN',
  DISPOSAL: 'DISPOSAL',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]

/** Trạng thái giao dịch */
export const TransactionStatus = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus]

/** Lọc khoảng thời gian */
export const HistoryDateFilter = {
  ALL: 'ALL',
  TODAY: 'TODAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  THIS_MONTH: 'THIS_MONTH',
  CUSTOM: 'CUSTOM',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type HistoryDateFilter = (typeof HistoryDateFilter)[keyof typeof HistoryDateFilter]

/** Đơn vị item hiển thị trên Timeline Lịch sử */
export interface HistoryItem {
  id: string
  code: string
  type: TransactionType
  title: string
  actorName: string
  actorRole?: string
  locationName?: string
  assetCount: number
  status: TransactionStatus
  createdAt: string
  targetRoute?: string
}

/** Tham số lọc Lịch sử Giao dịch */
export interface GetHistoryParams extends PaginationParams {
  type?: TransactionType | 'ALL'
  status?: TransactionStatus | 'ALL'
  dateFilter?: HistoryDateFilter
  startDate?: string
  endDate?: string
  search?: string
}
