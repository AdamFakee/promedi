import type { InventoryItem, Location } from '.'

export type DispatchMode = 'DISPATCH' | 'EMERGENCY' | 'RECALL'

export interface RequisitionSlip {
  id: string
  code: string
  departmentId: string
  departmentName: string
  requestedItemsCount: number
  priority: 'URGENT' | 'NORMAL'
  status: 'WAITING_DISPATCH' | 'COMPLETED'
  createdAt: string
  createdByName: string
  targetLocation: Location
}

export interface CreateDispatchReceiptRequest {
  idempotencyKey: string
  mode: DispatchMode
  requisitionId?: string
  sourceLocationId: string
  targetLocationId: string
  recipientName?: string
  items: {
    assetId?: string
    epc?: string
    code: string
  }[]
  note?: string
}

export interface CreateDispatchReceiptResponse {
  id: string
  code: string
  createdAt: string
  itemCount: number
  mode: DispatchMode
  status: 'SUCCESS' | 'FAILED'
}

export interface LookupDispatchAssetsRequest {
  sourceLocationId?: string
  targetLocationId?: string
  codes: string[]
}

export interface LookupDispatchAssetsResponse {
  items: InventoryItem[]
}
