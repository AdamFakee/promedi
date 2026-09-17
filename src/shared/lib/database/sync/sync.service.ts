import { Model } from '@nozbe/watermelondb'
import { SyncDatabaseChangeSet, synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../database'

export interface SyncPullResult {
  changes: SyncDatabaseChangeSet
  timestamp: number
}

export interface MasterDataSyncAdapter {
  pullChanges: (params: { lastPulledAt: number | null }) => Promise<SyncPullResult>
}

export interface OrderOutboxItem {
  id: string
  shiftId: string
  staffId: string
  status: string
  subtotal: number
  discount: number
  voucherCode?: string | null
  voucherDiscount: number
  total: number
  totalTax: number
  note?: string | null
  refundReason?: string | null
  originalOrderId?: string | null
  customerTaxInfo?: unknown
  itemsSnapshot: unknown
  paymentsSnapshot: unknown
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrderRaw {
  id: string
  shift_id: string
  staff_id: string
  status: string
  subtotal: number
  discount: number
  voucher_code: string | null
  voucher_discount: number
  total: number
  total_tax: number
  note: string | null
  refund_reason: string | null
  original_order_id: string | null
  customer_tax_info: unknown
  items_snapshot: unknown
  payments_snapshot: unknown
  is_deleted: boolean
  created_at: number
  updated_at: number
}

export interface OrderOutboxSyncAdapter {
  getUnsyncedOrders: () => Promise<OrderOutboxItem[]>
  syncOfflineOrders: (orders: OrderRaw[]) => Promise<void>
  markOrdersAsSynced: (ids: string[]) => Promise<void>
  localIdToGuid?: (id: string) => string
}

let masterDataAdapter: MasterDataSyncAdapter | undefined
let orderOutboxAdapter: OrderOutboxSyncAdapter | undefined

export const configureSyncService = (adapters: {
  masterData?: MasterDataSyncAdapter
  orderOutbox?: OrderOutboxSyncAdapter
}) => {
  masterDataAdapter = adapters.masterData ?? masterDataAdapter
  orderOutboxAdapter = adapters.orderOutbox ?? orderOutboxAdapter
}

const emptyChanges = (): SyncDatabaseChangeSet => ({})

const toRemoteId = (id: string) => orderOutboxAdapter?.localIdToGuid?.(id) ?? id

/**
 * SyncService - Quản lý đồng bộ dữ liệu Offline/Online.
 */
export const SyncService = {
  /**
   * Kéo dữ liệu danh mục từ adapter app-specific nếu có cấu hình.
   */
  pullMasterData: async () => {
    try {
      await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
          if (!masterDataAdapter) {
            return { changes: emptyChanges(), timestamp: Date.now() }
          }

          return masterDataAdapter.pullChanges({ lastPulledAt: lastPulledAt ?? null })
        },
        pushChanges: async () => {
          // KHÔNG đẩy Orders thông qua WatermelonDB ở core layer.
        },
      })
    } catch (error) {
      console.error('--- PULL MASTER DATA FAILED ---', error)
      throw error
    }
  },

  /**
   * Đồng bộ các đơn hàng được tạo lúc Offline lên Server qua adapter app-specific.
   */
  drainOutbox: async () => {
    if (!orderOutboxAdapter) return

    try {
      const unsyncedOrders = await orderOutboxAdapter.getUnsyncedOrders()

      if (unsyncedOrders.length === 0) {
        return
      }

      console.log(`[SyncService] Draining ${unsyncedOrders.length} offline orders...`)

      const rawOrders: OrderRaw[] = unsyncedOrders.map((order) => ({
        id: toRemoteId(order.id),
        shift_id: order.shiftId,
        staff_id: order.staffId,
        status: order.status,
        subtotal: order.subtotal,
        discount: order.discount,
        voucher_code: order.voucherCode || null,
        voucher_discount: order.voucherDiscount,
        total: order.total,
        total_tax: order.totalTax,
        note: order.note || null,
        refund_reason: order.refundReason || null,
        original_order_id: order.originalOrderId ? toRemoteId(order.originalOrderId) : null,
        customer_tax_info: order.customerTaxInfo,
        items_snapshot: order.itemsSnapshot,
        payments_snapshot: order.paymentsSnapshot,
        is_deleted: order.isDeleted,
        created_at: order.createdAt.getTime(),
        updated_at: order.updatedAt.getTime(),
      }))

      const CHUNK_SIZE = 10
      for (let i = 0; i < rawOrders.length; i += CHUNK_SIZE) {
        const chunk = rawOrders.slice(i, i + CHUNK_SIZE)

        try {
          await orderOutboxAdapter.syncOfflineOrders(chunk)
          await orderOutboxAdapter.markOrdersAsSynced(chunk.map((order) => order.id))
          console.log(`[SyncService] Synced chunk ${i / CHUNK_SIZE + 1} (${chunk.length} orders)`)
        } catch (chunkError) {
          console.error(`[SyncService] Failed to sync chunk ${i / CHUNK_SIZE + 1}`, chunkError)
          break
        }
      }

      console.log('[SyncService] Offline orders drain process completed.')
    } catch (error) {
      console.error('--- DRAIN OUTBOX FAILED ---', error)
      throw error
    }
  },
}

export type SyncModel = Model
