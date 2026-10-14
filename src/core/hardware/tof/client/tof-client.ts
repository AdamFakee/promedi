/**
 * @file tof-client.ts
 * @brief High-level Client API quản lý luồng Stream cảm biến ToF VL53L5CX, xử lý phân mảnh và phát sự kiện cho UI.
 * @module src/core/hardware/tof/client/tof-client.ts
 */

import { HeightMeasurementEngine } from '../engine/height-measurement.engine'
import { formatToFFrame, ToFStreamFramer } from '../protocol/tof-frame-codec'
import type {
  HeightCalculationResult,
  HeightEngineConfig,
  ToFTargetStatus,
  VL53L5CXFramePayload,
} from '../types/tof.types'

export class ToFClient {
  /** Bộ cắt khung gói tin nhị phân 204 Bytes */
  private framer: ToFStreamFramer
  /** Engine tính toán chiều cao toán học */
  private engine: HeightMeasurementEngine
  /** Tập hợp subscriber đăng ký nhận raw frame 8x8 */
  private frameListeners: Set<(frame: VL53L5CXFramePayload) => void> = new Set()
  /** Tập hợp subscriber đăng ký nhận kết quả chiều cao cm */
  private resultListeners: Set<(result: HeightCalculationResult) => void> = new Set()
  /** Cờ theo dõi trạng thái đang phát mock stream hay không */
  private isMocking = false
  /** Timer định thời phát mock stream ở tần số 15Hz (66ms) */
  private mockTimer: ReturnType<typeof setInterval> | null = null
  /** Bộ đếm frame giả lập */
  private mockFrameCounter = 0

  constructor(config?: Partial<HeightEngineConfig>) {
    this.framer = new ToFStreamFramer()
    this.engine = new HeightMeasurementEngine(config)
  }

  /**
   * Cập nhật động tham số cấu hình cho Engine đo chiều cao (chiều cao trần, gain, offset, calibration).
   * @param config Cấu hình cập nhật
   */
  public updateEngineConfig(config: Partial<HeightEngineConfig>): void {
    this.engine.updateConfig(config)
  }

  /** Lấy cấu hình hiện tại của Engine */
  public getEngineConfig() {
    return this.engine.getConfig()
  }

  /**
   * Cân chuẩn mặt sàn (Tare). Cần truyền vào một loạt frame không có người đứng.
   * @param frames Mảng các raw frame để cân sàn
   */
  public calibrateFloor(frames: VL53L5CXFramePayload[]) {
    return this.engine.calibrateFloor(frames)
  }

  /** Xóa dữ liệu cân sàn */
  public clearCalibration(): void {
    this.engine.clearCalibration()
  }

  /**
   * Xử lý chunk mảng byte nhị phân thô nhận được từ luồng USB Serial Emitter.
   * @param chunk Mảng Uint8Array
   */
  public processChunk(chunk: Uint8Array): void {
    const frames = this.framer.pushData(chunk)
    for (const frame of frames) {
      this.notifyFrame(frame)
    }
  }

  /**
   * Bơm trực tiếp một VL53L5CXFramePayload đã giải mã tới tất cả subscriber và chạy engine tính chiều cao.
   * @param frame Frame payload dữ liệu 8x8
   */
  public notifyFrame(frame: VL53L5CXFramePayload): void {
    this.frameListeners.forEach((listener) => listener(frame))

    const result = this.engine.calculateHeight(frame)

    if (process.env.NODE_ENV !== 'test') {
      const frameTable = formatToFFrame(frame)
      const heightStr =
        result.measuredHeightCm > 0 ? `${result.measuredHeightCm.toFixed(1)}cm` : '---'
      const lockedStr = result.result ? ` [LOCKED: ${result.result.heightCm.toFixed(1)}cm]` : ''
      const summary = `[ENGINE RESULT] State: ${result.state} | Guidance: ${result.guidance} | Progress: ${result.progress}% | Height: ${heightStr}${lockedStr}`
      console.log(`\n${frameTable}\n${summary}\n`)
    }

    this.resultListeners.forEach((listener) => listener(result))
  }

  /**
   * Đăng ký lắng nghe sự kiện raw 8x8 frame.
   * @param callback Callback nhận VL53L5CXFramePayload
   * @return Hàm unsubscribe hủy đăng ký
   */
  public onFrame(callback: (frame: VL53L5CXFramePayload) => void): () => void {
    this.frameListeners.add(callback)
    return () => {
      this.frameListeners.delete(callback)
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện kết quả chiều cao tính toán final (cm).
   * @param callback Callback nhận HeightCalculationResult
   * @return Hàm unsubscribe hủy đăng ký
   */
  public onHeightResult(callback: (result: HeightCalculationResult) => void): () => void {
    this.resultListeners.add(callback)
    return () => {
      this.resultListeners.delete(callback)
    }
  }

  /**
   * Bắt đầu phát luồng dữ liệu giả lập (Mock Stream) ở tần số 15Hz (66ms) mô phỏng người đứng chiều cao simulatedHeightCm.
   * @param simulatedHeightCm Chiều cao người đứng mô phỏng (cm, mặc định 170.0cm)
   */
  public startMockStream(simulatedHeightCm = 170.0): void {
    this.stopMockStream()
    this.isMocking = true

    this.mockTimer = setInterval(() => {
      this.mockFrameCounter++
      const simulatedFrame = this.generateSyntheticFrame(this.mockFrameCounter, simulatedHeightCm)
      this.notifyFrame(simulatedFrame)
    }, 66)
  }

  /** Dừng phát luồng dữ liệu giả lập */
  public stopMockStream(): void {
    this.isMocking = false
    if (this.mockTimer) {
      clearInterval(this.mockTimer)
      this.mockTimer = null
    }
  }

  /** Kiểm tra xem mock stream có đang hoạt động hay không */
  public isMockingActive(): boolean {
    return this.isMocking
  }

  /** Sinh frame giả lập ma trận 8x8 với chiều cao người đứng chỉ định */
  private generateSyntheticFrame(frameId: number, personHeightCm: number): VL53L5CXFramePayload {
    const config = this.engine.getConfig()
    const expectedFloorMm = config.expectedFloorMm
    const platformHeightMm = config.platformHeightMm ?? 0
    const targetHeadHeightMm = personHeightCm * 10
    const verticalHeadDepthMm = expectedFloorMm - platformHeightMm - targetHeadHeightMm

    const distances: number[] = new Array(64)
    const targetStatuses: ToFTargetStatus[] = new Array(64)

    const centerCos = 0.995
    const rawHeadDist = Math.round(verticalHeadDepthMm / centerCos)

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c
        const distFromCenter = Math.sqrt(Math.pow(r - 3.5, 2) + Math.pow(c - 3.5, 2))

        if (distFromCenter <= 1.8) {
          distances[idx] = rawHeadDist
          targetStatuses[idx] = 5
        } else if (distFromCenter <= 2.8) {
          distances[idx] = Math.round(rawHeadDist + 300)
          targetStatuses[idx] = 5
        } else {
          distances[idx] = Math.round(expectedFloorMm / 0.995)
          targetStatuses[idx] = 5
        }
      }
    }

    return {
      frameId,
      timestampMs: frameId * 66,
      distances,
      targetStatuses,
      zoneCount: 64,
      isValid: true,
    }
  }

  /** Reset giải phóng bộ đệm và dừng mock stream */
  public reset(): void {
    this.framer.reset()
    this.engine.reset()
    this.stopMockStream()
    this.mockFrameCounter = 0
  }
}
