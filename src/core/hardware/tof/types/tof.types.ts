/**
 * @file tof.types.ts
 * @brief Định nghĩa các Kiểu dữ liệu và Interface cho Phân lớp Hardware Cảm biến Khoảng cách ToF VL53L5CX.
 * @module src/core/hardware/tof/types/tof.types.ts
 *
 * Tài liệu tham chiếu:
 * - Special Specs v4.0 (Đo chiều cao không tiếp xúc ToF 8x8)
 * - STMicroelectronics VL53L5CX Datasheet DS13754
 */

import type { IMeasurementDevice } from '../../types/measurement-device.interface'

/**
 * Mã trạng thái cờ độ tin cậy tín hiệu photon phản xạ (Target Status) từ cảm biến VL53L5CX:
 * - `5`: Tín hiệu cực tốt, độ tin cậy 100% (Phản xạ bề mặt phẳng, da người, trần nhà).
 * - `9`: Tín hiệu phản xạ trung bình (Tóc đen sẫm hấp thụ ánh sáng / đường mép vai), độ tin cậy 50%.
 * - `0` / `255`: Tín hiệu nhiễu / Che khuất / Không tìm thấy mục tiêu.
 */
export type ToFTargetStatus = 0 | 5 | 9 | 255 | number

/**
 * Cấu trúc Payload của 1 Frame đo 64 vùng từ cảm biến ToF VL53L5CX (Đã giải mã từ gói nhị phân 204 Bytes).
 */
export interface VL53L5CXFramePayload {
  /** Số thứ tự frame tăng dần (1, 2, 3...) */
  frameId: number
  /** Thời gian đo tính từ lúc khởi động cảm biến (milliseconds) */
  timestampMs: number
  /** Mảng đúng 64 phần tử khoảng cách thô r từ thấu kính tới bề mặt mục tiêu (đơn vị: mm) */
  distances: number[]
  /** Mảng đúng 64 phần tử mã cờ trạng thái Target Status (5, 9, 0...) */
  targetStatuses: ToFTargetStatus[]
  /** Số vùng đo trong ma trận 8x8 (Cố định = 64) */
  zoneCount: number
  /** Cờ xác nhận gói tin hợp lệ, đúng 204 bytes và khớp mã kiểm tra lỗi CRC16 Modbus */
  isValid: boolean
}

/**
 * Kết quả tính toán đo chiều cao từ Engine xử lý toán học (HeightMeasurementEngine).
 */
export interface HeightCalculationResult {
  /** Chiều cao cơ thể tính toán được (đơn vị: cm, độ chính xác 0.1cm) */
  measuredHeightCm: number
  /** Khoảng cách từ cảm biến trần tới đỉnh đầu người (đơn vị: mm) */
  headDistanceMm: number
  /** Khoảng cách chuẩn tới mặt sàn / nền nhà (đơn vị: mm, mặc định 2200mm) */
  floorDistanceMm: number
  /** Độ tin cậy tính toán (từ 0.0 đến 1.0) */
  confidence: number
  /** Cờ phát hiện cử chỉ giơ tay cao hơn đầu (bàn tay > 50mm so với đỉnh đầu) */
  hasHandRaised: boolean
  /** Cờ kiểm tra tính ổn định không đung đũa của người đứng (Độ lệch <= 15mm) */
  isStable: boolean
  /** Số lượng mục tiêu / người phát hiện bên dưới cảm biến trần */
  personCount: number
  /** Frame thấu kính raw gốc được xử lý */
  rawFrame: VL53L5CXFramePayload
}

/**
 * Interface mở rộng cho Thiết bị Cảm biến Khoảng cách ToF VL53L5CX (Tuân thủ Kiến trúc 4 Lớp Hardware HAL).
 */
export interface IToFDistanceDevice extends IMeasurementDevice<HeightCalculationResult, void> {
  /**
   * Đăng ký sự kiện lắng nghe stream các frame 8x8 raw liên tục ở tần số 15Hz.
   * @param callback Hàm callback nhận payload VL53L5CXFramePayload
   * @return Hàm hủy đăng ký lắng nghe (Unsubscribe)
   */
  onFrame(callback: (frame: VL53L5CXFramePayload) => void): () => void

  /**
   * Bật/Tắt chế độ Giả lập (Mock Stream Mode) cho mục đích Dev Simulator / Web Demo.
   * @param enable True để bật luồng dữ liệu giả lập 15Hz
   */
  setMockMode(enable: boolean): void
}
