/**
 * Tiện ích chuyển đổi chuỗi tiếng Việt có dấu về ASCII thuần cho InBody 260S SDK.
 * @module src/core/hardware/inbody/utils/sanitize-ascii.ts
 */

const VIETNAMESE_SPECIAL_MAP: Record<string, string> = { Đ: 'D', đ: 'd' }

/**
 * Chuyển chuỗi tiếng Việt có dấu về ASCII an toàn để gửi xuống InBody.
 * Lưu ý: 'Đ'/'đ' KHÔNG decompose qua NFD nên phải map thủ công trước khi normalize.
 *
 * @param str Chuỗi ký tự đầu vào
 * @param maxLen Độ dài tối đa cho phép (Ví dụ: ID max 14 bytes)
 */
export function sanitizeAscii(str: string, maxLen: number): string {
  if (!str) return ''
  const replaced = str.replace(/[Đđ]/g, (ch) => VIETNAMESE_SPECIAL_MAP[ch] ?? ch)
  return replaced
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Xoá các dấu thanh/dấu phụ sau khi decompose
    .replace(/[^a-zA-Z0-9_ -]/g, '') // Giữ ASCII an toàn và khoảng trắng
    .trim()
    .slice(0, maxLen)
}
