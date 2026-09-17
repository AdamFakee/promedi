/**
 * Chuẩn hóa 3 Nhóm Phân Loại Trạng Thái Kiểm Kê Tại Vị Trí (UC06)
 */
export const InventoryAuditCategory = {
  /** 🟢 ĐÃ QUÉT: Tài sản thuộc vị trí này và đã quét thấy */
  SCANNED: 'SCANNED',
  /** 🔴 CHƯA QUÉT: Tài sản thuộc vị trí này nhưng chưa quét thấy */
  UNSCANNED: 'UNSCANNED',
  /** 🟡 SAI VỊ TRÍ: Tài sản thuộc vị trí khác nhưng quét thấy ở đây */
  MISPLACED: 'MISPLACED',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type InventoryAuditCategory =
  (typeof InventoryAuditCategory)[keyof typeof InventoryAuditCategory]

/**
 * Chế độ Quét Phần Cứng trên Đầu Đọc Chainway C5
 */
export const HardwareScanMode = {
  /** 📡 Quét RFID UHF hàng loạt quét diện rộng */
  RFID: 'RFID',
  /** 📷 Quét Barcode 1D / 2D QR Code bằng tia Laser */
  BARCODE: 'BARCODE',
  /** 🔄 Quét Hỗn Hợp (Kích hoạt cả RFID và Barcode) */
  HYBRID: 'HYBRID',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type HardwareScanMode = (typeof HardwareScanMode)[keyof typeof HardwareScanMode]

/** Model Chi tiết Tài sản / Vật tư trong Phiên Kiểm Kê */
export interface InventoryAuditItem {
  id: string
  code: string
  name: string
  unit: string
  trackingType: 'SERIALIZED' | 'BATCH_LOT'
  identificationType: 'RFID' | 'BARCODE' | 'LINECODE'
  rfidEpc?: string
  barcodeData?: string
  locationId: string // Vị trí đăng ký gốc trên hệ thống
  locationName: string // Tên vị trí đăng ký gốc
  category: InventoryAuditCategory // Phân loại: SCANNED | UNSCANNED | MISPLACED
  bookQuantity: number // Số lượng tồn sổ sách
  actualQuantity: number // Số lượng kiểm kê thực tế
  scannedAt?: string
}

/** Thống kê Số lượng Phiên Kiểm Kê */
export interface InventoryAuditSummary {
  totalExpected: number
  scannedCount: number // 🟢 Đã quét
  unscannedCount: number // 🔴 Chưa quét
  misplacedCount: number // 🟡 Sai vị trí
  matchedRate: number // Tỷ lệ hoàn thành (%)
}
