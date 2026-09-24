/**
 * Bộ giải mã khung dữ liệu (Streaming Frame Codec) cho máy đo huyết áp BPBIO750.
 *
 * Chức năng:
 * - Tích lũy buffer byte nhị phân thô thu được từ luồng đọc Serial.
 * - Tìm kiếm ký tự phân cách marker `SYN SYN SOH` (0x16 0x16 0x01).
 * - Xác định ranh giới ETX (0x03) và bóc tách gói 16-byte hợp lệ.
 * - Kiểm tra checksum `BCC` (XOR sum mảng byte range 5..14) để loại bỏ nhiễu tín hiệu.
 *
 * @module src/core/hardware/bpbio/protocol/frame-codec.ts
 */

import { SYN, SOH, STX, ETX, MAX_FRAME_LEN } from './constants'

/** Cấu trúc 1 gói dữ liệu kết quả bóc tách được từ BPBIO750 */
export interface BpbioDataFrame {
  /** Loại định danh: 'S' (Tâm thu), 'D' (Tâm trương), 'P' (Nhịp tim) */
  identifier: string
  /** Giá trị đo được dạng số (mmHg hoặc bpm) */
  value: number
}

export class BpbioFrameCodec {
  /** Mảng buffer tích lũy byte thô nhận từ transport */
  private buffer: number[] = []

  /**
   * Nạp mảng byte thô nhận được từ Serial transport, trả về danh sách các gói hợp lệ.
   * Xử lý triệt để phân mảnh (fragmentation) và dính gói (sticky packets).
   *
   * @param chunk Uint8Array Byte thô mới nhận từ cổng Serial.
   * @return BpbioDataFrame[] Danh sách các gói dữ liệu bóc tách được.
   */
  feed(chunk: Uint8Array): BpbioDataFrame[] {
    this.buffer.push(...Array.from(chunk))
    const frames: BpbioDataFrame[] = []

    while (true) {
      // Tìm vị trí bắt đầu marker [SYN, SYN, SOH] (0x16 0x16 0x01)
      const startIdx = this.findFrameStart()
      if (startIdx === -1) {
        // Giữ lại tối đa 2 byte cuối buffer phòng trường hợp marker bị cắt đôi giữa 2 chunk
        if (this.buffer.length > 2) {
          this.buffer = this.buffer.slice(-2)
        }
        break
      }

      // Loại bỏ byte rác đứng trước marker SYN SYN SOH
      if (startIdx > 0) {
        this.buffer = this.buffer.slice(startIdx)
      }

      // Quét tìm vị trí byte ETX (0x03) trong cửa sổ quét tối đa
      const etxIdx = this.buffer.slice(5, MAX_FRAME_LEN - 1).indexOf(ETX)
      if (etxIdx === -1) {
        // Đã quá độ dài tối đa mà không thấy ETX hợp lệ -> Bỏ byte đầu, thử lại
        if (this.buffer.length >= MAX_FRAME_LEN) {
          this.buffer = this.buffer.slice(1)
          continue
        }
        break // Chưa đủ byte, chờ chunk tiếp theo
      }

      const frameLen = 5 + etxIdx + 1 + 1 // 5 byte đệm + etxIdx + 1 byte ETX + 1 byte BCC
      if (this.buffer.length < frameLen) break

      const raw = this.buffer.slice(0, frameLen)
      this.buffer = this.buffer.slice(frameLen)

      // Thử parse và kiểm tra checksum BCC
      const parsed = this.tryParseDataFrame(raw)
      if (parsed) frames.push(parsed)
    }
    return frames
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
  private tryParseDataFrame(raw: number[]): BpbioDataFrame | null {
    if (raw.length < 16) return null
    if (raw[5] !== STX || raw[14] !== ETX) return null

    // Tính checksum BCC bằng phép XOR mảng byte từ STX đến ETX
    const bcc = this.computeBcc(raw.slice(5, 15))
    if (bcc !== raw[15]) return null // Checksum sai -> Bỏ gói rác nhiễu

    const identifier = String.fromCharCode(raw[7])
    const valueStr = String.fromCharCode(raw[8], raw[9], raw[10])
    const value = Number(valueStr)
    if (Number.isNaN(value)) return null

    return { identifier, value }
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
  }
}
