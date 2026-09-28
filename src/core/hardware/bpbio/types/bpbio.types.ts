/**
 * Định nghĩa cấu trúc dữ liệu, mã lỗi và sự kiện cho máy đo huyết áp BPBIO320/750.
 *
 * @module src/core/hardware/bpbio/types/bpbio.types.ts
 */

/** Kết quả đo huyết áp đã hoàn thành ghép đủ 3 gói S/D/P */
export interface BloodPressureResult {
  /** Huyết áp tâm thu (Systolic mmHg) */
  systolic: number | null
  /** Huyết áp tâm trương (Diastolic mmHg) */
  diastolic: number | null
  /** Nhịp tim (Pulse bpm) */
  pulse: number | null
}

/** Các mã lỗi có thể phát sinh trong quá trình đo huyết áp */
export type BpbioErrorCode =
  | 'INCOMPLETE_DATA' // Thiếu gói dữ liệu (Do di chuyển tay/sai tư thế)
  | 'TRANSPORT_ERROR' // Lỗi truyền nhận Serial
  | 'DEVICE_BUSY' // Máy đang bận xử lý

/** Danh mục 7 sự kiện broadcast & phản hồi trạng thái từ BPBIO320/750 (Protocol Spec V4.0) */
export type BpbioEventType =
  | 'MEASUREMENT_COMPLETED' // ID 1: Đo hoàn tất (S, D, P dạng số)
  | 'START_MEASUREMENT' // ID 2: Bắt đầu đo (S, D, P = "STA")
  | 'MANUAL_CANCEL' // ID 3: Hủy đo thủ công (S, D, P = "STP")
  | 'DEVICE_ERROR' // ID 4: Lỗi thiết bị (S="Err", D=Mã lỗi, P="rrr")
  | 'PRESENCE_DETECTED' // ID 5: Phát hiện người (S, D, P = "AWK")
  | 'ELBOW_INSERTED' // ID 6: Cùi chỏ đặt vào (S, D, P = "ELB")
  | 'ELBOW_REMOVED' // ID 7: Cùi chỏ nhấc ra (S, D, P = "elb")
  | 'CONFIRM_CONNECT' // Lệnh ACK: Xác nhận kết nối (S, D, P = "CON")
  | 'BUTTON_LOCKED' // Lệnh ACK: Khóa nút vật lý (S, D, P = "LCK")
  | 'BUTTON_RELEASED' // Lệnh ACK: Mở khóa nút vật lý (S, D, P = "RLS")
  | 'UNKNOWN' // Sự kiện không xác định

/** Payload dữ liệu 3 trường S, D, P của gói broadcast 64-byte */
export interface BpbioEventPayload {
  /** Chuỗi 3 ký tự tại trường S [Index 34..36] */
  rawS: string
  /** Chuỗi 3 ký tự tại trường D [Index 44..46] */
  rawD: string
  /** Chuỗi 3 ký tự tại trường P [Index 49..51] */
  rawP: string
  /** Huyết áp tâm thu (nếu có) */
  systolic?: number
  /** Huyết áp tâm trương (nếu có) */
  diastolic?: number
  /** Nhịp tim (nếu có) */
  pulse?: number
  /** Mã lỗi hệ thống 3 chữ số (nếu có, VD: "001") */
  errorCode?: string
}

/** Đối tượng sự kiện hoàn chỉnh trích xuất từ luồng broadcast 64-byte BPBIO */
export interface BpbioEvent {
  /** Mã số sự kiện (1-7 theo tài liệu đặc tả, undefined đối với lệnh ACK) */
  id?: number
  /** Loại sự kiện phân loại theo BpbioEventType */
  type: BpbioEventType
  /** Tên hiển thị sự kiện tiếng Việt */
  name: string
  /** Chi tiết dữ liệu trường S, D, P */
  payload: BpbioEventPayload
  /** Mô tả chi tiết ý nghĩa và hành động hệ thống */
  description: string
  /** Thông điệp hướng dẫn giọng nói / Voice Cue & UI prompt dành cho người dùng */
  userMessage?: string
  /** Thời điểm nhận sự kiện (Timestamp ms) */
  timestamp: number
}
