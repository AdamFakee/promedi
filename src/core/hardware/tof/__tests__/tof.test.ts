import { ToFClient } from '../client/tof-client'
import { HeightMeasurementEngine } from '../engine/height-measurement.engine'
import {
  crc16Modbus,
  decodeToFFrame,
  flipLensOrientation,
  ToFStreamFramer,
} from '../protocol/tof-frame-codec'
import type { VL53L5CXFramePayload } from '../types/tof.types'

describe('ToF Distance Sensor Hardware Module (VL53L5CX)', () => {
  describe('Protocol Codec & CRC16 Modbus', () => {
    it('should correctly calculate CRC16-Modbus checksum', () => {
      const sampleBytes = new Uint8Array([0xaa, 0x55, 0x01, 0x00, 0x00, 0x00])
      const crc = crc16Modbus(sampleBytes, sampleBytes.length)
      expect(typeof crc).toBe('number')
      expect(crc).toBeGreaterThan(0)
    })

    it('should decode a valid 204-byte binary packet', () => {
      const buffer = new Uint8Array(204)
      buffer[0] = 0xaa
      buffer[1] = 0x55

      // FrameID = 10 (bytes 2..5)
      buffer[2] = 10
      buffer[3] = 0
      buffer[4] = 0
      buffer[5] = 0

      // Timestamp = 660 (bytes 6..9)
      buffer[6] = 0x94
      buffer[7] = 0x02
      buffer[8] = 0
      buffer[9] = 0

      // Fill 64 distances (bytes 10..137) with 500mm
      for (let i = 10; i < 138; i += 2) {
        buffer[i] = 0xf4 // 500 = 0x01F4
        buffer[i + 1] = 0x01
      }

      // Fill 64 statuses (bytes 138..201) with status 5 (Valid 100%)
      for (let i = 138; i < 202; i++) {
        buffer[i] = 5
      }

      // Compute and attach valid CRC16
      const crc = crc16Modbus(buffer, 202)
      buffer[202] = crc & 0xff
      buffer[203] = (crc >> 8) & 0xff

      const decoded = decodeToFFrame(buffer)
      expect(decoded).not.toBeNull()
      expect(decoded?.frameId).toBe(10)
      expect(decoded?.timestampMs).toBe(660)
      expect(decoded?.distances[0]).toBe(500)
      expect(decoded?.targetStatuses[0]).toBe(5)
      expect(decoded?.isValid).toBe(true)
    })

    it('should reject corrupted CRC16 packets', () => {
      const buffer = new Uint8Array(204)
      buffer[0] = 0xaa
      buffer[1] = 0x55
      buffer[50] = 0xff // Corrupt byte
      buffer[202] = 0x12
      buffer[203] = 0x34

      const decoded = decodeToFFrame(buffer)
      expect(decoded).toBeNull()
    })

    it('should flip lens spatial orientation correctly', () => {
      const distances = new Array(64).fill(0).map((_, i) => i * 10)
      const flipped = flipLensOrientation(distances)
      expect(flipped[63]).toBe(distances[0])
      expect(flipped[0]).toBe(distances[63])
    })
  })

  describe('ToFStreamFramer', () => {
    it('should frame chunked binary stream into frames', () => {
      const framer = new ToFStreamFramer()

      const buffer = new Uint8Array(204)
      buffer[0] = 0xaa
      buffer[1] = 0x55
      buffer[2] = 1 // frameId
      for (let i = 10; i < 138; i += 2) {
        buffer[i] = 0xf4
        buffer[i + 1] = 0x01
      }
      for (let i = 138; i < 202; i++) {
        buffer[i] = 5
      }
      const crc = crc16Modbus(buffer, 202)
      buffer[202] = crc & 0xff
      buffer[203] = (crc >> 8) & 0xff

      // Push in 2 chunks
      const chunk1 = buffer.slice(0, 100)
      const chunk2 = buffer.slice(100, 204)

      const frames1 = framer.pushData(chunk1)
      expect(frames1.length).toBe(0) // incomplete

      const frames2 = framer.pushData(chunk2)
      expect(frames2.length).toBe(1) // framed complete
      expect(frames2[0].frameId).toBe(1)
    })
  })

  describe('HeightMeasurementEngine', () => {
    const engine = new HeightMeasurementEngine()

    const generateFloorFrames = (count: number, expectedFloorMm = 2445): VL53L5CXFramePayload[] => {
      const frames: VL53L5CXFramePayload[] = []
      for (let f = 0; f < count; f++) {
        frames.push({
          frameId: f + 1,
          timestampMs: (f + 1) * 66,
          distances: new Array(64).fill(expectedFloorMm),
          targetStatuses: new Array(64).fill(5),
          zoneCount: 64,
          isValid: true,
        })
      }
      return frames
    }

    it('should calculate height for a 170cm standing person', () => {
      engine.calibrateFloor(generateFloorFrames(20))
      const distances = new Array(64).fill(2445)
      const targetStatuses = new Array(64).fill(5)

      // Center 4x4 zones have head distance ~745mm to ceiling (2445 - 1700 = 745mm)
      const centerIndices = [27, 28, 35, 36]
      centerIndices.forEach((idx) => {
        distances[idx] = 745
      })

      const mockFrame: VL53L5CXFramePayload = {
        frameId: 1,
        timestampMs: 66,
        distances,
        targetStatuses,
        zoneCount: 64,
        isValid: true,
      }

      engine.calculateHeight(mockFrame)
      engine.calculateHeight(mockFrame)
      const result = engine.calculateHeight(mockFrame)
      expect(result.measuredHeightCm).toBeGreaterThanOrEqual(169.0)
      expect(result.measuredHeightCm).toBeLessThanOrEqual(171.0)
      expect(result.hasHandRaised).toBe(false)
      expect(result.personCount).toBe(1)
    })

    it('should lock height after holding still across stability window', () => {
      const stableEngine = new HeightMeasurementEngine({
        expectedFloorMm: 2200,
        stabilityWindowMs: 1500,
        stabilityMinHoldMs: 1000,
      })
      stableEngine.calibrateFloor(generateFloorFrames(20, 2200))

      let lastOutput = null
      // Feed 25 frames at 15Hz (66ms interval ~ 1650ms total) with constant 170cm height
      for (let i = 0; i < 25; i++) {
        const distances = new Array(64).fill(2100)
        const targetStatuses = new Array(64).fill(5)
        ;[27, 28, 35, 36].forEach((idx) => {
          distances[idx] = 500 // 1700mm
        })

        const frame: VL53L5CXFramePayload = {
          frameId: i + 1,
          timestampMs: (i + 1) * 66,
          distances,
          targetStatuses,
          zoneCount: 64,
          isValid: true,
        }

        lastOutput = stableEngine.push(frame)
      }

      expect(lastOutput).not.toBeNull()
      expect(lastOutput?.isStable).toBe(true)
      expect(lastOutput?.state).toBe('LOCKED')
      expect(lastOutput?.guidance).toBe('LOCKED')
      expect(lastOutput?.progress).toBe(1.0)
      expect(lastOutput?.result?.heightCm).toBeCloseTo(170.0, 0)
    })

    it('should calibrate floor across frames and reject bad zones', () => {
      const calibEngine = new HeightMeasurementEngine()

      const frames: VL53L5CXFramePayload[] = []
      for (let f = 0; f < 30; f++) {
        const distances = new Array(64).fill(2250) // Floor at 2250mm
        const targetStatuses = new Array(64).fill(5)
        // Zone 0 is corrupted
        targetStatuses[0] = 0

        frames.push({
          frameId: f + 1,
          timestampMs: (f + 1) * 66,
          distances,
          targetStatuses,
          zoneCount: 64,
          isValid: true,
        })
      }

      const result = calibEngine.calibrateFloor(frames)
      expect(result).toBe('APPLIED')
      const calib = calibEngine.getBaseline()!
      expect(calib.floorOk[27]).toBe(true)
      expect(calib.floorOk[0]).toBe(false) // zone 0 rejected due to bad status
    })

    it('should reset stability buffer when frame timestamp has a gap > 300ms', () => {
      const gapEngine = new HeightMeasurementEngine()
      gapEngine.calibrateFloor(generateFloorFrames(20))

      const makeFrame = (id: number, ts: number): VL53L5CXFramePayload => {
        const distances = new Array(64).fill(2100)
        const targetStatuses = new Array(64).fill(5)
        ;[27, 28, 35, 36].forEach((idx) => {
          distances[idx] = 500
        })
        return {
          frameId: id,
          timestampMs: ts,
          distances,
          targetStatuses,
          zoneCount: 64,
          isValid: true,
        }
      }

      // Feed 15 frames normally
      for (let i = 0; i < 15; i++) {
        gapEngine.push(makeFrame(i + 1, (i + 1) * 66))
      }

      // Gap of 1000ms (> 300ms)
      const afterGapOutput = gapEngine.push(makeFrame(16, 15 * 66 + 1000))
      // Progress should drop / not be locked
      expect(afterGapOutput.isStable).toBe(false)
      expect(afterGapOutput.state).not.toBe('LOCKED')
    })
  })

  describe('ToFClient', () => {
    it('should notify subscribers when mock stream is started', (done) => {
      const client = new ToFClient()

      // Calibrate floor baseline first so engine can measure mock data
      const floorFrames: VL53L5CXFramePayload[] = []
      for (let f = 0; f < 20; f++) {
        floorFrames.push({
          frameId: f + 1,
          timestampMs: (f + 1) * 66,
          distances: new Array(64).fill(2445), // matches default expectedFloorMm
          targetStatuses: new Array(64).fill(5),
          zoneCount: 64,
          isValid: true,
        })
      }
      client.calibrateFloor(floorFrames)

      client.onHeightResult((result) => {
        if (result.measuredHeightCm > 0) {
          expect(result.measuredHeightCm).toBeGreaterThanOrEqual(169.0)
          expect(result.measuredHeightCm).toBeLessThanOrEqual(171.0)
          client.stopMockStream()
          done()
        }
      })

      client.startMockStream(170.0)
    })
  })
})
