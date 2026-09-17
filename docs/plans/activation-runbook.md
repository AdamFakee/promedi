# Kế Hoạch Triển Khai & Runbook Nghiệm Thu: Mô-đun Kích Hoạt Thiết Bị (Activation Runbook)

- **Thời gian tạo (Created)**: 2026-09-17 22:18:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-17 23:22:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Sunmi K2 mini - Android Portrait 1080x1920)

---

## 1. Mục tiêu

Nghiệm thu và vận hành mô-đun **Kích hoạt thiết bị (Activation)** tại Màn 0 khi cài đặt Kiosk tại cơ sở y tế:

- Kiểm tra cờ kích hoạt và token làm mới (`auth-refresh-token`) trong bộ nhớ MMKV local storage.
- Cho phép Admin/Kỹ thuật viên nhập **Mã thiết bị** & **Mã kích hoạt**.
- Gọi API xác thực với Backend server, lưu cấu hình cơ sở và tự động mở khóa chuyển sang Màn 1 (Video chờ).
- Tự động thực thi `refreshTokenFlow` khi khởi động ứng dụng để làm mới API tokens thiết bị hoặc khôi phục phiên làm việc offline.

---

## 2. Hiện trạng mã nguồn & Đã xử lý

- **Trạng thái Code**: 100% TypeScript strict mode, 0 lỗi build (`npm run check-type`).
- **Cấu trúc Module**:
  - `components/activation-form.tsx`: Form nhập mã thiết bị và mã kích hoạt.
  - `api/activate-device.ts`: React Query mutation hook gửi yêu cầu kích hoạt lên Server và lưu `refreshToken` vào MMKV storage.
  - `validations/activate-device.schema.ts`: Schema Valibot kiểm tra dữ liệu form không được rỗng.
  - `machines/app.machine.ts`: XState v5 State Machine điều phối vòng đời kích hoạt thiết bị và actor `refreshTokenFlow`.
- **Tài liệu 3 tầng**: Đã hoàn thiện `src/features/activation/README.md` (Nhóm 1), `docs/plans/activation-runbook.md` (Nhóm 2), và `docs/specs/usecase-specification-v4.0.md#uc-00` (Nhóm 3).

---

## 3. Hướng dẫn thực thi từng bước (Step-by-Step)

### Bước 1: Mở Màn hình Kích hoạt Thiết bị (Màn 0)

- **Thao tác**: Khởi chạy ứng dụng Kiosk lần đầu hoặc xóa dữ liệu bộ nhớ đệm app.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Ứng dụng tự động chuyển đến Màn hình 0 (`device-activation.tsx`).
  - Hiển thị duy nhất 1 Logo BMU chính thức và Tiêu đề: **"THÔNG TIN KÍCH HOẠT THIẾT BỊ"**.
  - Hiển thị 2 ô nhập: `Mã Thiết Bị` và `Mã Kích Hoạt`.

### Bước 2: Kiểm tra Validation Form Kích hoạt

- **Thao tác**: Để trống thông tin và bấm nút **"KÍCH HOẠT THIẾT BỊ"**.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Form hiển thị lỗi validation dưới trường tương ứng, không gửi request API.

### Bước 3: Kiểm tra Gửi Mã Kích hoạt Thành công

- **Thao tác**: Nhập Mã thiết bị hợp lệ (VD: `5401`) và Mã kích hoạt (VD: `218202601`), rồi nhấn nút **"KÍCH HOẠT THIẾT BỊ"**.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Nút chuyển trạng thái Loading spinner.
  - API xác thực trả lời HTTP 200 OK cùng thông tin `device`, `accessToken`, `refreshToken`.
  - Bộ nhớ MMKV lưu cờ `device` và `auth-refresh-token`.
  - Hệ thống tự động chuyển `appMachine` sang `authenticated` và điều hướng về **Màn hình 1 (Video rảnh rỗi)**.

---

## 4. Danh mục Kiểm tra nhanh (Checklist)

- [x] Màn hình 0 hiển thị đúng UI Portrait 1080x1920.
- [x] Đã xóa logo trùng lặp, chỉ giữ 1 Logo BMU chuẩn ở đầu trang.
- [x] Footer hiển thị thông tin bản quyền: `Công ty CP Đầu tư và Công nghệ GHD (GHDC)`.
- [x] Form validation Valibot phản hồi mượt mà.
- [x] Kích hoạt thành công lưu cờ local storage, lưu `refreshToken` và điều hướng tự động sang Màn 1.
- [x] Đã kiểm thử tự động 15 Jest Unit Tests (`15/15 PASSED`).
