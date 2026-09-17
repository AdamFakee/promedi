import type { HardwareScanMode, InventoryItem } from '.'

export const DisposalReason = {
  HEAVILY_DAMAGED: 'HEAVILY_DAMAGED',
  EXPIRED_DEPRECIATED: 'EXPIRED_DEPRECIATED',
  OUTDATED_TECH: 'OUTDATED_TECH',
  OTHER: 'OTHER',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type DisposalReason = (typeof DisposalReason)[keyof typeof DisposalReason]

export type DisposalItemStatus = 'REGISTERED' | 'UNREGISTERED'

export interface DisposalItem {
  id?: string
  code: string
  epc?: string
  name?: string
  unit?: string
  currentLocationId?: string
  currentLocationName?: string
  status?: string
  tagStatus: DisposalItemStatus
}

export interface DisposalSummary {
  totalCount: number
  registeredCount: number
  unregisteredCount: number
}

export interface LookupDisposalAssetsRequest {
  locationId?: string
  codes: string[]
}

export interface LookupDisposalAssetsResponse {
  items: InventoryItem[]
}

export interface CreateDisposalReceiptRequest {
  idempotencyKey: string
  reason: DisposalReason
  locationId: string
  councilName?: string
  items: {
    assetId?: string
    epc?: string
    code: string
  }[]
  imageUris: string[]
  signatureUri?: string
  note?: string
}

export interface CreateDisposalReceiptResponse {
  id: string
  code: string
  createdAt: string
  itemCount: number
  status: 'SUCCESS' | 'FAILED'
}

export interface DisposalScanConfig {
  scanMode: HardwareScanMode
  rfidPower: number
}
