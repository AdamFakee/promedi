/**
 * @file tof-height.test.ts
 * @brief Bộ kiểm thử đơn vị cho ToF Height Measurement Module (16-Byte Binary Protocol & Client).
 */

import { ToFClient } from '../client/tof-client'
import {
  crc16Modbus,
  decodeHeightPacket,
  encodeConfigCommand,
  encodeHeightPacket,
  encodePingCommand,
  encodeResetCommand,
  HEIGHT_PACKET_SIZE,
  HeightStreamFramer,
} from '../protocol/tof-height-codec'
import type { HeightPacketPayload } from '../types/tof.types'

describe('ToF Height Measurement Module (16-Byte Protocol & Client)', () => {
  describe('CRC16 Modbus & Serialization', () => {
    it('should compute valid CRC16-Modbus checksum', () => {
      const data = new Uint8Array([0xaa, 0x55, 0x48, 0x03, 0x04])
      const crc = crc16Modbus(data, data.length)
      expect(typeof crc).toBe('number')
      expect(crc).toBeGreaterThan(0)
    })

    it('should encode and decode a valid 16-byte Height Packet', () => {
      const payload: Partial<HeightPacketPayload> = {
        state: 'LOCKED',
        guidance: 'LOCKED',
        lockedHeightMm: 1754, // 175.4 cm
        instantHeightMm: 1755,
        progress: 1.0,
        confidence: 0.98,
        headZoneCount: 3,
        event: 'LOCKED',
        isStable: true,
        hasPerson: true,
        needsRecalibration: false,
      }

      const encoded = encodeHeightPacket(payload)
      expect(encoded.length).toBe(HEIGHT_PACKET_SIZE)
      expect(encoded[0]).toBe(0xaa)
      expect(encoded[1]).toBe(0x55)
      expect(encoded[2]).toBe(0x48) // 'H'

      const decoded = decodeHeightPacket(encoded)
      expect(decoded).not.toBeNull()
      expect(decoded?.state).toBe('LOCKED')
      expect(decoded?.guidance).toBe('LOCKED')
      expect(decoded?.lockedHeightMm).toBe(1754)
      expect(decoded?.instantHeightMm).toBe(1755)
      expect(decoded?.progress).toBe(1.0)
      expect(decoded?.confidence).toBe(0.98)
      expect(decoded?.headZoneCount).toBe(3)
      expect(decoded?.event).toBe('LOCKED')
      expect(decoded?.isStable).toBe(true)
      expect(decoded?.hasPerson).toBe(true)
    })

    it('should reject packet with corrupted CRC', () => {
      const encoded = encodeHeightPacket({
        state: 'MEASURING',
        instantHeightMm: 1680,
      })

      // Làm sai lệch byte dữ liệu
      encoded[5] ^= 0xff

      const decoded = decodeHeightPacket(encoded)
      expect(decoded).toBeNull()
    })
  })

  describe('Commands Encoding (Kiosk -> ESP32)', () => {
    it('should encode PING command (4 bytes)', () => {
      const ping = encodePingCommand()
      expect(ping.length).toBe(4)
      expect(ping[0]).toBe(0xaa)
      expect(ping[1]).toBe(0x55)
      expect(ping[2]).toBe(0x50) // 'P'
      expect(ping[3]).toBe(0x47) // 'G'
    })

    it('should encode RESET command (4 bytes)', () => {
      const reset = encodeResetCommand()
      expect(reset.length).toBe(4)
      expect(reset[2]).toBe(0x52) // 'R'
      expect(reset[3]).toBe(0x53) // 'S'
    })

    it('should encode CONFIG command (18 bytes with valid CRC16)', () => {
      const cfg = encodeConfigCommand({
        expectedFloorMm: 2220,
        platformHeightMm: 96,
        gainScale: 1.02,
        offsetMm: -5.0,
      })

      expect(cfg.length).toBe(18)
      expect(cfg[0]).toBe(0xaa)
      expect(cfg[1]).toBe(0x55)
      expect(cfg[2]).toBe(0x43) // 'C'
      expect(cfg[3]).toBe(0x46) // 'F'

      // Check CRC of first 16 bytes
      const expectedCrc = cfg[16] | (cfg[17] << 8)
      const actualCrc = crc16Modbus(cfg, 16)
      expect(expectedCrc).toBe(actualCrc)
    })
  })

  describe('HeightStreamFramer', () => {
    it('should extract packets from fragmented chunks', () => {
      const framer = new HeightStreamFramer()

      const p1 = encodeHeightPacket({ state: 'MEASURING', instantHeightMm: 1700, progress: 0.4 })
      const p2 = encodeHeightPacket({ state: 'LOCKED', lockedHeightMm: 1712, progress: 1.0 })

      // Gom 2 gói lại và cắt đôi thành 2 chunks
      const combined = new Uint8Array(p1.length + p2.length)
      combined.set(p1, 0)
      combined.set(p2, p1.length)

      const chunk1 = combined.subarray(0, 10)
      const chunk2 = combined.subarray(10)

      const res1 = framer.pushData(chunk1)
      expect(res1.length).toBe(0) // Chưa đủ gói đầu

      const res2 = framer.pushData(chunk2)
      expect(res2.length).toBe(2) // Đã giải mã đủ cả 2 gói
      expect(res2[0].instantHeightMm).toBe(1700)
      expect(res2[1].lockedHeightMm).toBe(1712)
      expect(res2[1].state).toBe('LOCKED')
    })

    it('should handle PONG and CONFIG_OK handshake replies', () => {
      let pongReceived = false
      let configOkReceived = false

      const framer = new HeightStreamFramer({
        onPong: () => {
          pongReceived = true
        },
        onConfigOk: () => {
          configOkReceived = true
        },
      })

      // Chuỗi dữ liệu gồm byte rác + PONG (AA 55 OK) + byte rác + CONFIG_OK (AA 55 CK)
      const stream = new Uint8Array([
        0x00, 0xff, 0xaa, 0x55, 0x4f, 0x4b, 0x12, 0xaa, 0x55, 0x43, 0x4b, 0x99,
      ])

      framer.pushData(stream)
      expect(pongReceived).toBe(true)
      expect(configOkReceived).toBe(true)
    })
  })

  describe('ToFClient High-level API', () => {
    it('should process binary chunk and notify height result listeners', (done) => {
      const client = new ToFClient({ expectedFloorMm: 2220, platformHeightMm: 96 })

      client.onHeightResult((result) => {
        expect(result.state).toBe('LOCKED')
        expect(result.measuredHeightCm).toBe(172.5)
        expect(result.result?.heightCm).toBe(172.5)
        expect(result.isStable).toBe(true)
        expect(result.confidence).toBe(0.99)
        done()
      })

      const packet = encodeHeightPacket({
        state: 'LOCKED',
        guidance: 'LOCKED',
        lockedHeightMm: 1725, // 172.5 cm
        instantHeightMm: 1725,
        progress: 1.0,
        confidence: 0.99,
        isStable: true,
        hasPerson: true,
      })

      client.processChunk(packet)
    })

    it('should run mock stream and emit progressive height results', (done) => {
      const client = new ToFClient()

      let count = 0
      const unsubscribe = client.onHeightResult((res) => {
        count++
        if (count >= 3) {
          unsubscribe()
          client.stopMockStream()
          expect(res.personCount).toBe(1)
          expect(res.instantHeightCm).toBeGreaterThan(160)
          done()
        }
      })

      client.startMockStream(170.0)
    })
  })
})
