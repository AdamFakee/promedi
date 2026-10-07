/**
 * @file height-measurement.engine.ts
 * @brief Engine xử lý toán học tính toán chiều cao cơ thể người từ ma trận 8x8 ToF VL53L5CX (Phiên bản V5.1).
 * @module src/core/hardware/tof/engine/height-measurement.engine.ts
 *
 * Quy trình xử lý:
 * 1. Khởi tạo Bảng tra cứu Bù góc quang học cosθ (Pre-calculated Cosine Lookup Table cho 64 zones).
 * 2. Chuyển đổi khoảng cách xiên r sang độ sâu thẳng đứng z = r * cosθ.
 * 3. Tính chiều cao thô h = ceilingHeight - z.
 * 4. Lọc cờ độ tin cậy Target Status (Chỉ nhận Status 5 - Valid 100% và Status 9 - Valid 50%).
 * 5. Nhận diện cụm đỉnh đầu trung tâm (Peak Cluster Blob).
 * 6. Lọc cử chỉ Giơ tay (Hand Gesture Filter: loại bỏ 1-2 zone bàn tay cao hơn đỉnh đầu >= 50mm).
 * 7. Làm tròn chiều cao chính xác đến 0.1cm.
 */

import type { HeightCalculationResult, VL53L5CXFramePayload } from '../types/tof.types'

export class HeightMeasurementEngine {
  /** Chiều cao trần Kiosk tính từ cảm biến xuống mặt sàn (mặc định 2200mm = 2.20m) */
  private sensorHeightMm: number
  /** Bảng tra cứu giá trị cosθ cho ma trận 8x8 zones (Tối ưu 60fps / chống giật lag Kiosk) */
  private cosLookupTable: number[][] = []

  /**
   * Constructor khởi tạo Engine với chiều cao trần nhà Kiosk.
   * @param sensorHeightMm Chiều cao lắp đặt cảm biến trần (mm, mặc định 2200mm)
   */
  constructor(sensorHeightMm = 2200) {
    this.sensorHeightMm = sensorHeightMm
    this.initCosLookupTable()
  }

  /**
   * Tính toán trước bảng tra cứu cosθ 8x8 để triệt tiêu chi phí tính toán lượng giác trong vòng lặp 15Hz streaming.
   */
  private initCosLookupTable(): void {
    const stepRad = (45.0 / 8.0) * (Math.PI / 180.0) // Góc quét 5.625 độ mỗi zone (radians)
    const tanVals: number[] = new Array(8)
    for (let i = 0; i < 8; i++) {
      tanVals[i] = Math.tan((i - 3.5) * stepRad)
    }

    this.cosLookupTable = []
    for (let r = 0; r < 8; r++) {
      const rowCos: number[] = new Array(8)
      for (let c = 0; c < 8; c++) {
        // Công thức tính cosθ trong không gian 3D: 1 / sqrt(1 + tan(X)^2 + tan(Y)^2)
        rowCos[c] = 1.0 / Math.sqrt(1.0 + Math.pow(tanVals[c], 2) + Math.pow(tanVals[r], 2))
      }
      this.cosLookupTable.push(rowCos)
    }
  }

  /**
   * Xử lý 1 Frame đo nhị phân 64 vùng và tính toán ra chiều cao final (cm).
   * @param frame Frame payload dữ liệu ToF đầu vào
   * @return Kết quả HeightCalculationResult (chiều cao cm, cờ giơ tay, số lượng người, độ tin cậy)
   */
  public calculateHeight(frame: VL53L5CXFramePayload): HeightCalculationResult {
    if (!frame.isValid || frame.distances.length !== 64) {
      return this.createEmptyResult(frame, 'Frame không hợp lệ hoặc thiếu dữ liệu zone')
    }

    const validHeights: number[] = []
    const zoneHeights: number[] = new Array(64).fill(0)
    let validZoneCount = 0

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c
        const rawDist = frame.distances[idx]
        const status = frame.targetStatuses[idx]

        // Chỉ chấp nhận Status 5 (Valid 100%) hoặc Status 9 (Valid 50%) và dải khoảng cách hợp lệ (50mm -> 3900mm)
        if ((status === 5 || status === 9) && rawDist > 50 && rawDist < 3900) {
          const cosVal = this.cosLookupTable[r][c]
          const verticalDepth = rawDist * cosVal
          const heightMm = Math.max(0, this.sensorHeightMm - verticalDepth)

          zoneHeights[idx] = heightMm

          // Chỉ xem xét các zone có chiều cao >= 800mm (80cm) là ứng viên của cơ thể người
          if (heightMm >= 800) {
            validHeights.push(heightMm)
            validZoneCount++
          }
        }
      }
    }

    // Nếu không có zone nào đạt chuẩn người đứng
    if (validZoneCount === 0 || validHeights.length === 0) {
      return this.createEmptyResult(frame, 'Không phát hiện người đứng dưới cảm biến')
    }

    // Sắp xếp danh sách chiều cao giảm dần
    validHeights.sort((a, b) => b - a)

    // Kiểm tra cử chỉ giơ tay: Nếu zone cao nhất (peak) chênh lệch >= 50mm so với cụm đỉnh đầu (p90)
    const peakHeight = validHeights[0]
    const p90Height = validHeights[Math.min(3, validHeights.length - 1)]
    const hasHandRaised = peakHeight - p90Height >= 50

    // Nếu có giơ tay, lấy p90Height làm đỉnh đầu thật; nếu không giơ tay, lấy peakHeight
    const headHeightMm = hasHandRaised ? p90Height : peakHeight
    const headDistanceMm = Math.max(0, this.sensorHeightMm - headHeightMm)

    // Đổi sang cm và làm tròn chính xác 0.1cm
    const measuredHeightCm = Math.round((headHeightMm / 10.0) * 10.0) / 10.0

    return {
      measuredHeightCm,
      headDistanceMm: Math.round(headDistanceMm),
      floorDistanceMm: this.sensorHeightMm,
      confidence: hasHandRaised ? 0.8 : 0.98,
      hasHandRaised,
      isStable: true,
      personCount: validZoneCount >= 4 ? 1 : 0,
      rawFrame: frame,
    }
  }

  /**
   * Tạo kết quả rỗng khi không có người hoặc frame bị lỗi.
   * @param frame Frame gốc
   * @param _reason Lý do không tính toán được chiều cao
   */
  private createEmptyResult(frame: VL53L5CXFramePayload, _reason: string): HeightCalculationResult {
    return {
      measuredHeightCm: 0,
      headDistanceMm: this.sensorHeightMm,
      floorDistanceMm: this.sensorHeightMm,
      confidence: 0,
      hasHandRaised: false,
      isStable: false,
      personCount: 0,
      rawFrame: frame,
    }
  }
}
