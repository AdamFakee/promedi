/**
 * Định nghĩa cấu trúc dữ liệu và mã lỗi cho máy đo huyết áp BPBIO750.
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
