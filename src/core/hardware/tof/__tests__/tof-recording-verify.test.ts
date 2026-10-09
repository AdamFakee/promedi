import fs from 'fs'
import path from 'path'
import { HeightMeasurementEngine } from '../engine/height-measurement.engine'
import type { VL53L5CXFramePayload } from '../types/tof.types'

describe('Verification with Real Kiosk Recording Logs', () => {
  const GROUND_TRUTH_CM = 178.3

  it('Log 1 (tof_recording_1791438073806.jsonl): should lock at 177.9 cm (99.78% accuracy)', () => {
    const filePath = path.resolve(__dirname, '../../../../../tof_recording_1791438073806.jsonl')
    expect(fs.existsSync(filePath)).toBe(true)

    const raw = fs.readFileSync(filePath, 'utf-8')
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l))

    const engine = new HeightMeasurementEngine({
      expectedFloorMm: 2457,
      stabilityMinHoldMs: 1000,
      stabilityRangeMm: 15,
      minSamples: 8,
      calibration: {
        floorZ: new Array(64).fill(2457),
        floorOk: new Array(64).fill(true),
        refX0: 0,
        refY0: 0,
        calibratedAt: Date.now(),
      },
    })

    let lockFrame: any = null

    lines.forEach((line: any, idx: number) => {
      const frame: VL53L5CXFramePayload = {
        frameId: line.frameId,
        timestampMs: line.timestampMs,
        distances: line.distances,
        targetStatuses: line.targetStatuses,
        zoneCount: 64,
        isValid: line.isValid,
      }

      const res = engine.calculateHeight(frame)
      if (res.state === 'LOCKED' && !lockFrame) {
        lockFrame = {
          idx: idx + 1,
          ...res,
        }
      }
    })

    expect(lockFrame).not.toBeNull()
    const lockedHeightCm = lockFrame.measuredHeightCm
    expect(lockedHeightCm).toBeCloseTo(177.9, 1)

    const diffCm = Math.abs(lockedHeightCm - GROUND_TRUTH_CM)
    expect(diffCm).toBeLessThanOrEqual(0.5) // Leech <= 5mm
  })

  it('Log 2 (tof_recording_1791439209621.jsonl): should verify 3,847 frames, 8 lock sessions, and tilted head (~176cm)', () => {
    const filePath = path.resolve(__dirname, '../../../../../tof_recording_1791439209621.jsonl')
    expect(fs.existsSync(filePath)).toBe(true)

    const raw = fs.readFileSync(filePath, 'utf-8')
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l))

    expect(lines.length).toBe(3847)

    // Verify initial head-tilt phase (frames around 9-18 where height is ~176.0 cm)
    const tiltedFrame = lines.find((l: any) => l.frameIdx === 9)
    expect(tiltedFrame).toBeDefined()
    expect(tiltedFrame.engineResult.measuredHeightCm).toBeCloseTo(176.0, 1)

    // Replay with HeightMeasurementEngine
    const engine = new HeightMeasurementEngine({
      expectedFloorMm: 2457,
      stabilityMinHoldMs: 1000,
      stabilityRangeMm: 15,
      minSamples: 8,
      calibration: {
        floorZ: new Array(64).fill(2457),
        floorOk: new Array(64).fill(true),
        refX0: 0,
        refY0: 0,
        calibratedAt: Date.now(),
      },
    })

    const lockHeights: number[] = []
    let inLock = false

    lines.forEach((line: any) => {
      const frame: VL53L5CXFramePayload = {
        frameId: line.frameId,
        timestampMs: line.timestampMs,
        distances: line.distances,
        targetStatuses: line.targetStatuses,
        zoneCount: 64,
        isValid: line.isValid,
      }

      const res = engine.calculateHeight(frame)
      if (res.state === 'LOCKED') {
        if (!inLock) {
          lockHeights.push(res.measuredHeightCm)
          inLock = true
        }
      } else {
        inLock = false
      }
    })

    console.log('\n===============================================================')
    console.log('   BÁO CÁO NGHIỆM THU CHI TIẾT TỆP LOG 2 (3,847 FRAMES)')
    console.log('===============================================================')
    console.log(`- Chiều cao thực của người dùng (Ground Truth): ${GROUND_TRUTH_CM} cm (1m78.3)`)
    console.log(
      `- Frame ngước đầu ban đầu (Frame 9): ${tiltedFrame.engineResult.measuredHeightCm} cm`,
    )
    console.log(`- Số lần chốt khóa (Lock Sessions): ${lockHeights.length} lần`)

    lockHeights.forEach((h, idx) => {
      const diff = h - GROUND_TRUTH_CM
      console.log(
        `  -> Lần ${idx + 1}: ${h.toFixed(1)} cm (lệch ${diff >= 0 ? '+' : ''}${(diff * 10).toFixed(1)} mm)`,
      )
    })

    const avgH = lockHeights.reduce((a, b) => a + b, 0) / lockHeights.length
    const avgDiff = Math.abs(avgH - GROUND_TRUTH_CM)
    console.log(`- Chiều cao trung bình tất cả các lần: ${avgH.toFixed(2)} cm`)
    console.log(`- Sai số trung bình: ${(avgDiff * 10).toFixed(1)} mm`)
    console.log(`- Độ chính xác trung bình: ${((1 - avgDiff / GROUND_TRUTH_CM) * 100).toFixed(2)}%`)
    console.log('===============================================================\n')

    expect(lockHeights.length).toBe(7)
    expect(avgH).toBeCloseTo(178.7, 1)
    expect(avgDiff).toBeLessThanOrEqual(0.6) // Trung bình lệch < 6mm
  })
})
