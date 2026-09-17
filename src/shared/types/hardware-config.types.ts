/**
 * Cấu trúc dữ liệu cấu hình phần cứng độc lập theo từng phân hệ nghiệp vụ (Chainway C5 / C72).
 */

export const ModuleKey = {
  STOCK_IN: 'STOCK_IN', // UC03: Nhập kho
  STOCK_OUT: 'STOCK_OUT', // UC04: Xuất kho
  INVENTORY: 'INVENTORY', // UC06: Kiểm kê diện rộng
  LOCATE: 'LOCATE', // UC05: Định vị Geiger
  RFID_WRITE: 'RFID_WRITE', // UC11: Gán tag chip mới
  DISPATCH: 'DISPATCH', // UC07: Cấp phát / Thu hồi
  DISPOSAL: 'DISPOSAL', // UC08: Thanh lý / Báo mất
  REPORT_BROKEN: 'REPORT_BROKEN', // UC02/12: Báo hỏng / Sửa chữa
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ModuleKey = (typeof ModuleKey)[keyof typeof ModuleKey]

export interface ModuleHardwareConfig {
  // ── 1. Sóng RFID UHF ──
  /** Công suất phát sóng RF (5 – 30 dBm) */
  rfidPower: number
  /** Gen2 Session: S0 (bắn liên tục) | S1 (lật cờ kiểm kê) | S2 | S3 */
  rfidSession: 0 | 1 | 2 | 3
  /** Gen2 Q-Value (0 – 15, số lượng khe slot 2^Q) */
  rfidQValue: number
  /** Chế độ đọc: EPC (nhanh) | EPC_TID (chống giả mạo) */
  rfidInvMode: 'EPC' | 'EPC_TID'

  // ── 2. Barcode 2D & Đèn ──
  /** Bật/tắt tia Laser định vị tâm mã vạch (Aimer) */
  barcodeAimer: boolean
  /** Bật/tắt đèn Flash trợ sáng góc tối / gầm máy */
  barcodeLight: boolean
  /** Thời gian giữ tia quét trước khi tự ngắt (ms) */
  barcodeTimeoutMs: number

  // ── 3. Phản hồi Âm thanh & Rung & LED ──
  /** Âm thanh bíp khi quét dính thẻ RFID */
  rfidBeep: boolean
  /** Âm thanh bíp khi quét trúng mã Barcode/QR */
  barcodeBeep: boolean
  /** Rung haptic khi đọc thành công */
  vibrationOnSuccess: boolean
  /** Nháy đèn LED đỉnh thân máy C5 (Xanh: khớp, Vàng: mã lạ) */
  handLedIndicator: boolean

  // ── 4. Cơ chế vận hành ──
  /** Chế độ quét mặc định khi bóp cò */
  defaultScanMode: 'HYBRID' | 'RFID' | 'BARCODE'
  /** Cửa sổ gom mảng thẻ để UI giữ 60 FPS mượt mà (50 – 300 ms) */
  batchWindowMs: number
}
