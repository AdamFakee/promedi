/**
 * @file tof-client.ts
 * @brief High-level Client API quản lý Module Đo Chiều Cao ToF VL53L5CX (Height Measurement Module).
 * @module src/core/hardware/tof/client/tof-client.ts
 *
 * Nhận luồng nhị phân siêu gọn 16 Bytes từ firmware ESP32, giải mã và phát sự kiện cho UI & InBody Machine.
 * Hỗ trợ chế độ Mock Stream 15Hz độc lập khi dev không có phần cứng thật.
 */

import { GUIDANCE_MESSAGES, HeightMeasurementEngine } from '../engine/height-measurement.engine'
import {
  encodeConfigCommand,
  encodePingCommand,
  encodeResetCommand,
  HeightStreamFramer,
} from '../protocol/tof-height-codec'
import type {
  HeightCalculationResult,
  HeightEngineConfig,
  HeightPacketPayload,
  ToFTargetStatus,
  VL53L5CXFramePayload,
} from '../types/tof.types'

export class ToFClient {
  /** Bộ phân khung & giải mã luồng nhị phân 16 Bytes */
  private framer: HeightStreamFramer

  /** Tập hợp subscriber nhận kết quả chiều cao chi tiết */
  private resultListeners: Set<(result: HeightCalculationResult) => void> = new Set()

  /** Tập hợp subscriber nhận raw frame 8x8 (cho debug heatmap) */
  private frameListeners: Set<(frame: VL53L5CXFramePayload) => void> = new Set()

  /** Cấu hình hiện tại */
  private config: Required<HeightEngineConfig>

  /** Frame thô mới nhất nhận được (hoặc frame giả lập) */
  private lastRawFrame: VL53L5CXFramePayload | null = null

  /** Cờ theo dõi Mock Stream */
  private isMocking = false
  private mockTimer: ReturnType<typeof setInterval> | null = null
  private mockFrameCounter = 0

  /** Callback gửi lệnh byte xuống cổng Serial */
  private sendBytesCallback?: (bytes: Uint8Array) => Promise<void>

  constructor(config?: Partial<HeightEngineConfig>) {
    this.config = {
      expectedFloorMm: 2220,
      platformHeightMm: 96,
      gainScale: 1.0,
      offsetMm: 0.0,
      minPersonMm: 900,
      roiRowStart: 1,
      roiRowEnd: 6,
      roiColStart: 1,
      roiColEnd: 6,
      presentFrames: 6,
      absentFrames: 15,
      headBandMm: 80,
      topK: 3,
      minBandZones: 2,
      validHeightMinMm: 800,
      validHeightMaxMm: 2300,
      maxJumpMm: 60,
      stabilityWindowMs: 2000,
      stabilityMinHoldMs: 1000,
      minSamples: 8,
      stabilityRangeMm: 10,
      stabilityMaxSlopeMmPerSec: 6.0,
      madFactor: 3,
      madFloorMm: 3,
      minKeptRatio: 0.75,
      glitchGrace: 3,
      maxGapMs: 300,
      timeoutMs: 15000,
      tareFrames: 30,
      minValidRatio: 0.6,
      zoneStdMaxMm: 8,
      maxUnstableZones: 6,
      autoApplyMaxDiffMm: 20,
      driftIdleFrames: 150,
      driftThresholdMm: 15,
      ...config,
    } as Required<HeightEngineConfig>

    this.framer = new HeightStreamFramer({
      onRawFrame: (frame) => {
        this.lastRawFrame = frame
        this.frameListeners.forEach((listener) => listener(frame))
      },
    })
  }

  /**
   * Thiết lập hàm callback ghi dữ liệu byte xuống Transport (gửi lệnh xuống ESP32).
   */
  public setWriter(writer: (bytes: Uint8Array) => Promise<void>): void {
    this.sendBytesCallback = writer
  }

  /**
   * Gửi lệnh PING xuống ESP32 để kiểm tra kết nối.
   */
  public async ping(): Promise<void> {
    if (this.sendBytesCallback) {
      await this.sendBytesCallback(encodePingCommand())
    }
  }

  /**
   * Gửi lệnh RESET phiên đo xuống ESP32.
   */
  public async resetDevice(): Promise<void> {
    if (this.sendBytesCallback) {
      await this.sendBytesCallback(encodeResetCommand())
    }
  }

  /**
   * Cân chuẩn mặt sàn (Tare). Dùng cho Admin tool hoặc Test Suite.
   * @param frames Mảng các raw frame để cân sàn
   */
  public calibrateFloor(frames: VL53L5CXFramePayload[]) {
    const legacyEngine = new HeightMeasurementEngine(this.config)
    return legacyEngine.calibrateFloor(frames)
  }

  /** Xóa dữ liệu cân sàn */
  public clearCalibration(): void {
    // Zero-op cho firmware engine
  }

  /**
   * Cập nhật tham số cấu hình cho module đo chiều cao và đồng bộ xuống ESP32 qua Serial.
   */
  public async updateEngineConfig(newCfg: Partial<HeightEngineConfig>): Promise<void> {
    this.config = {
      ...this.config,
      ...newCfg,
    }

    if (this.sendBytesCallback) {
      const cmd = encodeConfigCommand({
        expectedFloorMm: this.config.expectedFloorMm,
        platformHeightMm: this.config.platformHeightMm,
        gainScale: this.config.gainScale,
        offsetMm: this.config.offsetMm,
      })
      await this.sendBytesCallback(cmd)
    }
  }

  /** Lấy cấu hình tham số hiện tại */
  public getEngineConfig(): Required<HeightEngineConfig> {
    return { ...this.config }
  }

  /**
   * Xử lý luồng chunk mảng byte nhị phân nhận được từ cổng USB Serial.
   */
  public processChunk(chunk: Uint8Array): void {
    const packets = this.framer.pushData(chunk)
    for (const packet of packets) {
      this.handleHeightPacket(packet)
    }
  }

  /**
   * Chuyển hóa gói HeightPacketPayload thành HeightCalculationResult và phát cho các subscriber.
   */
  public handleHeightPacket(packet: HeightPacketPayload): void {
    const instantHeightCm =
      packet.instantHeightMm > 0 ? Number((packet.instantHeightMm / 10).toFixed(1)) : null

    const lockedHeightCm =
      packet.lockedHeightMm > 0 ? Number((packet.lockedHeightMm / 10).toFixed(1)) : null

    const measuredHeightCm = lockedHeightCm ?? instantHeightCm ?? 0

    const standingSurfaceMm = this.config.expectedFloorMm - this.config.platformHeightMm
    const headDistanceMm =
      packet.instantHeightMm > 0
        ? Math.max(0, standingSurfaceMm - packet.instantHeightMm)
        : standingSurfaceMm

    const result: HeightCalculationResult = {
      state: packet.state,
      episodeId: 1,
      guidance: packet.guidance,
      guidanceMessage: GUIDANCE_MESSAGES[packet.guidance] ?? 'Sẵn sàng đo chiều cao',
      progress: packet.progress,
      instantHeightMm: packet.instantHeightMm > 0 ? packet.instantHeightMm : null,
      instantHeightCm,
      headZoneCount: packet.headZoneCount,
      personCount: packet.hasPerson ? 1 : 0,
      hasHandRaised: false,
      isStable: packet.isStable,
      result:
        packet.state === 'LOCKED' && packet.lockedHeightMm > 0
          ? {
              episodeId: 1,
              heightCm: lockedHeightCm ?? 0,
              rawMm: packet.lockedHeightMm,
              sampleCount: 15,
              lockedAt: packet.timestampMs,
              confidence: packet.confidence,
            }
          : undefined,
      rawFrame:
        this.lastRawFrame ??
        this.generateSyntheticFrame(1, measuredHeightCm > 0 ? measuredHeightCm : 170),
      needsRecalibration: packet.needsRecalibration,
      event: packet.event !== 'NONE' ? packet.event : undefined,
      headCentroidMm: null,
      measuredHeightCm,
      headDistanceMm,
      floorDistanceMm: this.config.expectedFloorMm,
      platformHeightMm: this.config.platformHeightMm,
      confidence: packet.confidence,
    }

    if (process.env.NODE_ENV !== 'test') {
      const heightStr = measuredHeightCm > 0 ? `${measuredHeightCm.toFixed(1)}cm` : '---'
      const lockedStr = result.result ? ` [LOCKED: ${result.result.heightCm.toFixed(1)}cm]` : ''
      const evStr = packet.event !== 'NONE' ? ` | EVENT: ${packet.event}` : ''
      console.log(
        `[HEIGHT MODULE] State: ${packet.state} | Guide: ${packet.guidance} | Progress: ${Math.round(packet.progress * 100)}% | Height: ${heightStr}${lockedStr}${evStr}`,
      )
    }

    this.resultListeners.forEach((listener) => listener(result))
  }

  /**
   * Đăng ký lắng nghe sự kiện kết quả đo chiều cao.
   */
  public onHeightResult(callback: (result: HeightCalculationResult) => void): () => void {
    this.resultListeners.add(callback)
    return () => {
      this.resultListeners.delete(callback)
    }
  }

  /**
   * Đăng ký lắng nghe raw frame (nếu có).
   */
  public onFrame(callback: (frame: VL53L5CXFramePayload) => void): () => void {
    this.frameListeners.add(callback)
    return () => {
      this.frameListeners.delete(callback)
    }
  }

  /**
   * Bắt đầu phát luồng dữ liệu giả lập (Mock Stream) ở tần số 15Hz (66ms).
   * Giả lập tiến trình: 6 frames MEASURING -> 10 frames HOLD_STILL -> LOCKED.
   */
  public startMockStream(simulatedHeightCm = 172.5): void {
    this.stopMockStream()
    this.isMocking = true
    this.mockFrameCounter = 0

    const targetHeightMm = Math.round(simulatedHeightCm * 10)

    this.mockTimer = setInterval(() => {
      this.mockFrameCounter++
      const f = this.mockFrameCounter

      let state: HeightPacketPayload['state'] = 'MEASURING'
      let guidance: HeightPacketPayload['guidance'] = 'HOLD_STILL'
      let progress = 0.2
      let lockedHeightMm = 0
      let isStable = false
      let event: HeightPacketPayload['event'] = 'NONE'

      if (f <= 6) {
        state = 'MEASURING'
        guidance = 'MEASURING'
        progress = (f / 6) * 0.3
        if (f === 6) event = 'PERSON_PRESENT'
      } else if (f <= 20) {
        state = 'HOLD_STILL'
        guidance = 'HOLD_STILL'
        progress = 0.3 + ((f - 6) / 14) * 0.65
        isStable = true
      } else {
        state = 'LOCKED'
        guidance = 'LOCKED'
        progress = 1.0
        lockedHeightMm = targetHeightMm
        isStable = true
        if (f === 21) event = 'LOCKED'
      }

      const syntheticPacket: HeightPacketPayload = {
        header0: 0xaa,
        header1: 0x55,
        packetType: 0x48,
        state,
        guidance,
        lockedHeightMm,
        instantHeightMm: targetHeightMm + ((f % 3) - 1) * 2, // Dao động nhẹ ±2mm
        progress: Math.min(1.0, progress),
        confidence: state === 'LOCKED' ? 0.98 : 0.85,
        headZoneCount: 3,
        event,
        isStable,
        hasPerson: true,
        needsRecalibration: false,
        timestampMs: f * 66,
      }

      this.handleHeightPacket(syntheticPacket)
    }, 66)
  }

  /** Dừng phát luồng giả lập */
  public stopMockStream(): void {
    this.isMocking = false
    if (this.mockTimer) {
      clearInterval(this.mockTimer)
      this.mockTimer = null
    }
  }

  public isMockingActive(): boolean {
    return this.isMocking
  }

  /** Reset làm sạch trạng thái */
  public reset(): void {
    this.framer.reset()
    this.stopMockStream()
    this.mockFrameCounter = 0
    this.lastRawFrame = null
    this.resetDevice().catch(() => {})
  }

  /** Sinh frame giả lập thô ma trận 8x8 phục vụ heatmap */
  private generateSyntheticFrame(frameId: number, personHeightCm: number): VL53L5CXFramePayload {
    const expectedFloorMm = this.config.expectedFloorMm
    const platformHeightMm = this.config.platformHeightMm
    const targetHeadHeightMm = personHeightCm * 10
    const verticalHeadDepthMm = expectedFloorMm - platformHeightMm - targetHeadHeightMm

    const distances: number[] = new Array(64)
    const targetStatuses: ToFTargetStatus[] = new Array(64)

    const rawHeadDist = Math.max(200, Math.round(verticalHeadDepthMm / 0.995))

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c
        const distFromCenter = Math.sqrt(Math.pow(r - 3.5, 2) + Math.pow(c - 3.5, 2))

        if (distFromCenter <= 1.0) {
          distances[idx] = rawHeadDist
          targetStatuses[idx] = 5
        } else if (distFromCenter <= 1.8) {
          distances[idx] = rawHeadDist + 20
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
}
