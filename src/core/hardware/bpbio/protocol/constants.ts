/**
 * Định nghĩa các hằng số byte giao thức cho máy đo huyết áp BPBIO320/750.
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
/** Độ dài khung broadcast sự kiện cố định (64 Byte) theo Protocol Spec V4.0 */
export const EVENT_FRAME_LEN = 64

/** Các hằng số vị trí Index (Offset) byte trong gói broadcast 64 Byte */
export const FRAME_64_OFFSETS = {
  STX: 5,
  S_IDENTIFIER: 33,
  S_PAYLOAD_START: 34,
  D_IDENTIFIER: 43,
  D_PAYLOAD_START: 44,
  P_IDENTIFIER: 48,
  P_PAYLOAD_START: 49,
  ETX: 62,
  BCC: 63,
} as const

/** Chuỗi payload sự kiện tiêu chuẩn trích xuất tại 3 trường S, D, P */
export const EVENT_PAYLOADS = {
  START: 'STA',
  STOP: 'STP',
  ERROR_HEADER: 'Err',
  ERROR_FOOTER: 'rrr',
  AWAKE: 'AWK',
  ELBOW_IN: 'ELB',
  ELBOW_OUT: 'elb',
  CONFIRM: 'CON',
  LOCK: 'LCK',
  RELEASE: 'RLS',
} as const

/** Ký tự định danh loại gói dữ liệu kết quả */
export const IDENTIFIER = {
  /** Huyết áp tâm thu (Systolic) */
  SYSTOLIC: 'S',
  /** Huyết áp tâm trương (Diastolic) */
  DIASTOLIC: 'D',
  /** Nhịp tim (Pulse) */
  PULSE: 'P',
} as const

/** Mã lệnh gửi xuống máy đo BPBIO750 / Huyết áp */
export const COMMANDS = {
  /** Yêu cầu rút kết quả đo (Lệnh 0x43) */
  REQUEST_RESULT: 0x43,
  /** Dừng đo khẩn cấp (Lệnh 0x46) */
  STOP: 0x46,
  /** Khóa máy đo (Lệnh 0x4C) */
  LOCK: 0x4c,
  /** Mở khóa máy đo (Lệnh 0x72) */
  UNLOCK: 0x72,
  /** Yêu cầu rút kết quả đo gần nhất (Khung 10 byte: 0x52 0x42 "RB") */
  REQUEST_RECENT_RESULT_FRAME: [0x52, 0x42],
  /** Bắt đầu bơm hơi đo lường (Khung 10 byte: 0x52 0x43 "RC") */
  START_MEASURE_FRAME: [0x52, 0x43],
  /** Dừng đo lường khẩn cấp (Khung 10 byte: 0x52 0x46 "RF") */
  STOP_MEASURE_FRAME: [0x52, 0x46],
  /** Xác nhận kết nối (Khung 10 byte: 0x52 0x45 "RE") -> Phản hồi "CON" */
  CONFIRM_CONNECT_FRAME: [0x52, 0x45],
  /** Khóa nút bấm vật lý Start/Stop (Khung 10 byte: 0x52 0x4C "RL") -> Phản hồi "LCK" */
  LOCK_BUTTON_FRAME: [0x52, 0x4c],
  /** Mở khóa nút bấm vật lý Start/Stop (Khung 10 byte: 0x52 0x72 "Rr") -> Phản hồi "RLS" */
  UNLOCK_BUTTON_FRAME: [0x52, 0x72],
} as const
