/**
 * @file height-voice-formatter.util.ts
 * @brief Tiện ích chuyển đổi số đo chiều cao thành văn bản phát âm tiếng Việt chuẩn mực (Pure function, zero I/O).
 * @module src/core/voice-engine/utils/height-voice-formatter.util.ts
 */

const DIGIT_WORDS: readonly string[] = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
]

/**
 * Chuyển đổi số nguyên dương từ 0 đến 999 thành từ ngữ tiếng Việt chuẩn ngữ pháp.
 * Xử lý chính xác các trường hợp "mười", "mốt", "lăm", "lẻ", v.v.
 *
 * @param num Số nguyên cần chuyển đổi
 * @returns Chuỗi phát âm tiếng Việt
 */
export function integerToVietnameseWords(num: number): string {
  const n = Math.floor(Math.abs(num))
  if (n < 10) {
    return DIGIT_WORDS[n]
  }

  if (n < 100) {
    const tens = Math.floor(n / 10)
    const units = n % 10

    const tensStr = tens === 1 ? 'mười' : `${DIGIT_WORDS[tens]} mươi`

    if (units === 0) {
      return tensStr
    }
    if (units === 1) {
      return tens === 1 ? 'mười một' : `${tensStr} mốt`
    }
    if (units === 5) {
      return `${tensStr} lăm`
    }
    return `${tensStr} ${DIGIT_WORDS[units]}`
  }

  if (n < 1000) {
    const hundreds = Math.floor(n / 100)
    const remainder = n % 100

    const hundredsStr = `${DIGIT_WORDS[hundreds]} trăm`
    if (remainder === 0) {
      return hundredsStr
    }

    if (remainder < 10) {
      return `${hundredsStr} lẻ ${DIGIT_WORDS[remainder]}`
    }

    const tens = Math.floor(remainder / 10)
    const units = remainder % 10
    const tensStr = tens === 1 ? 'mười' : `${DIGIT_WORDS[tens]} mươi`

    if (units === 0) {
      return `${hundredsStr} ${tensStr}`
    }
    if (units === 1) {
      const unitsStr = tens === 1 ? 'một' : 'mốt'
      return `${hundredsStr} ${tensStr} ${unitsStr}`
    }
    if (units === 5) {
      return `${hundredsStr} ${tensStr} lăm`
    }
    return `${hundredsStr} ${tensStr} ${DIGIT_WORDS[units]}`
  }

  return num.toString()
}

/**
 * Chuyển đổi giá trị chiều cao (cm, ví dụ 170 hoặc 170.5) thành câu thoại tiếng Việt hoàn chỉnh cho Voice Guidance.
 *
 * Ví dụ:
 * - 170   -> "Đã đo xong chiều cao. Chiều cao của quý khách là một trăm bảy mươi xăng ti mét."
 * - 170.5 -> "Đã đo xong chiều cao. Chiều cao của quý khách là một trăm bảy mươi phẩy năm xăng ti mét."
 * - 165.2 -> "Đã đo xong chiều cao. Chiều cao của quý khách là một trăm sáu mươi lăm phẩy hai xăng ti mét."
 *
 * @param heightCm Chiều cao tính bằng centimet (cm)
 * @returns Chuỗi phát âm chuẩn tiếng Việt
 */
export function formatHeightToSpeechText(heightCm: number): string {
  if (typeof heightCm !== 'number' || isNaN(heightCm) || heightCm <= 0) {
    return 'Đã đo xong chiều cao.'
  }

  // Làm tròn đến 1 chữ số thập phân
  const rounded = Math.round(heightCm * 10) / 10
  const intPart = Math.floor(rounded)
  const decimalPart = Math.round((rounded - intPart) * 10)

  const intWords = integerToVietnameseWords(intPart)

  if (decimalPart > 0) {
    const decWord = DIGIT_WORDS[decimalPart]
    return `Đã đo xong chiều cao. Chiều cao của quý khách là ${intWords} phẩy ${decWord} xăng ti mét.`
  }

  return `Đã đo xong chiều cao. Chiều cao của quý khách là ${intWords} xăng ti mét.`
}
