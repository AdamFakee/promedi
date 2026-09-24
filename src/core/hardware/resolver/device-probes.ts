/**
 * Định nghĩa chữ ký phản hồi (Probe Signatures) để phân biệt tự động từng loại thiết bị đo.
 *
 * Chức năng:
 * - Khai báo cấu hình baudrate và payload tín hiệu hỏi thử (Probe Payload) cho từng vai trò thiết bị.
 * - InBody 260S: Gửi lệnh STATUS (0x63), kiểm tra phản hồi khung STX...ETX chứa Status Code hợp lệ.
 * - BPBIO750: Gửi lệnh REQUEST_RESULT (0x43), kiểm tra phản hồi khung 16-byte có Checksum BCC hợp lệ.
 *
 * @module src/core/hardware/resolver/device-probes.ts
 */

import { COMMANDS as BPBIO_COMMANDS, BpbioFrameCodec, buildBpbioCommandFrame } from '../bpbio'
import { FrameCodec, COMMANDS as INBODY_COMMANDS } from '../inbody'
import type { DeviceTransport } from '../transport'
import type { DeviceRole } from './binding-store'

/** Interface quy định cấu trúc 1 Probe Signature */
export interface DeviceProbe {
  /** Vai trò thiết bị ('inbody' | 'bpbio') */
  role: DeviceRole
  /** Tốc độ truyền baud rate cần thiết để hỏi thử */
  baudRate: number
  /** Hàm thực thi gửi tín hiệu và bắt tay xác minh phản hồi từ phần cứng */
  probe: (transport: DeviceTransport) => Promise<boolean>
}

/**
 * Helper gửi mảng byte payload và chờ tín hiệu phản hồi hợp lệ trong khoảng timeout.
 *
 * @param transport Instance DeviceTransport đã mở kết nối.
 * @param payload Uint8Array Mảng byte lệnh gửi xuống.
 * @param validator Hàm kiểm tra byte trả về có đúng chuẩn của thiết bị hay không.
 * @param timeoutMs Thời gian chờ phản hồi tối đa (Mặc định 800ms).
 * @return Promise<boolean> true nếu thiết bị phản hồi đúng chuẩn, false nếu timeout hoặc sai chuẩn.
 */
async function sendProbeAndCheck(
  transport: DeviceTransport,
  payload: Uint8Array,
  validator: (chunk: Uint8Array) => boolean,
  timeoutMs = 800,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let resolved = false
    let unsubscribe: (() => void) | null = null

    // Bộ đếm thời gian Timeout probe
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        if (unsubscribe) unsubscribe()
        resolve(false)
      }
    }, timeoutMs)

    // Lắng nghe dữ liệu byte trả về từ transport
    unsubscribe = transport.onData((chunk) => {
      if (!resolved && validator(chunk)) {
        resolved = true
        clearTimeout(timer)
        if (unsubscribe) unsubscribe()
        resolve(true)
      }
    })

    // Ghi byte payload ra thiết bị
    transport.write(payload).catch(() => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        if (unsubscribe) unsubscribe()
        resolve(false)
      }
    })
  })
}

/** Danh sách mảng các Probe Signatures cho InBody 260S và BPBIO750 */
export const PROBES: DeviceProbe[] = [
  {
    role: 'inbody',
    baudRate: 19200,
    probe: async (transport) => {
      const codec = new FrameCodec()
      const statusCmd = codec.encode(INBODY_COMMANDS.STATUS)
      return sendProbeAndCheck(transport, statusCmd, (chunk) => {
        const frames = codec.feed(chunk)
        return frames.some((f) => f.command === INBODY_COMMANDS.STATUS)
      })
    },
  },
  {
    role: 'bpbio',
    baudRate: 9600,
    probe: async (transport) => {
      const codec = new BpbioFrameCodec()
      const cmd = buildBpbioCommandFrame(BPBIO_COMMANDS.REQUEST_RESULT)
      return sendProbeAndCheck(transport, cmd, (chunk) => {
        const frames = codec.feed(chunk)
        return frames.length > 0
      })
    },
  },
]
