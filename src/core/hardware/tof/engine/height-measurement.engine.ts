import type {
  EngineEvent,
  EngineGuidance,
  EngineState,
  FloorCalibrationData,
  HeightCalculationResult,
  HeightEngineConfig,
  HeightEngineOutput,
  HeightLockResult,
  TareResult,
  VL53L5CXFramePayload,
} from '../types/tof.types'

export const DEFAULT_HEIGHT_ENGINE_CONFIG = {
  // ==========================================================================
  // 1. MỐC VẬT LÝ & VÙNG QUAN TÂM (PHYSICAL BASELINE & ROI)
  // ==========================================================================
  /** Mốc chiều cao lắp đặt cảm biến chiếu xuống mặt sàn (222cm = 2220mm) */
  expectedFloorMm: 2220,

  /** Độ cao bệ cân/bàn đạp so với mặt sàn (mm, ví dụ InBody 260S = 96mm / 9.6cm, mặc định 0mm) */
  platformHeightMm: 0,

  /** Vùng quan tâm ROI: Hàng bắt đầu (chỉ lấy hàng 1..6 trong ma trận 8x8, bỏ viền 0 và 7 để tránh tán xạ tường) */
  roiRowStart: 1,
  /** Vùng quan tâm ROI: Hàng kết thúc */
  roiRowEnd: 6,
  /** Vùng quan tâm ROI: Cột bắt đầu (chỉ lấy cột 1..6 trong ma trận 8x8, bỏ viền 0 và 7) */
  roiColStart: 1,
  /** Vùng quan tâm ROI: Cột kết thúc */
  roiColEnd: 6,

  // ==========================================================================
  // 2. NHẬN DIỆN NGƯỜI BƯỚC VÀO / RỜI ĐI (PERSON DETECTION)
  // ==========================================================================
  /** Chiều cao tối thiểu để nhận diện có người đứng vào bàn cân (900mm = 90cm; dưới 90cm coi như sàn trống / vật thể tĩnh) */
  minPersonMm: 900,

  /** Số frame liên tiếp phát hiện có người để chuyển từ IDLE sang MEASURING (6 frames @ 15Hz ~ 400ms chống nhiễu lướt qua) */
  presentFrames: 6,

  /** Số frame liên tiếp KHÔNG thấy người để xác nhận người đã bước ra và reset phiên đo (15 frames ~ 1 giây) */
  absentFrames: 15,

  // ==========================================================================
  // 3. TÁCH ĐỈNH ĐẦU & LỌC NHIỄU QUANG HỌC (HEAD DETECTION & GLITCH FILTER)
  // ==========================================================================
  /** Bề dày dải đỉnh đầu: Lấy từ điểm cao nhất (peak) lùi xuống 80mm để gom các zone thuộc vòm đầu, tránh lấy xuống vai */
  headBandMm: 80,

  /** Số lượng zone cao nhất trong dải đỉnh đầu được lấy để tính trung bình tức thời (lấy 3 zone cao nhất) */
  topK: 3,

  /** Số zone tối thiểu trong dải đỉnh đầu để xác nhận bề mặt đầu thật (tối thiểu 2 zone, tránh tia nhiễu nhọn 1 zone) */
  minBandZones: 2,

  /** Giới hạn chiều cao hợp lệ tối thiểu của con người (800mm = 80cm) */
  validHeightMinMm: 800,

  /** Giới hạn chiều cao hợp lệ tối đa của con người (2300mm = 2m30) */
  validHeightMaxMm: 2300,

  /** Bước nhảy tối đa giữa 2 frame liên tiếp (60mm). Nếu nhảy vọt > 6cm/frame (trong 66ms) coi như nhiễu giật (glitch jump) */
  maxJumpMm: 60,

  /** Số frame nhiễu giật liên tiếp được phép bỏ qua trước khi xóa sạch bộ đệm ổn định (3 frames) */
  glitchGrace: 3,

  /** Khoảng cách thời gian tối đa giữa 2 gói tin liên tiếp (300ms). Nếu đứt đoạn > 300ms sẽ reset bộ đệm */
  maxGapMs: 300,

  // ==========================================================================
  // 4. TIÊU CHÍ ĐỨNG YÊN ĐỂ CHỐT KHÓA CHIỀU CAO (STABILITY & LOCK CRITERIA)
  // ==========================================================================
  /** Cửa sổ thời gian trượt (Sliding Window) để gom các mẫu đánh giá độ ổn định (2000ms = 2.0 giây) */
  stabilityWindowMs: 2000,

  /** Thời gian tối thiểu người dùng phải đứng yên bất động để được phép chốt khóa (1000ms = 1.0 giây) */
  stabilityMinHoldMs: 1000,

  /** Số lượng mẫu (frame) hợp lệ tối thiểu trong khoảng thời gian đứng yên (8 mẫu @ 15Hz ~ 530ms) */
  minSamples: 8,

  /** Biên độ rung lắc tối đa cho phép (Max - Min) trong lúc đứng yên (10mm = 1cm). Dao động > 10mm coi như đang lắc lư */
  stabilityRangeMm: 10,

  /** Tốc độ dịch chuyển tối đa theo phương thẳng đứng (6.0 mm/s). Nếu người đang từ từ ngồi xuống/nhổm lên thì chưa khóa */
  stabilityMaxSlopeMmPerSec: 6.0,

  /** Thời gian chờ tối đa cho 1 phiên đo nếu người đứng cựa quậy quá lâu không khóa được (15000ms = 15 giây) */
  timeoutMs: 15000,

  // ==========================================================================
  // 5. LỌC THỐNG KÊ MAD & BÙ SAI SỐ (STATISTICAL FILTERING & CALIBRATION)
  // ==========================================================================
  /** Số frame ở trạng thái rảnh (IDLE) để kiểm tra xem mốc sàn có bị trôi lệch nhiệt độ/ánh sáng không (150 frames ~ 10s) */
  driftCheckFrames: 150,

  /** Ngưỡng trôi lệch mặt sàn tối đa cho phép trước khi cảnh báo cần hiệu chuẩn lại (15mm) */
  driftThresholdMm: 15,

  /** Hệ số nhân lọc ngoại lai MAD (Median Absolute Deviation): Mẫu lệch khỏi trung vị > 3*MAD sẽ bị loại bỏ */
  madFactor: 3,

  /** Ngưỡng sàn tối thiểu của độ lệch MAD để tránh chia cho 0 hoặc lọc quá gắt khi dữ liệu đứng cực kỳ tĩnh (3mm) */
  madFloorMm: 3,

  /** Tỷ lệ mẫu tối thiểu phải được giữ lại sau khi lọc ngoại lai MAD (0.75 = ít nhất 75% mẫu hợp lệ) */
  minKeptRatio: 0.75,

  /** Hệ số nhân tỉ lệ (Gain Scale) để hiệu chuẩn sai số tỷ lệ khoảng cách quang học (mặc định 1.0) */
  gainScale: 1.0,

  /** Giá trị bù cộng/trừ trực tiếp (Offset mm) vào chiều cao cuối cùng sau khi tính toán (mặc định 0.0mm) */
  offsetMm: 0.0,
}

export const GUIDANCE_MESSAGES: Record<EngineGuidance, string> = {
  IDLE: 'San sang do chieu cao',
  STEP_ON: 'Moi buoc len ban can, dung thang, tha long tay',
  HOLD_STILL: 'Vui long dung thang lung, giu yen vi tri va nhin thang',
  MEASURING: 'Dang phan tich tin hieu do chieu cao...',
  LOCKED: 'Da hoan thanh do chieu cao',
  TIMEOUT: 'Qua thoi gian do chieu cao, vui long thu lai',
  STEP_IN: 'Vui long buoc vao san do',
  LOWER_ARMS: 'Vui long ha tay xuong de do chinh xac',
  ONE_PERSON: 'Vui long chi 1 nguoi dung do tren san',
  MOVE_LEFT: 'Vui long buoc sang trai',
  MOVE_RIGHT: 'Vui long buoc sang phai',
  MOVE_FORWARD: 'Vui long buoc ve phia truoc',
  MOVE_BACK: 'Vui long buoc lui lai',
}

interface StabilitySample {
  ts: number
  h: number
}

export class HeightMeasurementEngine {
  private cfg: Required<typeof DEFAULT_HEIGHT_ENGINE_CONFIG>

  private baseline: FloorCalibrationData | null = null
  private cosLUT: number[][] = []

  private isEnabled = true
  private episodeId = 0
  private hitCount = 0
  private missCount = 0
  private glitchCount = 0
  private locked = false
  private lockedResult: HeightLockResult | null = null
  private timeoutTriggered = false

  private history: StabilitySample[] = []
  private prevH: number | null = null
  private lastTs: number | null = null
  private sessionStart: number | null = null
  private issueCount: Record<string, number> = {}

  private needsRecalibration = false
  private lastProgress = 0
  private pendingEvent: EngineEvent | undefined = undefined

  constructor(config: Partial<HeightEngineConfig> = {}) {
    this.cfg = {
      ...DEFAULT_HEIGHT_ENGINE_CONFIG,
      ...config,
    } as Required<typeof DEFAULT_HEIGHT_ENGINE_CONFIG>

    if (config.calibration) {
      this.baseline = config.calibration
    }

    this.initLookupTables()
  }

  /** Lấy baseline hiệu chuẩn hoặc baseline mặc định dựa theo expectedFloorMm */
  public getEffectiveBaseline(): FloorCalibrationData {
    if (this.baseline) return this.baseline
    return {
      floorZ: new Array(64).fill(this.cfg.expectedFloorMm),
      floorOk: new Array(64).fill(true),
      refX0: 0,
      refY0: 0,
      calibratedAt: 0,
    }
  }

  public getConfig(): Required<typeof DEFAULT_HEIGHT_ENGINE_CONFIG> {
    return { ...this.cfg }
  }

  public updateConfig(newConfig: Partial<HeightEngineConfig>): void {
    this.cfg = {
      ...this.cfg,
      ...newConfig,
    } as Required<typeof DEFAULT_HEIGHT_ENGINE_CONFIG>

    if (newConfig.calibration) {
      this.baseline = newConfig.calibration
    } else if (newConfig.expectedFloorMm && this.baseline) {
      this.baseline = {
        ...this.baseline,
        floorZ: new Array(64).fill(this.cfg.expectedFloorMm),
      }
    }
  }

  public start(): void {
    this.isEnabled = true
  }

  public stop(): void {
    this.isEnabled = false
    this.reset()
  }

  public reset(): void {
    this.history = []
    this.sessionStart = null
    this.issueCount = {}
    this.locked = false
    this.lockedResult = null
    this.timeoutTriggered = false
    this.glitchCount = 0
    this.prevH = null
    this.hitCount = 0
    this.missCount = 0
    this.lastProgress = 0
    this.pendingEvent = undefined
  }

  public calibrateFloor(
    frames: VL53L5CXFramePayload[],
    options: { force?: boolean } = {},
  ): TareResult {
    const validFrames = frames // Accept all frames during calibration to maximize chances
    if (validFrames.length < 5) return { error: 'TOO_FEW_ZONES' }

    const n = validFrames.length
    const zoneSamples: number[][] = Array.from({ length: 64 }, () => [])

    for (const frame of validFrames) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const i = r * 8 + c
          const d = frame.distances[i]
          const st = frame.targetStatuses[i]
          // Chấp nhận rộng rãi hơn các status (5, 6, 9, 10, 12, 13) để tránh thiếu zone do vật thể phản xạ kém
          if (st >= 5 && st <= 13 && st !== 7 && st !== 8 && d > 200 && d < 4000) {
            zoneSamples[i].push(d * this.cosLUT[r][c])
          }
        }
      }
    }

    const cand: FloorCalibrationData = {
      floorZ: new Array(64).fill(0),
      floorOk: new Array(64).fill(false),
      refX0: 0,
      refY0: 0,
      calibratedAt: Date.now(),
    }

    let diffSum = 0
    let diffCount = 0

    for (let i = 0; i < 64; i++) {
      const s = zoneSamples[i]
      // Chỉ cần 20% số frames có dữ liệu là đủ
      if (s.length >= 0.2 * n) {
        const mean = s.reduce((a, b) => a + b, 0) / s.length
        const variance = s.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / s.length
        const stdDev = Math.sqrt(variance)
        // Nới lỏng stdDev lên 80mm vì thiết bị (máy inbody) có bề mặt phức tạp
        if (stdDev > 80) {
          cand.floorOk[i] = false
          continue
        }

        s.sort((a, b) => a - b)
        const mid = Math.floor(s.length / 2)
        cand.floorZ[i] = s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2
        cand.floorOk[i] = true

        if (this.baseline && this.baseline.floorOk[i]) {
          diffSum += cand.floorZ[i] - this.baseline.floorZ[i]
          diffCount++
        }
      } else {
        cand.floorOk[i] = false
      }
    }

    // Removed strict coreOk check.
    // The environment might have permanent equipment (like InBody base, BP machine)
    // in the center zones that protrude significantly. We should trust the calibration.
    let validCount = 0
    for (let r = this.cfg.roiRowStart; r <= this.cfg.roiRowEnd; r++) {
      for (let c = this.cfg.roiColStart; c <= this.cfg.roiColEnd; c++) {
        if (cand.floorOk[r * 8 + c]) validCount++
      }
    }

    // Yêu cầu tối thiểu chỉ cần 4 zone (thay vì 20) để có thể hoạt động
    if (validCount < 4) {
      return { error: 'TOO_FEW_ZONES' }
    }

    if (!options.force && this.baseline && diffCount > 10) {
      const meanDiff = Math.abs(diffSum / diffCount)
      if (meanDiff > 20) {
        return 'PENDING'
      }
    }

    this.baseline = cand
    this.needsRecalibration = false
    return 'APPLIED'
  }

  public clearCalibration(): void {
    this.baseline = null
  }

  public getBaseline(): FloorCalibrationData | null {
    return this.baseline
  }

  public push(frame: VL53L5CXFramePayload): HeightEngineOutput {
    if (!this.isEnabled) {
      return this.out('IDLE', 'IDLE', 0, null, 0, false, false, frame)
    }

    if (!frame.isValid || frame.distances.length !== 64) {
      return this.out('ERROR', 'IDLE', 0, null, 0, false, false, frame)
    }

    if (
      this.lastTs !== null &&
      (frame.timestampMs < this.lastTs || frame.timestampMs - this.lastTs > this.cfg.maxGapMs)
    ) {
      this.history = []
      this.prevH = null
    }
    this.lastTs = frame.timestampMs

    this.pendingEvent = undefined

    const zones = this.buildHeightMap(frame)
    const peak = zones.length > 0 ? Math.max(...zones.map((z) => z.h)) : 0

    const isCore = (i: number) => {
      const r = Math.floor(i / 8)
      const c = i % 8
      return r >= 2 && r <= 5 && c >= 2 && c <= 5
    }

    const band = zones.filter((z) => z.h >= peak - this.cfg.headBandMm).sort((a, b) => b.h - a.h)
    let hasCorePeak = false
    for (const z of band) {
      if (isCore(z.i)) {
        hasCorePeak = true
        break
      }
    }

    const hasPerson = peak >= this.cfg.minPersonMm && hasCorePeak

    if (this.locked && this.lockedResult) {
      if (!hasPerson) {
        this.missCount++
        if (this.missCount >= this.cfg.absentFrames) {
          this.pendingEvent = 'PERSON_LEFT'
          this.reset()
          return this.out('IDLE', 'STEP_ON', 0, null, 0, false, false, frame)
        }
      } else {
        this.missCount = 0
      }
      return this.out(
        'LOCKED',
        'LOCKED',
        1.0,
        null,
        0,
        false,
        true,
        frame,
        false,
        undefined,
        this.lockedResult,
      )
    }

    if (this.timeoutTriggered) {
      if (!hasPerson) {
        this.missCount++
        if (this.missCount >= this.cfg.absentFrames) {
          this.pendingEvent = 'PERSON_LEFT'
          this.reset()
          return this.out('IDLE', 'STEP_ON', 0, null, 0, false, false, frame)
        }
      } else {
        this.missCount = 0
      }
      return this.out('TIMEOUT', 'TIMEOUT', this.lastProgress, null, 0, false, false, frame)
    }

    if (!hasPerson) {
      this.missCount++
      this.hitCount = 0

      if (this.missCount >= this.cfg.driftCheckFrames) {
        this.checkIdleDrift(frame)
      }

      if (this.missCount >= this.cfg.absentFrames) {
        if (this.sessionStart !== null) {
          this.pendingEvent = 'PERSON_LEFT'
        }
        this.reset()
        return this.out('IDLE', 'STEP_ON', 0, null, 0, false, false, frame)
      }

      if (this.sessionStart === null) {
        return this.out('IDLE', 'STEP_ON', 0, null, 0, false, false, frame)
      }

      return this.out('MEASURING', 'MEASURING', this.lastProgress, null, 0, false, false, frame)
    }

    this.missCount = 0
    this.hitCount++

    if (this.hitCount === this.cfg.presentFrames && this.sessionStart === null) {
      this.sessionStart = frame.timestampMs
      this.episodeId++
      this.pendingEvent = 'PERSON_PRESENT'
    }

    if (this.hitCount < this.cfg.presentFrames) {
      const s = this.sessionStart === null ? 'IDLE' : 'MEASURING'
      const g = this.sessionStart === null ? 'STEP_ON' : 'MEASURING'
      return this.out(s, g, 0, null, 0, false, false, frame)
    }

    const topZones = band.slice(0, Math.min(this.cfg.topK, band.length))
    const instantH =
      topZones.length > 0 ? topZones.reduce((s, z) => s + z.h, 0) / topZones.length : 0
    const headZoneCount = topZones.length

    let glitchReason: string | null = null
    if (band.length < this.cfg.minBandZones) {
      glitchReason = 'SPIKE'
    } else if (instantH < this.cfg.validHeightMinMm || instantH > this.cfg.validHeightMaxMm) {
      glitchReason = 'OUT_OF_RANGE'
    } else if (this.prevH !== null && Math.abs(instantH - this.prevH) > this.cfg.maxJumpMm) {
      glitchReason = 'JUMP'
    }

    this.prevH = instantH

    if (glitchReason) {
      this.issueCount[glitchReason] = (this.issueCount[glitchReason] ?? 0) + 1
      this.glitchCount++
      if (this.glitchCount > this.cfg.glitchGrace) {
        this.history = []
      }
      if (this.checkTimeout(frame.timestampMs)) {
        return this.out('TIMEOUT', 'TIMEOUT', this.lastProgress, null, 0, false, false, frame)
      }
      return this.out(
        'MEASURING',
        'HOLD_STILL',
        this.lastProgress,
        instantH,
        headZoneCount,
        false,
        false,
        frame,
      )
    }

    this.glitchCount = 0
    this.history.push({ ts: frame.timestampMs, h: instantH })

    const cutoff = frame.timestampMs - this.cfg.stabilityWindowMs
    this.history = this.history.filter((s) => s.ts >= cutoff)

    const heights = this.history.map((s) => s.h)
    const med = this.median(heights)
    const devs = heights.map((h) => Math.abs(h - med))
    const mad = Math.max(this.median(devs), this.cfg.madFloorMm)
    const kept = this.history.filter((s) => Math.abs(s.h - med) <= this.cfg.madFactor * mad)

    if (kept.length < this.cfg.minKeptRatio * this.history.length) {
      if (this.checkTimeout(frame.timestampMs)) {
        return this.out('TIMEOUT', 'TIMEOUT', this.lastProgress, null, 0, false, false, frame)
      }
      this.lastProgress = 0.3
      return this.out('MEASURING', 'HOLD_STILL', 0.3, instantH, headZoneCount, false, false, frame)
    }

    const keptH = kept.map((s) => s.h)
    const range = Math.max(...keptH) - Math.min(...keptH)
    const slope = this.linregSlope(kept) * 1000
    const holdMs = kept[kept.length - 1].ts - kept[0].ts

    if (range > this.cfg.stabilityRangeMm || Math.abs(slope) > this.cfg.stabilityMaxSlopeMmPerSec) {
      this.issueCount['MOVING'] = (this.issueCount['MOVING'] ?? 0) + 1
      const progress = Math.min(0.4, Math.max(0.1, 1.0 - range / 50.0))
      this.lastProgress = progress
      if (this.checkTimeout(frame.timestampMs)) {
        return this.out('TIMEOUT', 'TIMEOUT', this.lastProgress, null, 0, false, false, frame)
      }
      return this.out(
        'MEASURING',
        'HOLD_STILL',
        progress,
        instantH,
        headZoneCount,
        false,
        false,
        frame,
      )
    }

    const progressRatio = Math.min(1.0, holdMs / this.cfg.stabilityMinHoldMs)
    const qualityFactor = Math.max(0.5, 1.0 - range / 35.0)
    const progress = Math.min(0.99, progressRatio * qualityFactor)
    this.lastProgress = progress

    if (holdMs >= this.cfg.stabilityMinHoldMs && kept.length >= this.cfg.minSamples) {
      const sortedH = [...keptH].sort((a, b) => a - b)
      const trim = Math.floor(sortedH.length * 0.1)
      const trimSlice = sortedH.slice(trim, sortedH.length - trim)
      const rawMm = trimSlice.reduce((s, v) => s + v, 0) / trimSlice.length
      const finalMm = rawMm * this.cfg.gainScale + this.cfg.offsetMm
      const heightCm = Math.round((finalMm / 10.0) * 10.0) / 10.0

      const confidence = Math.min(0.99, Math.max(0.85, 1.0 - range / this.cfg.stabilityRangeMm))

      this.lockedResult = {
        episodeId: this.episodeId,
        heightCm,
        rawMm: Math.round(rawMm),
        sampleCount: kept.length,
        lockedAt: frame.timestampMs,
        confidence,
      }
      this.locked = true
      this.pendingEvent = 'LOCKED'
      return this.out(
        'LOCKED',
        'LOCKED',
        1.0,
        instantH,
        headZoneCount,
        false,
        true,
        frame,
        false,
        undefined,
        this.lockedResult,
      )
    }

    if (this.checkTimeout(frame.timestampMs)) {
      return this.out('TIMEOUT', 'TIMEOUT', this.lastProgress, null, 0, false, false, frame)
    }

    return this.out(
      'MEASURING',
      'HOLD_STILL',
      progress,
      instantH,
      headZoneCount,
      false,
      false,
      frame,
    )
  }

  public calculateHeight(frame: VL53L5CXFramePayload): HeightCalculationResult {
    const output = this.push(frame)
    const measuredHeightCm = output.result?.heightCm ?? output.instantHeightCm ?? 0
    const standingSurfaceMm = this.cfg.expectedFloorMm - this.cfg.platformHeightMm
    const headDistanceMm =
      output.instantHeightMm !== null
        ? Math.max(0, standingSurfaceMm - output.instantHeightMm)
        : standingSurfaceMm
    const confidence = output.result?.confidence ?? (output.instantHeightCm ? 0.95 : 0.0)

    return {
      ...output,
      measuredHeightCm,
      headDistanceMm,
      floorDistanceMm: this.cfg.expectedFloorMm,
      platformHeightMm: this.cfg.platformHeightMm,
      confidence,
    }
  }

  private initLookupTables(): void {
    const step = (45.0 / 8.0) * (Math.PI / 180.0)
    const tanTable = Array.from({ length: 8 }, (_, i) => Math.tan((i - 3.5) * step))
    this.cosLUT = Array.from({ length: 8 }, (_, r) =>
      Array.from(
        { length: 8 },
        (__, c) => 1.0 / Math.sqrt(1.0 + Math.pow(tanTable[c], 2) + Math.pow(tanTable[r], 2)),
      ),
    )
  }

  private buildHeightMap(frame: VL53L5CXFramePayload): { h: number; status: number; i: number }[] {
    const baseline = this.getEffectiveBaseline()
    const result: { h: number; status: number; i: number }[] = []

    for (let r = this.cfg.roiRowStart; r <= this.cfg.roiRowEnd; r++) {
      for (let c = this.cfg.roiColStart; c <= this.cfg.roiColEnd; c++) {
        const i = r * 8 + c
        const st = frame.targetStatuses[i]
        // Mở rộng status chấp nhận được (gồm cả 6, 10, 12, 13) để nhận diện tóc/vật liệu phản xạ kém
        if (st < 5 || st > 13 || st === 7 || st === 8) continue
        if (!baseline.floorOk[i]) continue
        const d = frame.distances[i]
        if (d <= 50 || d >= 3900) continue
        const z = d * this.cosLUT[r][c]
        const h = Math.max(0, baseline.floorZ[i] - z - this.cfg.platformHeightMm)
        result.push({ h, status: st, i })
      }
    }
    return result
  }

  private checkTimeout(ts: number): boolean {
    if (this.sessionStart !== null && ts - this.sessionStart > this.cfg.timeoutMs) {
      this.timeoutTriggered = true
      this.pendingEvent = 'TIMEOUT'

      let maxCount = -1
      let dominant = 'NOT_STABLE'
      for (const [reason, count] of Object.entries(this.issueCount)) {
        if (count > maxCount) {
          maxCount = count
          dominant = reason
        }
      }
      this.issueCount['DOMINANT'] = dominant as any
      return true
    }
    return false
  }

  private checkIdleDrift(frame: VL53L5CXFramePayload): void {
    if (!this.baseline) return
    const diffs: number[] = []
    for (let r = this.cfg.roiRowStart; r <= this.cfg.roiRowEnd; r++) {
      for (let c = this.cfg.roiColStart; c <= this.cfg.roiColEnd; c++) {
        const i = r * 8 + c
        if (this.baseline.floorOk[i]) {
          const d = frame.distances[i]
          const st = frame.targetStatuses[i]
          if ((st === 5 || st === 9) && d > 500 && d < 4000) {
            const z = d * this.cosLUT[r][c]
            diffs.push(Math.abs(z - this.baseline.floorZ[i]))
          }
        }
      }
    }
    if (diffs.length >= 20) {
      const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
      if (meanDiff > this.cfg.driftThresholdMm) {
        this.needsRecalibration = true
      }
    }
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }

  private linregSlope(samples: StabilitySample[]): number {
    const n = samples.length
    if (n < 2) return 0
    let sumT = 0,
      sumH = 0
    for (const s of samples) {
      sumT += s.ts
      sumH += s.h
    }
    const avgT = sumT / n
    const avgH = sumH / n
    let num = 0,
      den = 0
    for (const s of samples) {
      num += (s.ts - avgT) * (s.h - avgH)
      den += (s.ts - avgT) ** 2
    }
    return den !== 0 ? num / den : 0
  }

  private out(
    state: EngineState,
    guidance: EngineGuidance,
    progress: number,
    instantHeightMm: number | null,
    headZoneCount: number,
    hasHandRaised: boolean,
    isStable: boolean,
    rawFrame: VL53L5CXFramePayload,
    needsRecalibration = this.needsRecalibration,
    dominantIssueReason?: string,
    result?: HeightLockResult,
  ): HeightEngineOutput {
    const instantHeightCm =
      instantHeightMm !== null ? Math.round((instantHeightMm / 10.0) * 10.0) / 10.0 : null

    if (state === 'TIMEOUT' && !dominantIssueReason && this.issueCount['DOMINANT']) {
      dominantIssueReason = this.issueCount['DOMINANT'] as any
    }

    return {
      state,
      episodeId: this.episodeId,
      guidance,
      guidanceMessage: GUIDANCE_MESSAGES[guidance] ?? GUIDANCE_MESSAGES.IDLE,
      progress: Math.min(1.0, Math.max(0, Math.round(progress * 100) / 100)),
      instantHeightMm,
      instantHeightCm,
      headZoneCount,
      personCount: state === 'IDLE' || state === 'STEP_ON' ? 0 : 1,
      hasHandRaised,
      isStable,
      result,
      rawFrame,
      needsRecalibration,
      dominantIssueReason,
      event: this.pendingEvent,
      headCentroidMm: null,
    }
  }
}
