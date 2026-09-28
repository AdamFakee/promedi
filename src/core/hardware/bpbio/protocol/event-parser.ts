/**
 * Bộ giải mã & đóng gói sự kiện (Event-Driven Parser & Builder) cho máy đo huyết áp BPBIO320/750.
 *
 * Tuân thủ Đặc tả Giao thức v4.0 (docs/hard-ware/bpbio320-750-protocol-spec.md Section 3):
 * Ánh xạ 7 trạng thái làm việc thực tế từ các trường S, D, P trong gói tin broadcast 64 byte:
 * 1. Đo hoàn tất (Systolic, Diastolic, Pulse dạng số)
 * 2. Bắt đầu đo (S, D, P = "STA")
 * 3. Hủy đo thủ công (S, D, P = "STP")
 * 4. Lỗi thiết bị (S = "Err", D = Mã lỗi, P = "rrr")
 * 5. Phát hiện người (S, D, P = "AWK")
 * 6. Cùi chỏ đặt vào (S, D, P = "ELB")
 * 7. Cùi chỏ nhấc ra (S, D, P = "elb")
 *
 * @module src/core/hardware/bpbio/protocol/event-parser.ts
 */

import type { BpbioEvent } from '../types/bpbio.types'
import { EVENT_PAYLOADS } from './constants'

/**
 * Trích xuất đối tượng BpbioEvent từ 3 chuỗi payload đại diện cho 3 trường S, D, P.
 *
 * @param rawS Chuỗi ASCII 3 ký tự trích xuất từ trường S [Index 34..36]
 * @param rawD Chuỗi ASCII 3 ký tự trích xuất từ trường D [Index 44..46]
 * @param rawP Chuỗi ASCII 3 ký tự trích xuất từ trường P [Index 49..51]
 * @returns BpbioEvent Sự kiện trích xuất hoàn chỉnh
 */
export function parseBpbioEventPayload(rawS: string, rawD: string, rawP: string): BpbioEvent {
  const timestamp = Date.now()
  const payload = { rawS, rawD, rawP }

  const s = rawS.trim()
  const d = rawD.trim()
  const p = rawP.trim()
  const sUpper = s.toUpperCase()
  const dUpper = d.toUpperCase()
  const pUpper = p.toUpperCase()

  // Ma trận thông điệp hướng dẫn người dùng theo mã lỗi hệ thống BPBIO (Err)
  const errorGuidanceMap: Record<string, string> = {
    '001':
      'Phát hiện cử động tay trong khi đo. Vui lòng giữ yên cánh tay, thả lỏng cơ thể và không nói chuyện.',
    '002':
      'Áp suất bao đo rò rỉ hoặc không ổn định. Vui lòng xỏ tay sâu hơn vào bao đo và thử lại.',
    '003':
      'Áp suất bơm hơi vượt mức an toàn. Vui lòng xả khí và nghỉ ngơi 2 phút trước khi thử lại.',
    '004':
      'Thiết bị không phát hiện được nhịp mạch. Vui lòng điều chỉnh tư thế ngồi và đặt cùi chỏ đúng vị trí.',
    '005':
      'Bao đo chưa được thắt chặt đúng cách. Vui lòng xỏ tay sát vào điểm tựa cùi chỏ và thử lại.',
  }

  // 1. Lỗi thiết bị (Event 4): S = "Err", D = Mã lỗi (VD: "001"), P = "rrr" hoặc "Err"
  if (
    sUpper === EVENT_PAYLOADS.ERROR_HEADER.toUpperCase() ||
    sUpper === 'ERR' ||
    pUpper === EVENT_PAYLOADS.ERROR_FOOTER.toUpperCase() ||
    pUpper === 'RRR'
  ) {
    const errCode = rawD.trim()
    const guidance =
      errorGuidanceMap[errCode] ||
      `Phát hiện lỗi đo lường (Mã lỗi ${errCode}). Vui lòng giữ yên cánh tay và thử lại.`
    return {
      id: 4,
      type: 'DEVICE_ERROR',
      name: 'Lỗi thiết bị',
      payload: { ...payload, errorCode: errCode },
      description: `⚠️ Phát hiện lỗi thiết bị BPBIO. Mã lỗi hệ thống: ${errCode}`,
      userMessage: guidance,
      timestamp,
    }
  }

  // 2. Bắt đầu đo (Event 2): STA ở bất kỳ trường nào
  if (
    sUpper === EVENT_PAYLOADS.START ||
    dUpper === EVENT_PAYLOADS.START ||
    pUpper === EVENT_PAYLOADS.START
  ) {
    return {
      id: 2,
      type: 'START_MEASUREMENT',
      name: 'Bắt đầu đo',
      payload,
      description: 'Máy bắt đầu bơm hơi đo huyết áp (Inflation started)',
      userMessage:
        'Máy bắt đầu bơm hơi. Quý khách vui lòng giữ yên cánh tay, thả lỏng cơ thể và không nói chuyện trong suốt quá trình đo.',
      timestamp,
    }
  }

  // 3. Hủy đo thủ công (Event 3): STP ở bất kỳ trường nào
  if (
    sUpper === EVENT_PAYLOADS.STOP ||
    dUpper === EVENT_PAYLOADS.STOP ||
    pUpper === EVENT_PAYLOADS.STOP
  ) {
    return {
      id: 3,
      type: 'MANUAL_CANCEL',
      name: 'Hủy đo thủ công',
      payload,
      description: 'Người dùng nhấn nút STOP trên máy hoặc hủy đo giữa chừng',
      userMessage:
        'Đã hủy quá trình đo huyết áp. Quý khách có thể xỏ tay vào bao đo và nhấn nút Bắt Đầu để đo lại.',
      timestamp,
    }
  }

  // 4. Phát hiện người (Event 5): AWK / AW / USR / DET ở bất kỳ trường nào
  if (
    sUpper === EVENT_PAYLOADS.AWAKE ||
    dUpper === EVENT_PAYLOADS.AWAKE ||
    pUpper === EVENT_PAYLOADS.AWAKE ||
    sUpper.includes('AWK') ||
    dUpper.includes('AWK') ||
    pUpper.includes('AWK') ||
    sUpper.startsWith('AW') ||
    dUpper.startsWith('AW') ||
    pUpper.startsWith('AW') ||
    sUpper === 'USR' ||
    dUpper === 'USR' ||
    pUpper === 'USR' ||
    sUpper === 'DET' ||
    dUpper === 'DET' ||
    pUpper === 'DET'
  ) {
    return {
      id: 5,
      type: 'PRESENCE_DETECTED',
      name: 'Phát hiện người',
      payload,
      description: 'Cảm biến hồng ngoại phát hiện người tiếp cận trạm Kiosk (BPBIO320S/750)',
      userMessage:
        'Xin chào quý khách. Vui lòng ngồi thẳng lưng và xỏ tay phải vào bao đo huyết áp.',
      timestamp,
    }
  }

  // 5. Cùi chỏ nhấc ra (Event 7): "elb" (chữ thường - CASE SENSITIVE)
  if (
    s === EVENT_PAYLOADS.ELBOW_OUT ||
    d === EVENT_PAYLOADS.ELBOW_OUT ||
    p === EVENT_PAYLOADS.ELBOW_OUT ||
    s === 'elb' ||
    d === 'elb' ||
    p === 'elb'
  ) {
    return {
      id: 7,
      type: 'ELBOW_REMOVED',
      name: 'Cùi chỏ nhấc ra',
      payload,
      description: 'Cùi chỏ tay bị nhấc/rút ra khỏi ống đo (MID mode)',
      userMessage:
        'Cùi chỏ đã bị nhấc ra khỏi vị trí chuẩn. Vui lòng đặt cùi chỏ sát vào điểm tựa đo.',
      timestamp,
    }
  }

  // 6. Cùi chỏ đặt vào (Event 6): "ELB" (chữ hoa - CASE SENSITIVE)
  if (
    s === EVENT_PAYLOADS.ELBOW_IN ||
    d === EVENT_PAYLOADS.ELBOW_IN ||
    p === EVENT_PAYLOADS.ELBOW_IN ||
    s === 'ELB' ||
    d === 'ELB' ||
    p === 'ELB'
  ) {
    return {
      id: 6,
      type: 'ELBOW_INSERTED',
      name: 'Cùi chỏ đặt vào',
      payload,
      description: 'Cùi chỏ tay được đặt đúng vị trí đo chuẩn (MID mode)',
      userMessage:
        'Đã đặt cùi chỏ đúng vị trí chuẩn. Quý khách vui lòng nhấn nút Bắt Đầu để tiến hành đo.',
      timestamp,
    }
  }

  // 7. Command ACKs: CON, LCK, RLS
  if (
    sUpper === EVENT_PAYLOADS.CONFIRM ||
    dUpper === EVENT_PAYLOADS.CONFIRM ||
    pUpper === EVENT_PAYLOADS.CONFIRM
  ) {
    return {
      type: 'CONFIRM_CONNECT',
      name: 'Xác nhận kết nối',
      payload,
      description: 'Thiết bị phản hồi trạng thái Online Sẵn sàng (CON)',
      userMessage: 'Máy đo huyết áp sẵn sàng hoạt động.',
      timestamp,
    }
  }

  if (
    sUpper === EVENT_PAYLOADS.LOCK ||
    dUpper === EVENT_PAYLOADS.LOCK ||
    pUpper === EVENT_PAYLOADS.LOCK
  ) {
    return {
      type: 'BUTTON_LOCKED',
      name: 'Khóa nút vật lý',
      payload,
      description: 'Nút bấm vật lý đã được khóa thành công (LCK)',
      userMessage: 'Đã khóa nút bấm vật lý trên máy đo.',
      timestamp,
    }
  }

  if (
    sUpper === EVENT_PAYLOADS.RELEASE ||
    dUpper === EVENT_PAYLOADS.RELEASE ||
    pUpper === EVENT_PAYLOADS.RELEASE
  ) {
    return {
      type: 'BUTTON_RELEASED',
      name: 'Mở khóa nút vật lý',
      payload,
      description: 'Nút bấm vật lý đã được mở khóa (RLS)',
      userMessage: 'Đã mở khóa nút bấm vật lý trên máy đo.',
      timestamp,
    }
  }

  // 8. Đo hoàn tất (Event 1): S, D, P là các số y tế
  const sys = Number(rawS)
  const dia = Number(rawD)
  const pul = Number(rawP)

  if (!Number.isNaN(sys) && !Number.isNaN(dia) && !Number.isNaN(pul)) {
    return {
      id: 1,
      type: 'MEASUREMENT_COMPLETED',
      name: 'Đo hoàn tất',
      payload: { ...payload, systolic: sys, diastolic: dia, pulse: pul },
      description: `Đo hoàn tất: Tâm thu=${sys} mmHg, Tâm trương=${dia} mmHg, Nhịp tim=${pul} bpm`,
      userMessage:
        'Quá trình đo hoàn tất. Quý khách có thể rút tay ra và xem bảng tổng hợp kết quả.',
      timestamp,
    }
  }

  return {
    type: 'UNKNOWN',
    name: 'Sự kiện không xác định',
    payload,
    description: `Gói tin sự kiện không xác định: S='${rawS}', D='${rawD}', P='${rawP}'`,
    userMessage: 'Vui lòng kiểm tra lại tư thế đo và làm theo hướng dẫn trên màn hình.',
    timestamp,
  }
}

/**
 * Đóng gói mảng 64 byte gói tin broadcast sự kiện BPBIO320/750 hoàn chỉnh.
 * Dùng cho cả mô phỏng test runner lẫn đóng gói gói tin phản hồi chuẩn.
 *
 * @param rawS Chuỗi 3 ký tự tại trường S (Index 34..36)
 * @param rawD Chuỗi 3 ký tự tại trường D (Index 44..46)
 * @param rawP Chuỗi 3 ký tự tại trường P (Index 49..51)
 * @returns Uint8Array Mảng 64 byte cố định với Header, RS Delimiters (0x1E), ETX (0x03) và BCC Checksum.
 */
export function buildBpbio64ByteEventFrame(rawS: string, rawD: string, rawP: string): Uint8Array {
  const frame = new Uint8Array(64)
  // Index 0..2: SYN SYN SOH (0x16 0x16 0x01)
  frame[0] = 0x16
  frame[1] = 0x16
  frame[2] = 0x01
  // Index 5: STX (0x02)
  frame[5] = 0x02

  // Phân tách bởi byte RS (0x1E)
  frame[23] = 0x1e
  frame[26] = 0x1e
  frame[32] = 0x1e
  frame[37] = 0x1e
  frame[42] = 0x1e
  frame[47] = 0x1e
  frame[52] = 0x1e
  frame[61] = 0x1e

  // Khối Tâm thu S (Index 33: 'S', Index 34..36: payload)
  frame[33] = 0x53
  const sStr = rawS.padStart(3, '0').slice(0, 3)
  frame[34] = sStr.charCodeAt(0)
  frame[35] = sStr.charCodeAt(1)
  frame[36] = sStr.charCodeAt(2)

  // Khối Tâm trương D (Index 43: 'D', Index 44..46: payload)
  frame[43] = 0x44
  const dStr = rawD.padStart(3, '0').slice(0, 3)
  frame[44] = dStr.charCodeAt(0)
  frame[45] = dStr.charCodeAt(1)
  frame[46] = dStr.charCodeAt(2)

  // Khối Nhịp tim P (Index 48: 'P', Index 49..51: payload)
  frame[48] = 0x50
  const pStr = rawP.padStart(3, '0').slice(0, 3)
  frame[49] = pStr.charCodeAt(0)
  frame[50] = pStr.charCodeAt(1)
  frame[51] = pStr.charCodeAt(2)

  // Byte ETX (Index 62: 0x03)
  frame[62] = 0x03

  // Tính Checksum BCC XOR từ index 0 đến ETX (Index 62)
  let bcc = 0
  for (let i = 0; i < 63; i++) {
    bcc ^= frame[i]
  }
  frame[63] = bcc

  return frame
}
