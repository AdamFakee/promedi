/**
 * @file height-voice-formatter.test.ts
 * @brief Unit tests kiểm thử định dạng câu giọng nói tiếng Việt cho số đo chiều cao (Zero I/O, Pure Logic).
 */

import {
  formatHeightToSpeechText,
  integerToVietnameseWords,
} from '../utils/height-voice-formatter.util'

describe('height-voice-formatter.util', () => {
  describe('integerToVietnameseWords', () => {
    it('chuyển đổi đúng các số đơn vị (0-9)', () => {
      expect(integerToVietnameseWords(0)).toBe('không')
      expect(integerToVietnameseWords(1)).toBe('một')
      expect(integerToVietnameseWords(5)).toBe('năm')
      expect(integerToVietnameseWords(9)).toBe('chín')
    })

    it('chuyển đổi đúng các số hàng chục (10-99)', () => {
      expect(integerToVietnameseWords(10)).toBe('mười')
      expect(integerToVietnameseWords(11)).toBe('mười một')
      expect(integerToVietnameseWords(15)).toBe('mười lăm')
      expect(integerToVietnameseWords(20)).toBe('hai mươi')
      expect(integerToVietnameseWords(21)).toBe('hai mươi mốt')
      expect(integerToVietnameseWords(25)).toBe('hai mươi lăm')
      expect(integerToVietnameseWords(34)).toBe('ba mươi bốn')
      expect(integerToVietnameseWords(99)).toBe('chín mươi chín')
    })

    it('chuyển đổi đúng các số hàng trăm (100-299) cho dải chiều cao', () => {
      expect(integerToVietnameseWords(100)).toBe('một trăm')
      expect(integerToVietnameseWords(105)).toBe('một trăm lẻ năm')
      expect(integerToVietnameseWords(110)).toBe('một trăm mười')
      expect(integerToVietnameseWords(111)).toBe('một trăm mười một')
      expect(integerToVietnameseWords(115)).toBe('một trăm mười lăm')
      expect(integerToVietnameseWords(120)).toBe('một trăm hai mươi')
      expect(integerToVietnameseWords(121)).toBe('một trăm hai mươi mốt')
      expect(integerToVietnameseWords(125)).toBe('một trăm hai mươi lăm')
      expect(integerToVietnameseWords(165)).toBe('một trăm sáu mươi lăm')
      expect(integerToVietnameseWords(170)).toBe('một trăm bảy mươi')
      expect(integerToVietnameseWords(171)).toBe('một trăm bảy mươi mốt')
      expect(integerToVietnameseWords(182)).toBe('một trăm tám mươi hai')
      expect(integerToVietnameseWords(200)).toBe('hai trăm')
      expect(integerToVietnameseWords(205)).toBe('hai trăm lẻ năm')
      expect(integerToVietnameseWords(215)).toBe('hai trăm mười lăm')
    })
  })

  describe('formatHeightToSpeechText', () => {
    it('đọc đúng chiều cao số nguyên chẵn (170cm)', () => {
      const text = formatHeightToSpeechText(170)
      expect(text).toBe(
        'Đã đo xong chiều cao. Chiều cao của quý khách là một trăm bảy mươi xăng ti mét.',
      )
    })

    it('đọc đúng chiều cao có 1 chữ số thập phân (170.5cm)', () => {
      const text = formatHeightToSpeechText(170.5)
      expect(text).toBe(
        'Đã đo xong chiều cao. Chiều cao của quý khách là một trăm bảy mươi phẩy năm xăng ti mét.',
      )
    })

    it('đọc đúng chiều cao có đuôi lăm (165cm)', () => {
      const text = formatHeightToSpeechText(165)
      expect(text).toBe(
        'Đã đo xong chiều cao. Chiều cao của quý khách là một trăm sáu mươi lăm xăng ti mét.',
      )
    })

    it('đọc đúng chiều cao thập phân phức tạp (172.8cm)', () => {
      const text = formatHeightToSpeechText(172.8)
      expect(text).toBe(
        'Đã đo xong chiều cao. Chiều cao của quý khách là một trăm bảy mươi hai phẩy tám xăng ti mét.',
      )
    })

    it('xử lý an toàn khi giá trị không hợp lệ', () => {
      expect(formatHeightToSpeechText(0)).toBe('Đã đo xong chiều cao.')
      expect(formatHeightToSpeechText(-10)).toBe('Đã đo xong chiều cao.')
      expect(formatHeightToSpeechText(NaN)).toBe('Đã đo xong chiều cao.')
    })
  })
})
