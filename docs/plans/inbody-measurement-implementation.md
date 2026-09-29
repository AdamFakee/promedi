---
- **Thời gian tạo (Created)**: 2026-09-29 10:50:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-29 10:50:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Android) + Máy phân tích cơ thể InBody 260S/270/380
---

## 1. Mục tiêu

Triển khai hoàn thiện Giao diện (UI) và Luồng xử lý (Logic) cho **Bước Đo InBody (UC-05 / Bước 2 trong Kiosk)**, đảm bảo:

- **Tự động hóa hoàn toàn luồng kết nối**: Bắt đầu kết nối (CONNECT) TCP và nạp thông tin định danh (`PatientInfo`) vào máy trạng thái ngay khi vào màn hình. Hệ thống sẽ tự động chờ người dùng bước lên cân chốt trọng lượng, sau đó mới đẩy thông tin (INFO) xuống máy InBody phần cứng mà không cần bấm nút.
- **Phản hồi UI trực quan (Progress UI)**: Khi máy vào trạng thái `measuring`, sử dụng biến `context.progress` trong FSM để đè (overlay) một thanh tiến trình (hoặc vòng tròn %) lên trên ảnh Demo hướng dẫn, giúp khách hàng nhận biết máy đang đo.
- **Tối ưu Voice Guidance (Ngắt giọng nói)**: Tương tự như luồng đo huyết áp, hệ thống sẽ tự động gọi lệnh ngắt Audio (VD: `VoiceEngine.stopAll()`) ngay khi máy chuyển sang trạng thái `measuring`, tránh gây ồn ào và làm phiền người đã có kinh nghiệm.
- **Chuyển tiếp tự động trơn tru**: Khi phân tích kết thúc (state `completed`), hệ thống tự động ghi nhận dữ liệu (`InBodyResult`) vào `HealthSession` (Lưu vào WatermelonDB ở tầng Global) và mượt mà chuyển hướng sang màn hình Tổng kết (Result Summary).

## 2. Hiện trạng mã nguồn & Cần xử lý

- Máy trạng thái `inbody-session.machine.ts` đã được thiết kế kiến trúc chuẩn, có khả năng tự Polling STATUS và tự tăng `context.progress` mỗi 500ms khi ở trạng thái đo.
- Component `InBodyInstruction` (`inbody-instruction.tsx`) hiện tại chỉ là UI tĩnh hiển thị 3 bước chữ tĩnh và ảnh tĩnh `inbody_guide_male.webp`, chưa có khả năng render theo biến FSM.
- Hệ thống đang **thiếu** một Custom Hook làm cầu nối (bridge) giữa `useHealthSession` (Global State) và `inbodySessionMachine` (Local Hardware State).

## 3. Hướng dẫn thực thi từng bước (Step-by-Step)

### Bước 3.1: Xây dựng Hook `useInBodyMeasurement` (`use-inbody-measurement.ts`)

- **Vị trí**: `src/features/measure/hooks/use-inbody-measurement.ts`
- **Action**:
  - Viết Hook quản lý Lifecycle của FSM `inbody-session.machine` bằng kỹ thuật **Action Injection (machine.provide)**.
  - Khi Hook mount & `isActive === true`:
    - Gọi FSM gửi event `CONNECT`.
    - Đọc `patientInfo` (Họ tên, tuổi, chiều cao, giới tính) từ Global `useHealthSession()` và đợi máy `ready` để bắn event `START(patientInfo)`.
  - Tiêm các Action phụ thuộc UI qua `.provide()`:
    - Bắt sự kiện chuyển vào state `measuring` để gọi `VoiceEngine.stopAll()`.
    - Khi nhận trạng thái `completed`, gọi hàm `completeInBody(result)` từ `useHealthSession` để chốt số liệu và tự động Next-step.
  - Tự động gọi event `DISCONNECT` khi unmount hoặc rời màn hình. Máy sẽ tự gọi `lockingThenDisconnect` để vĩnh viễn khóa InBody khi Kiosk không dùng.

### Bước 3.2: Nâng cấp Component UI `InBodyInstruction` (`inbody-instruction.tsx`)

- **Vị trí**: `src/features/measure/components/inbody-instruction.tsx`
- **Action**:
  - Sửa đổi Component để nhận props trạng thái từ Hook (VD: `status`, `progress`, `errorCode`).
  - **Lớp Overlay (Đè lên ảnh Demo)**:
    - Khi `status === 'measuring'`, tạo một lớp sương mù phủ lên ảnh demo, render tiến trình quét sinh học %.
  - **Quản lý lỗi (Auto-pilot Zero-Touch)**:
    - Khi `status === 'error'`, chỉ hiển thị cảnh báo tương ứng. **Tuyệt đối KHÔNG có nút bấm "Đo lại"**. FSM sẽ tự động gửi `SKIP` và khôi phục trạng thái chờ máy InBody chốt lại cân nặng. Kiosk là Zero-Touch.

### Bước 3.3: Tích hợp vào `measure.tsx`

- **Vị trí**: `src/app/(kiosk)/measure.tsx`
- **Action**:
  - Gắn `useInBodyMeasurement(currentStep === 1)`.
  - Truyền các giá trị bóc tách từ Hook vào Component `InBodyInstruction` mà không truyền bất kỳ callback tương tác vật lý nào (No `onReset`).

## 4. Danh mục Kiểm tra nhanh (Checklist)

- [x] Tạo file `use-inbody-measurement.ts` đóng gói logic InBody Machine (Action Injection).
- [x] Hook tự động `CONNECT` & Gửi `PatientInfo` khi vào bước 1.
- [x] Tích hợp `VoiceEngine.stopAll()` khi bắt đầu `measuring`.
- [x] Nâng cấp UI `InBodyInstruction`: Hiện % Progress Bar overlay, Xóa bỏ hoàn toàn nút bấm thủ công.
- [x] Cấu hình FSM: `initializing` (Gửi SKIP dọn dẹp lỗi cũ), `lockingThenDisconnect`, `relockingError` và `verifyingCompletion` (Resend Status 30).
- [x] Hook tự động lưu Data kết quả InBody vào `HealthSession` sau khi hoàn tất & sang màn Summary.
- [x] Test Type-check: `npx tsc --noEmit` (0 Lỗi).
- [x] Test Linter: `npm run lint` (0 Lỗi).
