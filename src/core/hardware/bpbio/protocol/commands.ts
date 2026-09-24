/**
 * Hàm hỗ trợ đóng gói các khung lệnh (Command Builders) gửi xuống máy đo BPBIO750.
 *
 * @module src/core/hardware/bpbio/protocol/commands.ts
 */

import { SYN, SOH, STX, ETX } from './constants'

/**
 * Đóng gói mảng 9 byte lệnh cố định gửi xuống máy đo BPBIO750.
 * Cấu trúc: SYN SYN SOH 0x30 0x30 STX [Command] ETX BCC
 *
 * @param cmd Mã lệnh (VD: 0x43 - REQUEST_RESULT, 0x46 - STOP, 0x4C - LOCK, 0x72 - UNLOCK).
 * @return Uint8Array Khung lệnh đã được tính sẵn checksum BCC.
 */
export function buildBpbioCommandFrame(cmd: number): Uint8Array {
  const withoutBcc = [SYN, SYN, SOH, 0x30, 0x30, STX, cmd, ETX]
  // Tính checksum BCC cho mảng lệnh từ byte STX đến ETX
  const bcc = withoutBcc.slice(5).reduce((acc, b) => acc ^ b, 0)
  return new Uint8Array([...withoutBcc, bcc])
}
