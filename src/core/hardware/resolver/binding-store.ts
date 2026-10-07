/**
 * Bộ lưu trữ kết quả tự dò cổng USB (Device Binding Local Storage).
 *
 * Chức năng:
 * - Lưu trữ kết quả gán Role ('inbody' | 'bpbio' | 'tof') với mã định danh thiết bị USB (`deviceKey`) vào bộ nhớ nhanh MMKV.
 * - Phục vụ luồng Fast-Path Verification: Giúp Kiosk khởi động siêu nhanh ở các lần bật máy tiếp theo nếu dây cắm không đổi.
 *
 * @module src/core/hardware/resolver/binding-store.ts
 */

import { createMMKV } from 'react-native-mmkv'

/** Vai trò của thiết bị đo được gán bởi Kiosk */
export type DeviceRole = 'inbody' | 'bpbio' | 'tof'

/** Cấu trúc liên kết vai trò thiết bị và khóa định danh USB */
export interface DeviceBinding {
  /** Vai trò thiết bị ('inbody' | 'bpbio' | 'tof') */
  role: DeviceRole
  /** Khóa định danh thiết bị USB dạng "vendorId:productId:deviceId" */
  deviceKey: string
  /** Thời điểm bắt tay dò thành công lần đầu (Timestamp MS) */
  resolvedAt: number
  /** Thời điểm xác minh thành công gần nhất (Timestamp MS) */
  lastVerifiedAt: number
}

/** Instance lưu trữ MMKV riêng cho phần cứng */
const storage = createMMKV({ id: 'hardware-bindings' })
/** Key lưu trữ trong MMKV */
const BINDINGS_KEY = 'usb_device_bindings_v1'

export class BindingStore {
  /**
   * Đọc tất cả các liên kết vai trò thiết bị đã lưu từ MMKV.
   *
   * @return Promise<DeviceBinding[]> Mảng các binding đã lưu.
   */
  async getAll(): Promise<DeviceBinding[]> {
    try {
      const raw = storage.getString(BINDINGS_KEY)
      if (!raw) return []
      return JSON.parse(raw) as DeviceBinding[]
    } catch {
      return []
    }
  }

  /**
   * Ghi đè danh sách các liên kết vai trò mới nhất vào MMKV.
   *
   * @param bindings Mảng danh sách binding mới.
   */
  async saveAll(bindings: DeviceBinding[]): Promise<void> {
    try {
      storage.set(BINDINGS_KEY, JSON.stringify(bindings))
    } catch {
      // Bỏ qua lỗi ghi storage nếu có
    }
  }

  /**
   * Xóa toàn bộ liên kết đã lưu (Dùng khi người dùng bấm Rescan ở màn Admin).
   */
  async clear(): Promise<void> {
    try {
      storage.remove(BINDINGS_KEY)
    } catch {
      // Bỏ qua lỗi xóa storage
    }
  }
}

/** Export singleton instance của BindingStore */
export const bindingStore = new BindingStore()
