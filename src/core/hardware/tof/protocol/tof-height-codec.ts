/**
 * @file tof-height-codec.ts
 * @brief Bộ giải mã & đóng gói nhị phân (Binary Codec) cho Giao thức Đo Chiều Cao ToF VL53L5CX (16 Bytes Height Packet).
 * @module src/core/hardware/tof/protocol/tof-height-codec.ts
 */

import type {
  EngineEvent,
  EngineGuidance,
  EngineState,
  HeightPacketPayload,
  VL53L5CXFramePayload,
} from '../types/tof.types'
import { decodeToFFrame } from './tof-frame-codec'

/** Byte Header 0 nhận diện bắt đầu gói nhị phân */
export const HEIGHT_MAGIC_0 = 0xaa
/** Byte Header 1 nhận diện bắt đầu gói nhị phân */
export const HEIGHT_MAGIC_1 = 0x55

/** Packet Type cho gói kết quả chiều cao: 'H' (0x48) */
export const HEIGHT_PACKET_TYPE = 0x48

/** Tổng kích thước gói Height Packet: 16 Bytes */
export const HEIGHT_PACKET_SIZE = 16

/** Kích thước gói raw frame cũ (để tương thích ngược): 204 Bytes */
export const RAW_FRAME_PACKET_SIZE = 204

/** Bảng ánh xạ State từ số nguyên uint8 sang EngineState */
const STATE_MAP: EngineState[] = ['IDLE', 'MEASURING', 'HOLD_STILL', 'LOCKED', 'TIMEOUT', 'ERROR']

/** Bảng ánh xạ Guidance từ số nguyên uint8 sang EngineGuidance */
const GUIDANCE_MAP: EngineGuidance[] = [
  'IDLE',
  'STEP_ON',
  'HOLD_STILL',
  'MEASURING',
  'LOCKED',
  'TIMEOUT',
]

/** Bảng ánh xạ Event từ số nguyên uint8 sang EngineEvent | 'NONE' */
const EVENT_MAP: (EngineEvent | 'NONE')[] = [
  'NONE',
  'PERSON_PRESENT',
  'LOCKED',
  'PERSON_LEFT',
  'TIMEOUT',
]

/**
 * Tính toán mã kiểm tra lỗi CRC16-Modbus (Đa thức 0xA001, Giá trị khởi tạo 0xFFFF).
 * @param data Mảng byte đầu vào
 * @param length Số byte tính toán
 * @return Giá trị checksum uint16
 */
export function crc16Modbus(data: Uint8Array, length: number): number {
  let crc = 0xffff
  for (let i = 0; i < length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >> 1) ^ 0xa001
      } else {
        crc = crc >> 1
      }
    }
  }
  return crc & 0xffff
}

/**
 * Giải mã mảng byte nhị phân 16 Bytes thành struct `HeightPacketPayload`.
 * @param buffer Mảng Uint8Array (tối thiểu 16 bytes)
 * @return HeightPacketPayload nếu hợp lệ và khớp CRC16, null nếu lỗi
 */
export function decodeHeightPacket(buffer: Uint8Array): HeightPacketPayload | null {
  if (buffer.length < HEIGHT_PACKET_SIZE) return null

  if (
    buffer[0] !== HEIGHT_MAGIC_0 ||
    buffer[1] !== HEIGHT_MAGIC_1 ||
    buffer[2] !== HEIGHT_PACKET_TYPE
  ) {
    return null
  }

  // Đối chiếu mã CRC16-Modbus trên 14 byte đầu
  const expectedCrc = buffer[14] | (buffer[15] << 8)
  const actualCrc = crc16Modbus(buffer, 14)
  if (expectedCrc !== actualCrc) {
    return null
  }

  const stateCode = buffer[3]
  const guideCode = buffer[4]
  const state: EngineState = STATE_MAP[stateCode] ?? 'IDLE'
  const guidance: EngineGuidance = GUIDANCE_MAP[guideCode] ?? 'IDLE'

  const lockedHeightMm = buffer[5] | (buffer[6] << 8)
  const instantHeightMm = buffer[7] | (buffer[8] << 8)
  const progress = Math.min(1.0, Math.max(0.0, buffer[9] / 100))
  const confidence = Math.min(1.0, Math.max(0.0, buffer[10] / 100))
  const headZoneCount = buffer[11]

  const eventIndex = buffer[12]
  const event = EVENT_MAP[eventIndex] ?? 'NONE'

  const flags = buffer[13]
  const isStable = (flags & 0x01) !== 0
  const hasPerson = (flags & 0x02) !== 0
  const needsRecalibration = (flags & 0x04) !== 0

  return {
    header0: buffer[0],
    header1: buffer[1],
    packetType: buffer[2],
    state,
    guidance,
    lockedHeightMm,
    instantHeightMm,
    progress,
    confidence,
    headZoneCount,
    event,
    isStable,
    hasPerson,
    needsRecalibration,
    timestampMs: Date.now(),
  }
}

/**
 * Đóng gói struct `HeightPacketPayload` thành mảng nhị phân 16 Bytes (phục vụ test và mock).
 */
export function encodeHeightPacket(payload: Partial<HeightPacketPayload>): Uint8Array {
  const buf = new Uint8Array(HEIGHT_PACKET_SIZE)
  buf[0] = HEIGHT_MAGIC_0
  buf[1] = HEIGHT_MAGIC_1
  buf[2] = HEIGHT_PACKET_TYPE

  const stateIdx = STATE_MAP.indexOf(payload.state ?? 'IDLE')
  buf[3] = stateIdx >= 0 ? stateIdx : 0

  const guideIdx = GUIDANCE_MAP.indexOf(payload.guidance ?? 'IDLE')
  buf[4] = guideIdx >= 0 ? guideIdx : 0

  const lockedMm = payload.lockedHeightMm ?? 0
  buf[5] = lockedMm & 0xff
  buf[6] = (lockedMm >> 8) & 0xff

  const instantMm = payload.instantHeightMm ?? 0
  buf[7] = instantMm & 0xff
  buf[8] = (instantMm >> 8) & 0xff

  buf[9] = Math.round((payload.progress ?? 0) * 100)
  buf[10] = Math.round((payload.confidence ?? 0) * 100)
  buf[11] = payload.headZoneCount ?? 0

  const eventIdx = EVENT_MAP.indexOf((payload.event as any) ?? 'NONE')
  buf[12] = eventIdx >= 0 ? eventIdx : 0

  let flags = 0
  if (payload.isStable) flags |= 0x01
  if (payload.hasPerson) flags |= 0x02
  if (payload.needsRecalibration) flags |= 0x04
  buf[13] = flags

  const crc = crc16Modbus(buf, 14)
  buf[14] = crc & 0xff
  buf[15] = (crc >> 8) & 0xff

  return buf
}

/**
 * Tạo gói lệnh PING gửi từ Kiosk xuống ESP32 (4 Bytes: 0xAA 0x55 'P' 'G')
 */
export function encodePingCommand(): Uint8Array {
  return new Uint8Array([HEIGHT_MAGIC_0, HEIGHT_MAGIC_1, 0x50, 0x47])
}

/**
 * Tạo gói lệnh RESET phiên đo gửi xuống ESP32 (4 Bytes: 0xAA 0x55 'R' 'S')
 */
export function encodeResetCommand(): Uint8Array {
  return new Uint8Array([HEIGHT_MAGIC_0, HEIGHT_MAGIC_1, 0x52, 0x53])
}

/**
 * Tạo gói lệnh Bật/Tắt chế độ Debug Raw 204B gửi xuống ESP32 (5 Bytes: 0xAA 0x55 'D' 'B' [0/1])
 */
export function encodeDebugRawCommand(enable: boolean): Uint8Array {
  return new Uint8Array([HEIGHT_MAGIC_0, HEIGHT_MAGIC_1, 0x44, 0x42, enable ? 1 : 0])
}

/**
 * Tạo gói lệnh CẤU HÌNH THAM SỐ CONFIG gửi từ Kiosk xuống ESP32 (18 Bytes).
 * Bao gồm: Header 4B ("AACF") + 2B expectedFloorMm + 2B platformHeightMm + 4B gainScale + 4B offsetMm + 2B CRC.
 */
export function encodeConfigCommand(cfg: {
  expectedFloorMm: number
  platformHeightMm: number
  gainScale?: number
  offsetMm?: number
}): Uint8Array {
  const buf = new Uint8Array(18)
  buf[0] = HEIGHT_MAGIC_0
  buf[1] = HEIGHT_MAGIC_1
  buf[2] = 0x43 // 'C'
  buf[3] = 0x46 // 'F'

  // expectedFloorMm (uint16 LE)
  buf[4] = cfg.expectedFloorMm & 0xff
  buf[5] = (cfg.expectedFloorMm >> 8) & 0xff

  // platformHeightMm (uint16 LE)
  buf[6] = cfg.platformHeightMm & 0xff
  buf[7] = (cfg.platformHeightMm >> 8) & 0xff

  // gainScale (float32 LE)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  view.setFloat32(8, cfg.gainScale ?? 1.0, true)

  // offsetMm (float32 LE)
  view.setFloat32(12, cfg.offsetMm ?? 0.0, true)

  // Tính CRC16 trên 16 bytes đầu
  const crc = crc16Modbus(buf, 16)
  buf[16] = crc & 0xff
  buf[17] = (crc >> 8) & 0xff

  return buf
}

/**
 * Bộ tách khung thông minh (Stream Framer) cho Module Đo Chiều Cao.
 * Nhận chuỗi chunk byte liên tục từ USB Serial, tự động nhận diện gói 16 Bytes (Height Result),
 * gói phản hồi 4 Bytes (PONG/CONFIG_OK) và gói 204 Bytes (Raw Frame nếu có).
 */
export class HeightStreamFramer {
  private buffer: Uint8Array = new Uint8Array(0)
  private onPongCallback?: () => void
  private onConfigOkCallback?: () => void
  private onRawFrameCallback?: (frame: VL53L5CXFramePayload) => void

  constructor(callbacks?: {
    onPong?: () => void
    onConfigOk?: () => void
    onRawFrame?: (frame: VL53L5CXFramePayload) => void
  }) {
    this.onPongCallback = callbacks?.onPong
    this.onConfigOkCallback = callbacks?.onConfigOk
    this.onRawFrameCallback = callbacks?.onRawFrame
  }

  /**
   * Đẩy chunk dữ liệu mới vào bộ đệm và giải mã tất cả gói Height Packet hoàn chỉnh.
   */
  public pushData(chunk: Uint8Array): HeightPacketPayload[] {
    const combined = new Uint8Array(this.buffer.length + chunk.length)
    combined.set(this.buffer, 0)
    combined.set(chunk, this.buffer.length)
    this.buffer = combined

    const results: HeightPacketPayload[] = []
    let cursor = 0

    while (cursor <= this.buffer.length - 4) {
      // Tìm magic header 0xAA 0x55
      if (this.buffer[cursor] !== HEIGHT_MAGIC_0 || this.buffer[cursor + 1] !== HEIGHT_MAGIC_1) {
        cursor++
        continue
      }

      const byte2 = this.buffer[cursor + 2]
      const byte3 = this.buffer[cursor + 3]

      // 1. Phản hồi PONG: 0xAA 0x55 'O' 'K' (4 Bytes)
      if (byte2 === 0x4f && byte3 === 0x4b) {
        if (this.onPongCallback) this.onPongCallback()
        cursor += 4
        continue
      }

      // 2. Phản hồi CONFIG_OK: 0xAA 0x55 'C' 'K' (4 Bytes)
      if (byte2 === 0x43 && byte3 === 0x4b) {
        if (this.onConfigOkCallback) this.onConfigOkCallback()
        cursor += 4
        continue
      }

      // 3. Gói Height Packet: 0xAA 0x55 'H' (16 Bytes)
      if (byte2 === HEIGHT_PACKET_TYPE) {
        if (cursor + HEIGHT_PACKET_SIZE > this.buffer.length) {
          // Chưa nhận đủ 16 bytes, giữ lại chờ chunk tiếp theo
          break
        }

        const packetSlice = this.buffer.subarray(cursor, cursor + HEIGHT_PACKET_SIZE)
        const decoded = decodeHeightPacket(packetSlice)
        if (decoded) {
          results.push(decoded)
          cursor += HEIGHT_PACKET_SIZE
          continue
        } else {
          // Checksum lỗi hoặc sai định dạng, trượt 1 byte
          cursor++
          continue
        }
      }

      // 4. Gói Raw Frame cũ (204 Bytes) - Chế độ Debug Heatmap
      if (cursor + RAW_FRAME_PACKET_SIZE <= this.buffer.length) {
        const rawSlice = this.buffer.subarray(cursor, cursor + RAW_FRAME_PACKET_SIZE)
        const decodedRaw = decodeToFFrame(rawSlice)
        if (decodedRaw) {
          if (this.onRawFrameCallback) this.onRawFrameCallback(decodedRaw)
          cursor += RAW_FRAME_PACKET_SIZE
          continue
        }
      }

      // Không khớp loại gói tin nào, trượt cursor
      cursor++
    }

    // Giữ lại phần dư chưa parse xong
    this.buffer = this.buffer.slice(cursor)

    // Bảo vệ tràn bộ đệm nếu nhận quá nhiều dữ liệu rác (giới hạn 1KB)
    if (this.buffer.length > 1024) {
      this.buffer = this.buffer.slice(this.buffer.length - 256)
    }

    return results
  }

  /** Reset làm sạch bộ đệm */
  public reset(): void {
    this.buffer = new Uint8Array(0)
  }
}
