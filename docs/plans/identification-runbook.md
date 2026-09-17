# Kế Hoạch Triển Khai & Runbook Nghiệm Thu: Mô-đun Định Danh Khách Hàng (Identification Runbook)

- **Thời gian tạo (Created)**: 2026-09-17 16:55:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-17 16:55:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Sunmi K2 mini - Android Portrait 1080x1920)

---

## 1. Mục tiêu

Nghiệm thu và vận hành mô-đun **Định danh khách hàng (Identification)** trên thiết bị Kiosk thực tế:

- Hiển thị Popup Modal `"NHẬP THÔNG TIN CÁ NHÂN"` khi người dùng bấm Đăng Ký Khám tại Màn hình rảnh rỗi (`idle.tsx`).
- Cho phép nhập 2 thông tin bắt buộc: **Họ và tên** & **Số Căn cước công dân (CCCD đúng 12 chữ số)**.
- Phím bấm Virtual Numpad phản hồi tức thì (60fps), không giật lag.
- Tự động xóa sạch dữ liệu tạm khi đóng Modal hoặc hoàn tất phiên.

---

## 2. Hiện trạng mã nguồn & Đã xử lý

- **Trạng thái Code**: 100% TypeScript strict mode, 0 lỗi build (`npm run check-type`).
- **Tối ưu phím số Numpad**:
  - `mode: 'onSubmit'` trong `useForm` ngắt kết nối Valibot validation đồng bộ trên từng phím bấm.
  - Bọc `VirtualNumpad` bằng `React.memo` giúp 11 nút bấm không bị re-render khi nhập ký tự.
  - Sử dụng `getValues('identityCode')` trong `useCallback` loại bỏ hoàn toàn re-render ở Modal cha.
- **Ràng buộc định danh**: Valibot Schema kiểm tra ngầm định `/^\d{12}$/` cho Số CCCD và chuỗi không trống cho Họ tên.
- **Phản hồi Haptics**: Bọc safe catch `Haptics.impactAsync().catch(() => {})` an toàn cho Kiosk Android không haptic motor.

---

## 3. Hướng dẫn thực thi từng bước (Step-by-Step)

### Bước 1: Khởi chạy Ứng dụng Kiosk trên Android Sunmi K2 mini

- **Thao tác**: Chạy lệnh ứng dụng Expo/React Native trên thiết bị Kiosk.
  ```bash
  npm run android
  ```
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Video hướng dẫn rảnh rỗi (`video-intro.mp4`) phát vòng lặp mượt mà không nhấp nháy shutter.
  - Nút **"Đăng Ký Khám"** hiển thị rõ ràng trên màn hình.

### Bước 2: Kiểm tra Mở Popup Định danh

- **Thao tác**: Chạm vào nút **"Đăng Ký Khám"**.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Popup Modal xuất hiện căn giữa màn hình với tiêu đề **"NHẬP THÔNG TIN CÁ NHÂN"**.
  - Hiển thị 2 ô nhập có dấu sao đỏ bắt buộc (`Họ và tên *` và `Số CCCD *`).
  - Nút hành động hiển thị text: **"Bắt đầu kiểm tra sức khỏe"**.

### Bước 3: Kiểm tra Hiệu năng Phím bấm Virtual Numpad

- **Thao tác**: Bấm nhanh liên tục các phím số từ 0 đến 9 và phím xóa `SvgDeleteIcon`.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Các chữ số xuất hiện ngay lập tức trong ô `Số CCCD` mà không có độ trễ (Zero Lag).
  - Không bị giật khung hình (60fps).

### Bước 4: Kiểm tra Ràng buộc Validation 12 số CCCD

- **Thao tác 4a**: Để trống thông tin và bấm **"Bắt đầu kiểm tra sức khỏe"**.
  - _Tiêu chí_: Hiển thị lỗi `"Vui lòng nhập Họ và tên"` và `"Vui lòng nhập số căn cước công dân"`.
- **Thao tác 4b**: Nhập Họ tên và nhập Số CCCD chưa đủ 12 số (VD: 9 số hoặc 10 số SĐT) rồi bấm **"Bắt đầu kiểm tra sức khỏe"**.
  - _Tiêu chí_: Hiển thị thông báo lỗi `"Số căn cước công dân phải đúng 12 chữ số"`.
- **Thao tác 4c**: Nhập đúng Họ tên và 12 chữ số CCCD hợp lệ rồi bấm **"Bắt đầu kiểm tra sức khỏe"**.
  - _Tiêu chí_: Form submit thành công và chuyển sang Màn 3 (Chọn dịch vụ cần đo).

---

## 4. Danh mục Kiểm tra nhanh (Checklist)

- [x] Popup Modal mở mượt mà qua imperative ref handle (`open`/`close`).
- [x] Tiêu đề Popup chuẩn: **"NHẬP THÔNG TIN CÁ NHÂN"**.
- [x] Nút bấm Form chuẩn: **"Bắt đầu kiểm tra sức khỏe"**.
- [x] Ô nhập có dấu sao đỏ `*` bắt buộc cho cả Họ tên & Số CCCD.
- [x] Bàn phím số Numpad bấm mượt 60fps không trễ lag.
- [x] Validation kiểm tra chính xác 12 chữ số CCCD.
- [x] Haptics bọc safe catch không gây crash trên Android Kiosk.
- [x] Nút đóng `SvgCloseIcon` dọn dẹp sạch form state (`reset()`).
