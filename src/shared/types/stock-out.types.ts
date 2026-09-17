import type { HardwareScanMode, InventoryItem } from '.'

export const StockOutReason = {
  DISPATCH: 'DISPATCH',
  LOAN: 'LOAN',
  MAINTENANCE: 'MAINTENANCE',
  DISPOSAL: 'DISPOSAL',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type StockOutReason = (typeof StockOutReason)[keyof typeof StockOutReason]

export type StockOutItemStatus = 'REGISTERED' | 'UNREGISTERED'

export interface StockOutItem {
  id?: string
  code: string
  epc?: string
  name?: string
  unit?: string
  currentLocationId?: string
  currentLocationName?: string
  tagStatus: StockOutItemStatus
}

export interface StockOutSummary {
  totalCount: number
  registeredCount: number
  unregisteredCount: number
}

export interface LookupStockOutAssetsRequest {
  sourceLocationId?: string
  codes: string[]
}

export interface LookupStockOutAssetsResponse {
  items: InventoryItem[]
}

export interface CreateStockOutReceiptRequest {
  idempotencyKey: string
  reason: StockOutReason
  sourceLocationId: string
  items: {
    assetId?: string
    epc?: string
    code: string
  }[]
  note?: string
}

export interface CreateStockOutReceiptResponse {
  id: string
  code: string
  createdAt: string
  itemCount: number
  status: 'SUCCESS' | 'FAILED'
}

export interface StockOutScanConfig {
  scanMode: HardwareScanMode
  rfidPower: number
}
