import { FrameCodec } from '../protocol/frame-codec'
import { STX, ETX, ESC } from '../protocol/constants'

describe('FrameCodec', () => {
  let codec: FrameCodec

  beforeEach(() => {
    codec = new FrameCodec()
  })

  describe('encode', () => {
    it('đóng gói đúng định dạng STX + COMMAND + DATA + ESC + ETX', () => {
      const command = 0x75 // 'u' (INFO)
      const fields = ['JOHN', 'M', '173.1', '28.0']
      const encoded = codec.encode(command, fields)

      expect(encoded[0]).toBe(STX)
      expect(encoded[1]).toBe(command)
      expect(encoded[encoded.length - 1]).toBe(ETX)

      // Chuyển mảng byte giữa STX và ETX sang string để kiểm tra
      const bodyBytes = Array.from(encoded.slice(2, encoded.length - 1))
      const raw = bodyBytes.map((b) => String.fromCharCode(b)).join('')
      const splitFields = raw.split(String.fromCharCode(ESC))

      expect(splitFields[0]).toBe('JOHN')
      expect(splitFields[1]).toBe('M')
      expect(splitFields[2]).toBe('173.1')
      expect(splitFields[3]).toBe('28.0')
    })

    it('ném lỗi (throw Error) nếu phát hiện ký tự non-ASCII (code > 0x7F)', () => {
      const command = 0x75
      const fields = ['NGUYỄN'] // Chứa ký tự non-ASCII
      expect(() => codec.encode(command, fields)).toThrow(/non-ASCII char/)
    })
  })

  describe('feed (TCP Streaming Parsing)', () => {
    it('bóc tách 1 frame trọn vẹn trong 1 chunk', () => {
      // Frame: STX (0x02), CMD (0x63), DATA ('0', 0x1B), ETX (0x03)
      const chunk = new Uint8Array([STX, 0x63, 0x30, ESC, ETX])
      const frames = codec.feed(chunk)

      expect(frames).toHaveLength(1)
      expect(frames[0].command).toBe(0x63)
      expect(frames[0].fields).toEqual(['0'])
    })

    it('xử lý chính xác 1 frame bị cắt phân mảnh làm 2 chunk', () => {
      const chunk1 = new Uint8Array([STX, 0x63, 0x30]) // Chunk 1 dở dang
      const chunk2 = new Uint8Array([ESC, ETX]) // Chunk 2 bổ sung ETX

      const frames1 = codec.feed(chunk1)
      expect(frames1).toHaveLength(0) // Chưa đủ ETX, trả về 0

      const frames2 = codec.feed(chunk2)
      expect(frames2).toHaveLength(1)
      expect(frames2[0].command).toBe(0x63)
      expect(frames2[0].fields).toEqual(['0'])
    })

    it('xử lý chính xác 2 frame bị dính trong cùng 1 chunk (Sticky Packets)', () => {
      const frame1Bytes = [STX, 0x63, 0x30, ESC, ETX]
      const frame2Bytes = [STX, 0x75, 0x31, ESC, ETX]
      const combined = new Uint8Array([...frame1Bytes, ...frame2Bytes])

      const frames = codec.feed(combined)
      expect(frames).toHaveLength(2)
      expect(frames[0].command).toBe(0x63)
      expect(frames[1].command).toBe(0x75)
    })

    it('bỏ qua rác trước STX đầu tiên và bóc tách frame chính xác', () => {
      const garbage = [0xff, 0xfe, 0xaa]
      const frameBytes = [STX, 0x63, 0x30, ESC, ETX]
      const chunk = new Uint8Array([...garbage, ...frameBytes])

      const frames = codec.feed(chunk)
      expect(frames).toHaveLength(1)
      expect(frames[0].command).toBe(0x63)
    })
  })
})
