import { FrameCodec } from '../protocol/frame-codec'
import {
  buildStatusCommand,
  buildInfoCommand,
  buildLockCommand,
  buildResultCommand,
  buildSkipCommand,
  buildSetTimeCommand,
} from '../protocol/commands'
import { COMMANDS } from '../protocol/constants'

describe('Command Builders', () => {
  let codec: FrameCodec

  beforeEach(() => {
    codec = new FrameCodec()
  })

  it('dựng đúng gói tin STATUS (0x63)', () => {
    const bytes = buildStatusCommand(codec)
    expect(bytes[1]).toBe(COMMANDS.STATUS)
  })

  it('dựng đúng gói tin INFO (0x75) với dữ liệu đã được sanitize', () => {
    const patientInfo = {
      id: 'Nguyễn Văn A',
      gender: 'M' as const,
      heightCm: 173.14,
      age: 28,
    }
    const bytes = buildInfoCommand(codec, patientInfo)
    expect(bytes[1]).toBe(COMMANDS.INFO)

    // Decode lại để kiểm tra chuỗi id đã được sanitize về ASCII không dấu
    const frames = codec.feed(bytes)
    expect(frames[0].fields[0]).toBe('Nguyen Van A')
    expect(frames[0].fields[1]).toBe('M')
    expect(frames[0].fields[2]).toBe('173.1')
    expect(frames[0].fields[3]).toBe('28.0')
  })

  it('dựng đúng gói tin LOCK (0x6C) với cờ khóa', () => {
    const bytes = buildLockCommand(codec, '1')
    expect(bytes[1]).toBe(COMMANDS.LOCK)
    const frames = codec.feed(bytes)
    expect(frames[0].fields[0]).toBe('1')
  })

  it('dựng đúng gói tin RESULT (0x64)', () => {
    const bytes = buildResultCommand(codec)
    expect(bytes[1]).toBe(COMMANDS.RESULT)
  })

  it('dựng đúng gói tin SKIP (0x73)', () => {
    const bytes = buildSkipCommand(codec)
    expect(bytes[1]).toBe(COMMANDS.SKIP)
  })

  it('dựng đúng gói tin SET_TIME (0x74)', () => {
    const testDate = new Date(2026, 8, 23, 10, 30, 0) // Month 8 is September
    const bytes = buildSetTimeCommand(codec, testDate)
    expect(bytes[1]).toBe(COMMANDS.SET_TIME)
    const frames = codec.feed(bytes)
    expect(frames[0].fields[0]).toBe('2026:09:23/10:30:00')
  })
})
