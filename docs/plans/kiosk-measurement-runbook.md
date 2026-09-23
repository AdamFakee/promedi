# Runbook Triển Khai & Nghiệm Thu Màn Hình Khám & Hướng Dẫn Giọng Nói (Measurement & Voice Guidance Runbook)

- **Thời gian tạo (Created)**: 2026-09-22 14:45:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-22 14:45:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Android) + Máy phân tích cơ thể InBody 260S + Máy đo huyết áp tự động

---

## 1. Mục tiêu

Hướng dẫn từng bước nghiệm thu giao diện quy trình khám 3 bước (`/kiosk/measure`), bao gồm:

1. Đồng bộ hệ thống hướng dẫn giọng nói Tiếng Việt (`VoiceEngine` + `expo-speech`).
2. Giao diện chuẩn hóa tiếng Việt, responsive màn hình Kiosk portrait (1080x1920), tích hợp đường sóng nền Bézier vector (`WaveBackground`).
3. Khả năng bảo mật thông tin khách hàng với bộ đếm lùi 60 giây và tự động xóa phiên khám (`resetSession()`).

---

## 2. Hiện trạng Mã Nguồn & Đã Xử Lý

- **Đã nâng cấp Voice Engine (`src/core/voice-engine/`)**: Tích hợp ma trận giọng nói 10 câu thoại chuẩn, tự động ngắt câu thoại cũ khi chuyển bước nhanh.
- **Đã chuẩn hóa UI Màn hình Kết Quả (`result-summary.tsx`)**: Loại bỏ card bọc card rườm rà, chuẩn hóa các thuật ngữ chỉ số (_Cân Nặng, Khối Lượng Cơ, Tỷ Lệ Mỡ Cơ Thể, Chỉ Số BMI, Tuổi Cơ Thể, Mỡ Nội Tạng, Nước Cơ Thể_).
- **Đã xử lý triệt để 2 lỗi crash Android Native**:
  1. `Cannot use shared object that was already released` (`expo-video`): Thêm `useIsFocused()` giúp unmount `VideoView` an toàn khi rời màn hình chờ.
  2. `NullPointerException: dispatchGetDisplayList` (Reanimated 4): Đã hoãn điều hướng route 120ms sau khi bấm Xác nhận popup để tránh xung đột layout animation với native screen transition.

---

## 3. Hướng Dẫn Thực Thi Từng Bước (Step-by-Step)

### Bước 1: Mở ứng dụng & Bắt đầu phiên khám

- **Thao tác**: Tại màn hình chờ (`/kiosk/idle`), chạm nút **BẮT ĐẦU KHÁM** (`size="xl"`).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Popup định danh hiển thị mượt mà.
  - Video loop nền tự động tạm dừng khi rời màn hình chờ, không phát sinh lỗi native video released.

### Bước 2: Nhập Định danh & Chuyển bước đo

- **Thao tác**: Nhập Họ tên và Số CCCD/SĐT qua Bàn phím số ảo, bấm **Bắt đầu kiểm tra sức khỏe**.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Popup đóng lại, ứng dụng chuyển mượt sang `/kiosk/measure` (Bước 1: Đo Huyết Áp).
  - Giọng nói Kiosk tự động phát: _"Đo huyết áp và nhịp tim. Quý khách vui lòng luồn tay vào vòng đo, tỳ cùi chỏ vào cảm biến và giữ yên."_

### Bước 3: Đo Chỉ Số Cơ Thể InBody

- **Thao tác**: Chuyển sang Bước 2 (Đo Chỉ Số Cơ Thể).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Ảnh hướng dẫn tư thế `inbody_guide_male.webp` hiển thị sắc nét.
  - Giọng nói Kiosk tự động ngắt câu thoại cũ và phát: _"Phân tích chỉ số cơ thể. Quý khách vui lòng tháo giày, đứng lên máy InBody và cầm hai tay nắm."_

### Bước 4: Xem Kết Quả & Quét Mã QR

- **Thao tác**: Chuyển sang Bước 3 (Tổng Hợp Kết Quả).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Bảng chỉ số 4 cột căn chỉnh thẳng hàng.
  - Biểu đồ hình người `SvgDetailedBody` kèm đường chỉ dẫn cơ/mỡ hiển thị sắc nét.
  - Mã QR `react-native-qrcode-svg` sẵn sàng quét.
  - Giọng nói Kiosk phát: _"Quá trình khám sức khỏe đã hoàn tất. Quý khách có thể xem kết quả trên màn hình hoặc quét mã QR để lưu lại."_

### Bước 5: Hoàn tất phiên khám & Xóa dữ liệu bảo mật

- **Thao tác**: Nhấn nút **HOÀN TẤT** (hoặc chờ hết 60s đếm ngược).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Phát câu thoại cảm ơn: _"Cảm ơn quý khách đã sử dụng dịch vụ. Chúc bạn một ngày tốt lành."_
  - Hệ thống tự động xóa sạch dữ liệu phiên khám (`resetSession()`) và trở về màn hình chờ (`/kiosk/idle`).

---

## 4. Danh Mục Kiểm Tra Nhanh (Checklist)

- [x] Tích hợp `WaveBackground` phẳng ở lớp nền bên dưới layout.
- [x] Chuẩn hóa nút bấm base `<Button label="..." size="xl" />`.
- [x] Tự động ngắt âm thanh cũ khi chuyển bước.
- [x] Không còn lỗi crash Reanimated hay Video shared object trên Android.
- [x] Biến môi trường & TypeScript strict mode pass 100% (`npx tsc --noEmit`).
