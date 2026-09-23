/**
 * Bộ tạo gói tin lệnh (Command Builders) cho InBody 260S Open Protocol.
 * @module src/core/hardware/inbody/protocol/commands.ts
 */

import { FrameCodec } from './frame-codec'
import { COMMANDS } from './constants'
import { sanitizeAscii } from '../utils/sanitize-ascii'
import type { PatientInfo } from '../types/inbody.types'

/** Dựng gói tin lệnh STATUS (0x63) */
export function buildStatusCommand(codec: FrameCodec): Uint8Array {
  return codec.encode(COMMANDS.STATUS)
}

/** Dựng gói tin lệnh INFO (0x75) gửi thông tin khách hàng */
export function buildInfoCommand(codec: FrameCodec, info: PatientInfo): Uint8Array {
  const safeId = sanitizeAscii(info.id, 14)
  const safeGender = info.gender === 'M' ? 'M' : 'F'
  const safeHeight = info.heightCm.toFixed(1)
  const safeAge = info.age.toFixed(1)

  return codec.encode(COMMANDS.INFO, [safeId, safeGender, safeHeight, safeAge])
}

/** Dựng gói tin lệnh LOCK/UNLOCK (0x6C) */
export function buildLockCommand(codec: FrameCodec, flag: '0' | '1' | '2'): Uint8Array {
  return codec.encode(COMMANDS.LOCK, [flag])
}

/** Dựng gói tin lệnh RESULT (0x64) rút dữ liệu kết quả đo BIA */
export function buildResultCommand(codec: FrameCodec): Uint8Array {
  return codec.encode(COMMANDS.RESULT)
}

/** Dựng gói tin lệnh SKIP (0x73) bỏ qua trang thông báo lỗi */
export function buildSkipCommand(codec: FrameCodec): Uint8Array {
  return codec.encode(COMMANDS.SKIP)
}

/** Dựng gói tin lệnh SEND_ID (0x69) chỉ gửi mã ID */
export function buildSendIdCommand(codec: FrameCodec, id: string): Uint8Array {
  const safeId = sanitizeAscii(id, 14)
  return codec.encode(COMMANDS.SEND_ID, [safeId])
}

/** Dựng gói tin lệnh WEIGHT (0x6B) hỏi cân nặng */
export function buildWeightCommand(codec: FrameCodec): Uint8Array {
  return codec.encode(COMMANDS.WEIGHT)
}

/** Dựng gói tin lệnh REQUEST_ID (0x77) yêu cầu đọc ID */
export function buildRequestIdCommand(codec: FrameCodec): Uint8Array {
  return codec.encode(COMMANDS.REQUEST_ID)
}

/** Dựng gói tin lệnh SET_TIME (0x74) đồng bộ thời gian (YYYY:MM:DD/HH:MM:SS) */
export function buildSetTimeCommand(codec: FrameCodec, date: Date = new Date()): Uint8Array {
  const pad = (n: number) => String(n).padStart(2, '0')
  const formatted = `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())}/${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return codec.encode(COMMANDS.SET_TIME, [formatted])
}
