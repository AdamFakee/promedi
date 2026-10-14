export type VoicePromptKey =
  | 'SERVICE_SELECTION'
  | 'BP_START'
  | 'BP_MEASURING'
  | 'BP_ERROR'
  | 'BP_ELBOW_OFF'
  | 'BP_COMPLETE'
  | 'INBODY_START'
  | 'INBODY_CONTACT_ERROR'
  | 'INBODY_COMPLETE'
  | 'SUMMARY_START'
  | 'SUMMARY_TIMEOUT_10S'
  | 'SESSION_TERMINATED'
  // Height / ToF Measurement Prompts
  | 'HEIGHT_START'
  | 'HEIGHT_STEP_IN'
  | 'HEIGHT_LOWER_ARMS'
  | 'HEIGHT_ONE_PERSON'
  | 'HEIGHT_MOVE_LEFT'
  | 'HEIGHT_MOVE_RIGHT'
  | 'HEIGHT_MOVE_FORWARD'
  | 'HEIGHT_MOVE_BACK'
  | 'HEIGHT_HOLD_STILL'
  | 'HEIGHT_COMPLETE'
  | 'HEIGHT_TIMEOUT'

export const VOICE_PROMPTS: Record<VoicePromptKey, string> = {
  SERVICE_SELECTION: 'Mời quý khách chọn các dịch vụ cần đo và nhấn Bắt đầu đo.',
  BP_START:
    'Đo huyết áp và nhịp tim. Quý khách vui lòng ngồi thẳng lưng, luồn cánh tay qua vòng đo sao cho khuỷu tay tỳ sát vào điểm đệm cảm biến. Sau đó, nhấn nút START màu xanh trên máy để bắt đầu đo.',
  BP_MEASURING:
    'Máy đang tiến hành đo huyết áp. Quý khách vui lòng thả lỏng toàn thân, giữ yên cánh tay, thở đều và không nói chuyện cho đến khi đo xong.',
  BP_ERROR:
    'Quá trình đo huyết áp chưa thành công. Quý khách vui lòng ngồi thẳng lưng, luồn tay sâu vào vòng đo, tỳ sát cùi chỏ và nhấn nút START trên máy để thực hiện đo lại.',
  BP_ELBOW_OFF:
    'Cảnh báo: Khuỷu tay chưa chạm điểm cảm biến hoặc phát hiện cử động. Quý khách vui lòng đẩy tay sâu hơn, tỳ sát cùi chỏ và nhấn lại nút START trên máy.',
  BP_COMPLETE: 'Đã đo xong huyết áp.',
  INBODY_START:
    'Phân tích chỉ số cơ thể. Quý khách vui lòng tháo giày dép, mũ và vật nặng trong túi, sau đó bước lên máy InBody và làm theo hướng dẫn.',
  INBODY_CONTACT_ERROR:
    'Cảnh báo: Chưa nhận đủ tiếp xúc điện cực. Quý khách vui lòng cầm chắc thanh nắm và đứng yên.',
  INBODY_COMPLETE: 'Đã phân tích xong chỉ số cơ thể.',
  SUMMARY_START:
    'Quá trình khám sức khỏe đã hoàn tất. Quý khách có thể xem kết quả trên màn hình hoặc quét mã QR để lưu lại.',
  SUMMARY_TIMEOUT_10S:
    'Màn hình sẽ đóng sau 10 giây nữa. Quý khách có thể chạm vào màn hình nếu cần xem thêm.',
  SESSION_TERMINATED: 'Cảm ơn quý khách đã sử dụng dịch vụ. Chúc bạn một ngày tốt lành.',

  // Height / ToF Prompts
  HEIGHT_START:
    'Đo chiều cao tự động. Quý khách vui lòng bước vào giữa sàn đo, đứng thẳng người và mắt nhìn thẳng.',
  HEIGHT_STEP_IN: 'Quý khách vui lòng bước vào giữa sàn đo.',
  HEIGHT_LOWER_ARMS: 'Quý khách vui lòng hạ tay xuống để đo chính xác.',
  HEIGHT_ONE_PERSON: 'Quý khách vui lòng chỉ một người đứng trên sàn đo.',
  HEIGHT_MOVE_LEFT: 'Quý khách vui lòng bước sang trái một chút.',
  HEIGHT_MOVE_RIGHT: 'Quý khách vui lòng bước sang phải một chút.',
  HEIGHT_MOVE_FORWARD: 'Quý khách vui lòng bước về phía trước một chút.',
  HEIGHT_MOVE_BACK: 'Quý khách vui lòng bước lùi lại một chút.',
  HEIGHT_HOLD_STILL: 'Quý khách vui lòng đứng thẳng và giữ yên.',
  HEIGHT_COMPLETE: 'Đã đo xong chiều cao.',
  HEIGHT_TIMEOUT: 'Quá thời gian đo chiều cao. Quý khách vui lòng thử lại.',
}
