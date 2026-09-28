/**
 * Hàm hỗ trợ đóng gói các khung lệnh (Command Builders) gửi xuống máy đo BPBIO750.
 *
 * @module src/core/hardware/bpbio/protocol/commands.ts
 */

import { ETX, SOH, STX, SYN } from './constants'

/**
 * Đóng gói mảng byte lệnh gửi xuống máy đo BPBIO750 / Huyết áp.
 * Hỗ trợ cả lệnh 1 byte (9-byte frame) và lệnh 2 byte (10-byte frame như 0x52 0x42, 0x52 0x43, 0x52 0x46).
 * Cấu trúc: SYN SYN SOH 0x30 0x30 STX [CmdBytes...] ETX BCC
 *
 * @param cmd Mã lệnh (VD: 0x43) hoặc mảng mã lệnh (VD: [0x52, 0x42]).
 * @return Uint8Array Khung lệnh đã được tính sẵn checksum BCC XOR từ STX đến ETX.
 */
export function buildBpbioCommandFrame(cmd: number | number[] | readonly number[]): Uint8Array {
  const cmdBytes = typeof cmd === 'number' ? [cmd] : Array.from(cmd)
  const withoutBcc = [SYN, SYN, SOH, 0x30, 0x30, STX, ...cmdBytes, ETX]
  // Tính checksum BCC cho mảng lệnh từ byte STX đến ETX
  const bcc = withoutBcc.slice(5).reduce((acc, b) => acc ^ b, 0)
  return new Uint8Array([...withoutBcc, bcc])
}
