import { ETX, SOH, STX, SYN } from '../protocol/constants'
import { BpbioFrameCodec } from '../protocol/frame-codec'

describe('BpbioFrameCodec', () => {
  let codec: BpbioFrameCodec

  beforeEach(() => {
    codec = new BpbioFrameCodec()
  })

  function buildTestFrame(identifier: string, value: number): Uint8Array {
    // SYN SYN SOH 0x30 0x30 STX [0x30+id] [val0 val1 val2] 0x30 0x30 0x30 ETX BCC
    const valStr = String(value).padStart(3, '0')
    const bytes = [
      SYN,
      SYN,
      SOH,
      0x30,
      0x30,
      STX,
      0x30, // Byte 6 placeholder
      identifier.charCodeAt(0), // Byte 7
      valStr.charCodeAt(0), // Byte 8
      valStr.charCodeAt(1), // Byte 9
      valStr.charCodeAt(2), // Byte 10
      0x30,
      0x30,
      0x30, // Bytes 11..13 placeholder
      ETX, // Byte 14
    ]
    // Calculate BCC over bytes [5..14] (STX..ETX)
    const bcc = bytes.slice(5, 15).reduce((acc, b) => acc ^ b, 0)
    bytes.push(bcc)
    return new Uint8Array(bytes)
  }

  it('parses a complete 16-byte frame correctly', () => {
    const frame = buildTestFrame('S', 120)
    const result = codec.feed(frame)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ identifier: 'S', value: 120 })
  })

  it('handles frame split across multiple chunks', () => {
    const frame = buildTestFrame('D', 80)
    const chunk1 = frame.slice(0, 7)
    const chunk2 = frame.slice(7)

    expect(codec.feed(chunk1)).toHaveLength(0)
    const result = codec.feed(chunk2)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ identifier: 'D', value: 80 })
  })

  it('parses multiple sticky frames in a single chunk', () => {
    const frame1 = buildTestFrame('S', 120)
    const frame2 = buildTestFrame('D', 80)
    const frame3 = buildTestFrame('P', 72)

    const combined = new Uint8Array([
      ...Array.from(frame1),
      ...Array.from(frame2),
      ...Array.from(frame3),
    ])
    const result = codec.feed(combined)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ identifier: 'S', value: 120 })
    expect(result[1]).toEqual({ identifier: 'D', value: 80 })
    expect(result[2]).toEqual({ identifier: 'P', value: 72 })
  })

  it('rejects frame with invalid BCC checksum', () => {
    const frame = buildTestFrame('S', 120)
    frame[15] = frame[15] ^ 0xff // Corrupt BCC

    const result = codec.feed(frame)
    expect(result).toHaveLength(0)
  })
})

describe('parseBpbioEventPayload', () => {
  it('correctly distinguishes uppercase ELB (Inserted) and lowercase elb (Removed)', () => {
    const { parseBpbioEventPayload } = require('../protocol/event-parser')

    const evIn = parseBpbioEventPayload('ELB', 'ELB', 'ELB')
    expect(evIn.type).toBe('ELBOW_INSERTED')
    expect(evIn.id).toBe(6)

    const evOut = parseBpbioEventPayload('elb', 'elb', 'elb')
    expect(evOut.type).toBe('ELBOW_REMOVED')
    expect(evOut.id).toBe(7)
  })

  it('correctly parses AWK as PRESENCE_DETECTED', () => {
    const { parseBpbioEventPayload } = require('../protocol/event-parser')

    const ev = parseBpbioEventPayload('AWK', 'AWK', 'AWK')
    expect(ev.type).toBe('PRESENCE_DETECTED')
    expect(ev.id).toBe(5)
  })
})
