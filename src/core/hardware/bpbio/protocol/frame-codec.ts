/**
 * Bộ giải mã khung dữ liệu & sự kiện (Streaming Frame & Event Codec) cho BPBIO320/750.
 *
 * Chức năng:
 * - Tích lũy buffer byte nhị phân thô thu được từ luồng đọc Serial.
 * - Tìm kiếm ký tự phân cách marker `SYN SYN SOH` (0x16 0x16 0x01).
 * - Bóc tách linh hoạt cả 2 loại khung truyền:
 *   1. Khung 16-byte đơn lẻ (gói chỉ số S, D, hoặc P).
 *   2. Khung 64-byte broadcast sự kiện 3 trường S, D, P (Protocol Spec V4.0).
 * - Kiểm tra checksum `BCC` (XOR sum) loại bỏ nhiễu tín hiệu.
 *
 * @module src/core/hardware/bpbio/protocol/frame-codec.ts
 */

import type { BpbioEvent } from '../types/bpbio.types'
import { ETX, EVENT_FRAME_LEN, FRAME_64_OFFSETS, MAX_FRAME_LEN, SOH, STX, SYN } from './constants'
import { parseBpbioEventPayload } from './event-parser'

/** Cấu trúc 1 gói dữ liệu kết quả bóc tách được từ BPBIO750 */
export interface BpbioDataFrame {
  /** Loại định danh: 'S' (Tâm thu), 'D' (Tâm trương), 'P' (Nhịp tim) */
  identifier: string
  /** Giá trị đo được dạng số (mmHg hoặc bpm) */
  value: number
}

/** Kết quả bóc tách đầy đủ gồm cả mảng DataFrames và danh sách Events */
export interface BpbioDecodeResult {
  frames: BpbioDataFrame[]
  events: BpbioEvent[]
}

export class BpbioFrameCodec {
  /** Mảng buffer tích lũy byte thô nhận từ transport */
  private buffer: number[] = []
  /** Danh sách sự kiện tích lũy ở lượt parse gần nhất */
  private lastEvents: BpbioEvent[] = []

  /**
   * Nạp mảng byte thô nhận được từ Serial transport, trả về danh sách các gói hợp lệ.
   * Đồng thời lưu danh sách BpbioEvent vừa trích xuất vào `lastEvents`.
   *
   * @param chunk Uint8Array Byte thô mới nhận từ cổng Serial.
   * @return BpbioDataFrame[] Danh sách các gói dữ liệu bóc tách được.
   */
  feed(chunk: Uint8Array): BpbioDataFrame[] {
    const res = this.feedWithEvents(chunk)
    return res.frames
  }

  /**
   * Nạp mảng byte thô và trả về đồng thời cả BpbioDataFrame[] và BpbioEvent[].
   *
   * @param chunk Uint8Array Byte thô mới nhận từ cổng Serial.
   * @return BpbioDecodeResult Kết quả bóc tách gồm frames và events.
   */
  feedWithEvents(chunk: Uint8Array): BpbioDecodeResult {
    this.buffer.push(...Array.from(chunk))
    const frames: BpbioDataFrame[] = []
    const events: BpbioEvent[] = []

    while (true) {
      // Tìm vị trí bắt đầu marker [SYN, SYN, SOH] (0x16 0x16 0x01)
      const startIdx = this.findFrameStart()
      if (startIdx === -1) {
        if (this.buffer.length > 2) {
          this.buffer = this.buffer.slice(-2)
        }
        break
      }

      // Loại bỏ byte rác đứng trước marker SYN SYN SOH
      if (startIdx > 0) {
        this.buffer = this.buffer.slice(startIdx)
      }

      // 1. Kiểm tra xem có đủ 64 byte cho gói tin broadcast sự kiện không
      if (this.buffer.length >= EVENT_FRAME_LEN) {
        const raw64 = this.buffer.slice(0, EVENT_FRAME_LEN)
        const parsed64 = this.tryParse64ByteEventFrame(raw64)
        if (parsed64) {
          events.push(parsed64.event)
          frames.push(...parsed64.frames)
          this.buffer = this.buffer.slice(EVENT_FRAME_LEN)
          continue
        }
      }

      // 2. Thử bóc tách khung 16-byte đơn lẻ
      if (this.buffer.length >= MAX_FRAME_LEN) {
        const parsed16 = this.tryParse16ByteFrame(this.buffer.slice(0, MAX_FRAME_LEN))
        if (parsed16) {
          frames.push(parsed16)
          this.buffer = this.buffer.slice(MAX_FRAME_LEN)
          continue
        }
      }

      // 3. Nếu buffer >= 64 byte mà không thể parse cả 64-byte lẫn 16-byte -> Bỏ 1 byte đầu để tìm marker tiếp theo
      if (this.buffer.length >= EVENT_FRAME_LEN) {
        this.buffer = this.buffer.slice(1)
        continue
      }

      // Chưa đủ 64 byte, chờ thêm chunk tiếp theo từ Serial stream
      break
    }

    this.lastEvents = events
    return { frames, events }
  }

  /** Lấy danh sách sự kiện trích xuất được từ lượt feed gần nhất */
  getLastEvents(): BpbioEvent[] {
    return this.lastEvents
  }

  /**
   * Tìm vị trí xuất hiện của bộ ba byte marker SYN SYN SOH (0x16 0x16 0x01).
   */
  private findFrameStart(): number {
    for (let i = 0; i <= this.buffer.length - 3; i++) {
      if (this.buffer[i] === SYN && this.buffer[i + 1] === SYN && this.buffer[i + 2] === SOH) {
        return i
      }
    }
    return -1
  }

  /**
   * Bóc tách và kiểm tra tính hợp lệ của mảng 16 byte dữ liệu.
   */
  private tryParse16ByteFrame(raw: number[]): BpbioDataFrame | null {
    if (raw.length < 16) return null
    if (raw[5] !== STX || raw[14] !== ETX) return null

    const bcc5 = this.computeBcc(raw.slice(5, 15))
    const bcc0 = this.computeBcc(raw.slice(0, 15))
    if (bcc5 !== raw[15] && bcc0 !== raw[15]) return null

    const identifier = String.fromCharCode(raw[7])
    const valueStr = String.fromCharCode(raw[8], raw[9], raw[10])
    const value = Number(valueStr)
    if (Number.isNaN(value)) return null

    return { identifier, value }
  }

  /**
   * Bóc tách và kiểm tra tính hợp lệ của mảng 64 byte gói tin broadcast sự kiện.
   */
  private tryParse64ByteEventFrame(
    raw: number[],
  ): { event: BpbioEvent; frames: BpbioDataFrame[] } | null {
    if (raw.length < 64) return null

    // Kiểm tra cấu trúc khung 64 byte (Header STX=5, 'S'=33, 'D'=43, 'P'=48, ETX=62)
    if (
      raw[FRAME_64_OFFSETS.STX] !== STX ||
      raw[FRAME_64_OFFSETS.S_IDENTIFIER] !== 0x53 || // 'S'
      raw[FRAME_64_OFFSETS.D_IDENTIFIER] !== 0x44 || // 'D'
      raw[FRAME_64_OFFSETS.P_IDENTIFIER] !== 0x50 || // 'P'
      raw[FRAME_64_OFFSETS.ETX] !== ETX
    ) {
      return null
    }

    // Trích xuất 3 chuỗi payload 3-byte từ các vị trí S, D, P
    const rawS = String.fromCharCode(
      raw[FRAME_64_OFFSETS.S_PAYLOAD_START],
      raw[FRAME_64_OFFSETS.S_PAYLOAD_START + 1],
      raw[FRAME_64_OFFSETS.S_PAYLOAD_START + 2],
    )

    const rawD = String.fromCharCode(
      raw[FRAME_64_OFFSETS.D_PAYLOAD_START],
      raw[FRAME_64_OFFSETS.D_PAYLOAD_START + 1],
      raw[FRAME_64_OFFSETS.D_PAYLOAD_START + 2],
    )

    const rawP = String.fromCharCode(
      raw[FRAME_64_OFFSETS.P_PAYLOAD_START],
      raw[FRAME_64_OFFSETS.P_PAYLOAD_START + 1],
      raw[FRAME_64_OFFSETS.P_PAYLOAD_START + 2],
    )

    // Parse đối tượng sự kiện
    const event = parseBpbioEventPayload(rawS, rawD, rawP)

    // Nếu là sự kiện đo hoàn tất (S, D, P là số), sinh danh sách BpbioDataFrame tương ứng
    const frames: BpbioDataFrame[] = []
    if (
      event.type === 'MEASUREMENT_COMPLETED' &&
      event.payload.systolic != null &&
      event.payload.diastolic != null &&
      event.payload.pulse != null
    ) {
      frames.push({ identifier: 'S', value: event.payload.systolic })
      frames.push({ identifier: 'D', value: event.payload.diastolic })
      frames.push({ identifier: 'P', value: event.payload.pulse })
    }

    return { event, frames }
  }

  /**
   * Thuật toán tính checksum BCC (Block Check Character) bằng phép XOR tích lũy.
   */
  private computeBcc(bytes: number[]): number {
    return bytes.reduce((acc, b) => acc ^ b, 0)
  }

  /** Làm sạch bộ đệm tạm thời */
  reset(): void {
    this.buffer = []
    this.lastEvents = []
  }
}
