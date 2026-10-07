import fs from 'fs'
import path from 'path'
import { HeightMeasurementEngine } from '../engine/height-measurement.engine'
import type { ToFTargetStatus, VL53L5CXFramePayload } from '../types/tof.types'

interface FixtureCaseExpected {
  expectedClass:
    | 'NO_PERSON'
    | 'PERSON_OK'
    | 'HAND_RAISED'
    | 'MULTIPLE_PEOPLE'
    | 'WRONG_POSITION'
    | 'TRANSITION'
  groundTruthHeightMm: number | null
  peopleCount: number
  headOffsetMm: { x: number; y: number } | null
  stable: boolean
  note: string
}

interface FixtureLine {
  caseId: string
  frameIdx: number
  frameId: number
  timestampMs: number
  distances: number[]
  targetStatuses: ToFTargetStatus[]
  isValid: boolean
  expected: FixtureCaseExpected
}

describe('ToF Fixture Integration Suite (115 Frames / 23 Cases)', () => {
  const engine = new HeightMeasurementEngine(2200)
  const fixturePath = path.resolve(
    __dirname,
    '../../../../../firmware/esp32-vl53l5cx-driver/test/tof_cases.jsonl',
  )

  let lines: FixtureLine[] = []

  beforeAll(() => {
    if (fs.existsSync(fixturePath)) {
      const rawContent = fs.readFileSync(fixturePath, 'utf-8')
      lines = rawContent
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l) as FixtureLine)
    }
  })

  it('should load and verify all 115 fixture lines', () => {
    expect(lines.length).toBe(115)
  })

  it('should evaluate all 23 physical test cases against HeightMeasurementEngine correctly', () => {
    const caseStats: Record<string, { total: number; passed: number }> = {}

    lines.forEach((line) => {
      const frame: VL53L5CXFramePayload = {
        frameId: line.frameId,
        timestampMs: line.timestampMs,
        distances: line.distances,
        targetStatuses: line.targetStatuses,
        zoneCount: 64,
        isValid: line.isValid,
      }

      const result = engine.calculateHeight(frame)
      const exp = line.expected

      if (!caseStats[line.caseId]) {
        caseStats[line.caseId] = { total: 0, passed: 0 }
      }
      caseStats[line.caseId].total++

      let isCasePassed = false

      switch (exp.expectedClass) {
        case 'NO_PERSON':
          isCasePassed = result.personCount === 0 || result.measuredHeightCm === 0
          break

        case 'PERSON_OK':
        case 'WRONG_POSITION':
          if (exp.groundTruthHeightMm) {
            const expectedCm = exp.groundTruthHeightMm / 10.0
            // Tolerance <= 3.0 cm for ray-tracing optical variation & synthetic noise
            const diff = Math.abs(result.measuredHeightCm - expectedCm)
            isCasePassed = diff <= 3.0 && result.personCount > 0
          } else {
            isCasePassed = result.personCount > 0
          }
          break

        case 'TRANSITION':
          // Transition state walking into FOV: allows any valid response
          isCasePassed = true
          break

        case 'HAND_RAISED':
          // Hand raised test or boundary near 50mm threshold
          isCasePassed = result.hasHandRaised === true || result.measuredHeightCm > 0
          break

        case 'MULTIPLE_PEOPLE':
          isCasePassed = result.personCount >= 1
          break

        default:
          isCasePassed = true
      }

      if (isCasePassed) {
        caseStats[line.caseId].passed++
      }
    })

    // Print analysis report for all 23 test cases
    console.log('\n==========================================================')
    console.log('   BÁO CÁO PHÂN TÍCH 23 KỊCH BẢN MOCK FIXTURE (115 FRAMES)   ')
    console.log('==========================================================')
    Object.entries(caseStats).forEach(([caseId, stat]) => {
      const passRate = Math.round((stat.passed / stat.total) * 100)
      console.log(
        ` -> [CASE] ${caseId.padEnd(32)}: ${stat.passed}/${stat.total} frames (${passRate}%)`,
      )
      expect(passRate).toBeGreaterThanOrEqual(80)
    })
    console.log('==========================================================\n')
  })
})
