export type VoicePromptKey =
  | 'SERVICE_SELECTION'
  | 'BP_START'
  | 'BP_ELBOW_OFF'
  | 'BP_COMPLETE'
  | 'INBODY_START'
  | 'INBODY_CONTACT_ERROR'
  | 'INBODY_COMPLETE'
  | 'SUMMARY_START'
  | 'SUMMARY_TIMEOUT_10S'
  | 'SESSION_TERMINATED'

export const VOICE_PROMPTS: Record<VoicePromptKey, string> = {
  SERVICE_SELECTION: 'Mời quý khách chọn các dịch vụ cần đo và nhấn Bắt đầu đo.',
  BP_START:
    'Đo huyết áp và nhịp tim. Quý khách vui lòng luồn tay vào vòng đo, tỳ cùi chỏ vào cảm biến và giữ yên.',
  BP_ELBOW_OFF:
    'Cảnh báo: Khuỷu tay chưa chạm điểm cảm biến. Quý khách vui lòng đẩy tay sâu hơn và ngồi yên.',
  BP_COMPLETE: 'Đã đo xong huyết áp. Mời bạn nhấn Tiếp tục.',
  INBODY_START:
    'Phân tích chỉ số cơ thể. Quý khách vui lòng tháo giày, đứng lên máy InBody và cầm hai tay nắm.',
  INBODY_CONTACT_ERROR:
    'Cảnh báo: Chưa nhận đủ tiếp xúc điện cực. Quý khách vui lòng cầm chắc thanh nắm và đứng yên.',
  INBODY_COMPLETE:
    'Đã phân tích xong chỉ số cơ thể. Mời bạn nhấn Tiếp tục để xem tổng hợp kết quả.',
  SUMMARY_START:
    'Quá trình khám sức khỏe đã hoàn tất. Quý khách có thể xem kết quả trên màn hình hoặc quét mã QR để lưu lại.',
  SUMMARY_TIMEOUT_10S:
    'Màn hình sẽ đóng sau 10 giây nữa. Quý khách có thể chạm vào màn hình nếu cần xem thêm.',
  SESSION_TERMINATED: 'Cảm ơn quý khách đã sử dụng dịch vụ. Chúc bạn một ngày tốt lành.',
}
