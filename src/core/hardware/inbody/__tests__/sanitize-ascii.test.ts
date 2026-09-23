import { sanitizeAscii } from '../utils/sanitize-ascii'

describe('sanitizeAscii', () => {
  it('chuyển đổi chữ tiếng Việt có dấu sang ASCII không dấu', () => {
    const input = 'Nguyễn Văn Đạt'
    const result = sanitizeAscii(input, 14)
    expect(result).toBe('Nguyen Van Dat')
  })

  it('xử lý đúng chữ Đ và đ viết hoa/thường', () => {
    expect(sanitizeAscii('Đồng Nai', 14)).toBe('Dong Nai')
    expect(sanitizeAscii('đại học', 14)).toBe('dai hoc')
  })

  it('cắt chuỗi theo độ dài tối đa maxLen', () => {
    const longString = 'NGUYEN VAN HOANG PHUC'
    const result = sanitizeAscii(longString, 14)
    expect(result.length).toBeLessThanOrEqual(14)
    expect(result).toBe('NGUYEN VAN HOA')
  })

  it('xóa các ký tự đặc biệt không nằm trong charset ASCII an toàn', () => {
    const input = 'John@Doe#123!'
    const result = sanitizeAscii(input, 14)
    expect(result).toBe('JohnDoe123')
  })

  it('xử lý an toàn với chuỗi rỗng hoặc undefined/null', () => {
    expect(sanitizeAscii('', 14)).toBe('')
    expect(sanitizeAscii(null as any, 14)).toBe('')
  })
})
