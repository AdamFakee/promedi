/**
 * Bộ mã hóa / giải mã khung truyền (Frame Codec) an toàn cho luồng dữ liệu TCP Socket.
 * @module src/core/hardware/inbody/protocol/frame-codec.ts
 */

import { STX, ETX, ESC } from './constants'

/** Khung truyền đã được giải mã từ byte thô */
export interface DecodedFrame {
  /** Mã lệnh (Byte Hex) */
  command: number
  /** Mảng các trường dữ liệu ASCII phân cách bởi 0x1B */
  fields: string[]
}

export class FrameCodec {
  private buffer: number[] = []

  /**
   * Đóng gói lệnh gửi đi dưới dạng mảng byte Hex: STX + COMMAND + DATA + (ESC cho mỗi field) + ETX
   * Throw Error nếu phát hiện ký tự non-ASCII (code > 0x7F) để đảm bảo an toàn phần cứng.
   */
  encode(command: number, fields: string[] = []): Uint8Array {
    const dataBytes: number[] = []
    for (const field of fields) {
      for (let i = 0; i < field.length; i++) {
        const code = field.charCodeAt(i)
        if (code > 0x7f) {
          throw new Error(
            `FrameCodec.encode: non-ASCII char (code ${code}) in field "${field}" — sanitize input trước khi gọi encode()`,
          )
        }
        dataBytes.push(code)
      }
      dataBytes.push(ESC)
    }
    return new Uint8Array([STX, command, ...dataBytes, ETX])
  }

  /**
   * Nạp mảng byte thô nhận được từ transport, trả về danh sách các khung truyền đã nhận đủ STX...ETX.
   * Xử lý triệt để việc phân mảnh (fragmentation) và dính gói (sticky packets) của TCP.
   */
  feed(chunk: Uint8Array): DecodedFrame[] {
    for (let i = 0; i < chunk.length; i++) {
      this.buffer.push(chunk[i])
    }
    const frames: DecodedFrame[] = []

    while (true) {
      const stxIdx = this.buffer.indexOf(STX)
      if (stxIdx === -1) {
        // Rác hoàn toàn không chứa STX -> Clear toàn bộ buffer
        this.buffer = []
        break
      }

      // Xóa các byte rác đứng trước STX đầu tiên
      if (stxIdx > 0) {
        this.buffer = this.buffer.slice(stxIdx)
      }

      // Tìm vị trí byte ETX tính từ vị trí sau STX (tối thiểu index 2)
      const etxIdx = this.buffer.indexOf(ETX, 2)
      if (etxIdx === -1) {
        // Chưa nhận đủ byte ETX -> Dừng lại chờ chunk tiếp theo
        break
      }

      const command = this.buffer[1]
      const dataBytes = this.buffer.slice(2, etxIdx)

      // Chuyển đổi byte data sang chuỗi ASCII
      const rawString = dataBytes.map((b) => String.fromCharCode(b)).join('')

      // Cắt mảng trường dữ liệu theo ký tự phân cách 0x1B (ESC) hoặc 0x00 (NULL)
      const fields = rawString
        .split(/[\x1B\x00]/)
        .filter((f, idx, arr) => idx < arr.length - 1 || f.length > 0)
        .map((f) => f.replace(/\0/g, '').trim())

      frames.push({ command, fields })

      // Xóa khung truyền vừa xử lý khỏi buffer
      this.buffer = this.buffer.slice(etxIdx + 1)
    }

    return frames
  }

  /** Làm sạch bộ đệm tạm thời */
  reset(): void {
    this.buffer = []
  }
}
