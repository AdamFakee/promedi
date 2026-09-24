/**
 * Định nghĩa các hằng số byte giao thức cho máy đo huyết áp BPBIO750.
 *
 * @module src/core/hardware/bpbio/protocol/constants.ts
 */

/** Byte bắt đầu đồng bộ (SYN Synchronous Idle: 0x16) */
export const SYN = 0x16
/** Byte bắt đầu tiêu đề (SOH Start of Header: 0x01) */
export const SOH = 0x01
/** Byte bắt đầu văn bản dữ liệu (STX Start of Text: 0x02) */
export const STX = 0x02
/** Byte kết thúc văn bản dữ liệu (ETX End of Text: 0x03) */
export const ETX = 0x03

/** Độ dài khung dữ liệu kết quả cố định (16 Byte) */
export const DATA_FRAME_LEN = 16
/** Độ dài khung lệnh gửi xuống cố định (9 Byte) */
export const CMD_FRAME_LEN = 9
/** Cửa sổ quét ETX tối đa (16 Byte) */
export const MAX_FRAME_LEN = 16

/** Ký tự định danh loại gói dữ liệu kết quả */
export const IDENTIFIER = {
  /** Huyết áp tâm thu (Systolic) */
  SYSTOLIC: 'S',
  /** Huyết áp tâm trương (Diastolic) */
  DIASTOLIC: 'D',
  /** Nhịp tim (Pulse) */
  PULSE: 'P',
} as const

/** Mã lệnh gửi xuống máy đo BPBIO750 */
export const COMMANDS = {
  /** Yêu cầu rút kết quả đo (Lệnh 0x43) */
  REQUEST_RESULT: 0x43,
  /** Dừng đo khẩn cấp (Lệnh 0x46) */
  STOP: 0x46,
  /** Khóa máy đo (Lệnh 0x4C) */
  LOCK: 0x4c,
  /** Mở khóa máy đo (Lệnh 0x72) */
  UNLOCK: 0x72,
} as const
