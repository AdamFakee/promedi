/**
 * Hằng số định nghĩa cấu trúc gói tin Hex/ASCII cho giao thức InBody 260S Open Protocol.
 * @module src/core/hardware/inbody/protocol/constants.ts
 */

/** Byte Start of Frame */
export const STX = 0x02
/** Byte End of Frame */
export const ETX = 0x03
/** Byte Vách phân cách trường dữ liệu (String Separator / ESC) */
export const ESC = 0x1b

/** Mã Hex của các Lệnh Điều Khiển (COMMANDS) */
export const COMMANDS = {
  /** Lệnh hỏi trạng thái thiết bị */
  STATUS: 0x63, // 'c'
  /** Lệnh truyền thông tin khách hàng */
  INFO: 0x75, // 'u'
  /** Lệnh rút dữ liệu kết quả đo BIA */
  RESULT: 0x64, // 'd'
  /** Lệnh khóa / mở khóa thiết bị */
  LOCK: 0x6c, // 'l'
  /** Lệnh bỏ qua trang thông báo lỗi */
  SKIP: 0x73, // 's'
  /** Lệnh gửi ID khách hàng */
  SEND_ID: 0x69, // 'i'
  /** Lệnh hỏi trạng thái và số liệu cân nặng */
  WEIGHT: 0x6b, // 'k'
  /** Lệnh yêu cầu mã ID từ thiết bị */
  REQUEST_ID: 0x77, // 'w'
  /** Lệnh đồng bộ thời gian hệ thống */
  SET_TIME: 0x74, // 't'
} as const

/** Mã trạng thái hoạt động (STATUS Code) trả về từ InBody */
export const STATUS_CODE = {
  /** '0': Máy rảnh, sẵn sàng đo */
  READY: '0',
  /** '1': Đã cân xong, chờ nạp thông tin khách hàng */
  WEIGHT_DONE_INPUT_INFO: '1',
  /** '2': Đang quét dòng điện sinh học BIA */
  MEASURING: '2',
  /** '3': Đã phân tích xong toàn bộ chỉ số */
  MEASURE_COMPLETED: '3',
  /** '4': Máy đang ở trạng thái Khóa (AutoLock) */
  LOCKED: '4',
  /** '5': Máy phát sinh lỗi dữ liệu đầu vào */
  ERROR: '5',
} as const

/** Mã lỗi chi tiết đi kèm khi STATUS trả về '5' */
export const ERROR_CODE = {
  /** '1': Lỗi Giới tính không hợp lệ */
  GENDER: '1',
  /** '2': Lỗi Chiều cao ngoài dải 50.0 - 250.0 cm */
  HEIGHT: '2',
  /** '3': Lỗi Tuổi ngoài dải 3 - 99 tuổi */
  AGE: '3',
} as const

/** Cờ chế độ Khóa / Mở khóa (LOCK Flags) */
export const LOCK_FLAG = {
  /** '0': Mở khóa tạm thời 1 lần */
  UNLOCK_ONCE: '0',
  /** '1': Khóa cố định màn hình & phím bấm */
  LOCK: '1',
  /** '2': Mở khóa hoàn toàn */
  UNLOCK: '2',
} as const
