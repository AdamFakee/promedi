/**
 * @file tof-frame-codec.ts
 * @brief Bộ mã hóa/giải mã Giao thức Nhị phân 204 Bytes và xử lý phân mảnh luồng USB Serial cho cảm biến VL53L5CX.
 * @module src/core/hardware/tof/protocol/tof-frame-codec.ts
 *
 * Cấu trúc gói tin 204 Bytes (Little Endian):
 * - Bytes 0..1  : Header (0xAA, 0x55) [2 Bytes]
 * - Bytes 2..5  : Frame ID (uint32_t) [4 Bytes]
 * - Bytes 6..9  : Timestamp (uint32_t ms) [4 Bytes]
 * - Bytes 10..137: Mảng 64 khoảng cách (64 x uint16_t mm) [128 Bytes]
 * - Bytes 138..201: Mảng 64 Target Status (64 x uint8_t) [64 Bytes]
 * - Bytes 202..203: Checksum CRC16-Modbus (uint16_t) [2 Bytes]
 */

import type { VL53L5CXFramePayload } from '../types/tof.types'

/** Kích thước gói tin nhị phân cố định: 204 Bytes */
export const TOF_PACKET_SIZE = 204

/** Byte Header 0 nhận diện đầu gói tin (0xAA) */
export const TOF_HEADER_0 = 0xaa

/** Byte Header 1 nhận diện đầu gói tin (0x55) */
export const TOF_HEADER_1 = 0x55

/** Số vùng đo trong ma trận 8x8 */
export const TOF_ZONE_COUNT = 64

/** Lệnh PING Handshake gửi từ Kiosk xuống ESP32: 0xAA 0x55 'P' 'G' (4 Bytes) */
export const TOF_PING_COMMAND = new Uint8Array([0xaa, 0x55, 0x50, 0x47])

/** Phản hồi PONG Handshake từ ESP32 lên Kiosk: 0xAA 0x55 'O' 'K' (4 Bytes) */
export const TOF_PONG_RESPONSE = new Uint8Array([0xaa, 0x55, 0x4f, 0x4b])

/**
 * Thuật toán tính toán mã kiểm tra lỗi CRC16-Modbus (khớp 100% với firmware C++ ESP32).
 * @param data Mảng byte dữ liệu đầu vào
 * @param length Độ dài cần tính toán (202 bytes trước checksum)
 * @return Mã CRC16 dạng số nguyên uint16
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
 * Giải mã mảng 204 bytes nhị phân từ USB Serial thành struct payload VL53L5CXFramePayload.
 * @param buffer Mảng Uint8Array 204 bytes đầu vào
 * @return Frame payload nếu khớp Header (0xAA 0x55) & mã CRC16 Modbus, null nếu dữ liệu bị lỗi
 */
export function decodeToFFrame(buffer: Uint8Array): VL53L5CXFramePayload | null {
  if (buffer.length < TOF_PACKET_SIZE) {
    return null
  }

  // 1. Kiểm tra 2 bytes Header 0xAA 0x55
  if (buffer[0] !== TOF_HEADER_0 || buffer[1] !== TOF_HEADER_1) {
    return null
  }

  // 2. Kiểm tra mã CRC16 Modbus (Byte 202 & Byte 203)
  const expectedCrc = buffer[202] | (buffer[203] << 8)
  const actualCrc = crc16Modbus(buffer, 202)

  if (expectedCrc !== actualCrc) {
    return null
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // 3. Đọc Frame ID (4 bytes Little Endian)
  const frameId = view.getUint32(2, true)

  // 4. Đọc Timestamp (4 bytes Little Endian)
  const timestampMs = view.getUint32(6, true)

  // 5. Đọc 64 Khoảng cách (128 bytes Little Endian, mỗi phần tử 2 bytes)
  const distances: number[] = new Array(TOF_ZONE_COUNT)
  let offset = 10
  for (let i = 0; i < TOF_ZONE_COUNT; i++) {
    distances[i] = view.getUint16(offset, true)
    offset += 2
  }

  // 6. Đọc 64 Target Statuses (64 bytes)
  const targetStatuses: number[] = new Array(TOF_ZONE_COUNT)
  for (let i = 0; i < TOF_ZONE_COUNT; i++) {
    targetStatuses[i] = buffer[offset++]
  }

  return {
    frameId,
    timestampMs,
    distances,
    targetStatuses,
    zoneCount: TOF_ZONE_COUNT,
    isValid: true,
  }
}

/**
 * Chuyển đổi tọa độ không gian đảo thấu kính quang học Rx (Zone 0 góc trên-trái <-> Zone 63 góc dưới-phải).
 * @param distances Mảng 64 khoảng cách mm nguồn
 * @return Mảng 64 khoảng cách mm đã được quay 180 độ
 */
export function flipLensOrientation(distances: number[]): number[] {
  const flipped = new Array(TOF_ZONE_COUNT)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const srcIdx = r * 8 + c
      const dstIdx = (7 - r) * 8 + (7 - c)
      flipped[dstIdx] = distances[srcIdx]
    }
  }
  return flipped
}

/**
 * Lớp ToFStreamFramer chịu trách nhiệm gom dồn buffer và cắt gói nhị phân 204B khi nhận dữ liệu phân mảnh từ Android USB Serial Emitter.
 */
export class ToFStreamFramer {
  /** Bộ đệm lưu trữ dữ liệu byte chưa đủ gói 204B */
  private buffer: Uint8Array = new Uint8Array(0)

  /**
   * Đẩy chunk byte mới nhận được từ Serial vào buffer và giải mã các gói 204B hoàn chỉnh.
   * @param chunk Mảng byte nhận từ sự kiện onData USB Serial
   * @return Danh sách các VL53L5CXFramePayload giải mã thành công
   */
  public pushData(chunk: Uint8Array): VL53L5CXFramePayload[] {
    const combined = new Uint8Array(this.buffer.length + chunk.length)
    combined.set(this.buffer, 0)
    combined.set(chunk, this.buffer.length)
    this.buffer = combined

    const frames: VL53L5CXFramePayload[] = []

    while (this.buffer.length >= 2) {
      // Tìm vị trí Header 0xAA 0x55 trong toàn bộ buffer
      let headerIdx = -1
      for (let i = 0; i < this.buffer.length - 1; i++) {
        if (this.buffer[i] === TOF_HEADER_0 && this.buffer[i + 1] === TOF_HEADER_1) {
          headerIdx = i
          break
        }
      }

      if (headerIdx === -1) {
        // Giữ lại byte cuối nếu có thể là 0xAA bắt đầu gói tiếp theo
        if (this.buffer[this.buffer.length - 1] === TOF_HEADER_0) {
          this.buffer = this.buffer.slice(this.buffer.length - 1)
        } else {
          this.buffer = new Uint8Array(0)
        }
        break
      }

      // Bỏ các byte rác đứng trước Header 0xAA 0x55
      if (headerIdx > 0) {
        this.buffer = this.buffer.slice(headerIdx)
      }

      // Chưa đủ 204 bytes cho một gói tin hoàn chỉnh -> chờ chunk tiếp theo
      if (this.buffer.length < TOF_PACKET_SIZE) {
        break
      }

      // Cắt ứng viên gói 204 bytes
      const packetBytes = this.buffer.slice(0, TOF_PACKET_SIZE)
      const decoded = decodeToFFrame(packetBytes)

      if (decoded) {
        frames.push(decoded)
        this.buffer = this.buffer.slice(TOF_PACKET_SIZE)
      } else {
        // CRC không khớp hoặc dữ liệu sai -> bỏ 2 byte header giả và tiếp tục tìm tiếp
        this.buffer = this.buffer.slice(2)
      }
    }

    return frames
  }

  /** Reset xóa sạch bộ đệm phân mảnh */
  public reset(): void {
    this.buffer = new Uint8Array(0)
  }
}

/**
 * Định dạng một VL53L5CXFramePayload 8x8 thành chuỗi bảng ma trận ASCII trực quan để debug / log.
 * @param frame Frame payload dữ liệu 8x8
 * @return Chuỗi bảng ma trận ASCII hiển thị đầy đủ 64 vùng đo
 */
export function formatToFFrame(frame: VL53L5CXFramePayload): string {
  let minDist = Infinity
  let maxDist = -Infinity
  let validCount = 0

  for (let i = 0; i < frame.zoneCount; i++) {
    const d = frame.distances[i]
    const s = frame.targetStatuses[i]
    if (s === 5 || s === 6 || s === 9) {
      validCount++
      if (d < minDist) minDist = d
      if (d > maxDist) maxDist = d
    }
  }

  const centerDist = frame.distances[27] ?? 0
  const header = `=== [VL53L5CX FRAME #${frame.frameId}] TS: ${frame.timestampMs}ms | Valid: ${validCount}/${frame.zoneCount} | Min: ${minDist === Infinity ? 0 : minDist}mm | Max: ${maxDist === -Infinity ? 0 : maxDist}mm | Center: ${centerDist}mm ===`
  const separator = '+------+------+------+------+------+------+------+------+'

  const rows: string[] = [header, separator]
  for (let r = 0; r < 8; r++) {
    const cells: string[] = []
    for (let c = 0; c < 8; c++) {
      const idx = r * 8 + c
      const d = frame.distances[idx] ?? 0
      cells.push(` ${String(d).padStart(4, ' ')} `)
    }
    rows.push(`|${cells.join('|')}|`)
    rows.push(separator)
  }

  return rows.join('\n')
}
