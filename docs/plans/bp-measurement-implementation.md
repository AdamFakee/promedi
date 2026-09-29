---
- **Thời gian tạo (Created)**: 2026-09-28 17:05:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-28 17:05:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Android) + Máy đo huyết áp BPBIO 750
---

## 1. Mục tiêu

Triển khai hoàn thiện Giao diện (UI) và Luồng xử lý (Logic) cho **Bước Đo Huyết Áp (UC-04 / Màn 4)**, đảm bảo:

- **Hướng dẫn tối giản**: Loại bỏ hướng dẫn đặt "cùi chỏ" (do chưa ổn định), chỉ giữ lại hướng dẫn luồn tay và giữ yên tĩnh.
- **Lắng nghe thụ động (Passive Listen Mode)**: Không chủ động phát lệnh ép đo (`Start`) hay khóa máy (`Lock`). Kiosk chỉ mở cổng Serial và lắng nghe luồng sự kiện Broadcast 64-byte từ máy đo để tự động chuyển trạng thái (`STA` -> Đang đo, `Completed` -> Đo xong, `Err`/`STP` -> Lỗi/Hủy).
- **Tối ưu Voice Guidance**: Tự động phát âm thanh hướng dẫn ngắn gọn khi vào màn hình. Quan trọng: Nếu người dùng thao tác nhanh (nhấn Start trên máy) khi Voice đang chạy, hệ thống sẽ **ngắt ngay Voice hướng dẫn** và chuyển sang trạng thái "Đang đo" để tránh làm phiền người dùng đã có kinh nghiệm.
- **Auto-Pilot Tự phục hồi**: Nếu có lỗi xảy ra (rút tay, rung lắc), UI không có nút "Đo lại", thay vào đó FSM sẽ tự động reset về trạng thái chờ (`listening`) sau 5 giây. Không yêu cầu tương tác chạm (Zero-Touch).

## 2. Hiện trạng mã nguồn & Đã xử lý

- Máy trạng thái `bpbio-session.machine.ts` đã được thiết kế theo luồng thụ động (Passive Listen).
- Đã áp dụng mẫu kiến trúc **Action Injection (`machine.provide`)** để bơm các Side-effects (Voice, UI) vào FSM từ Custom Hook.
- Bỏ hoàn toàn nút bấm thủ công trên UI Kiosk.

## 3. Hướng dẫn thực thi từng bước (Step-by-Step)

### Bước 3.1: Cập nhật XState Machine (`bpbio-session.machine.ts`)

- **Action**: Viết lại FSM theo mô hình **Passive Listen**.
- **State Flow**:
  1. `disconnected` -> (Mở cổng) -> `listening`
  2. `listening` -> (Nhận event `STA`) -> `measuring`
  3. `measuring` -> (Nhận `Completed`) -> `completed` -> (Lưu kết quả & Tiếp tục)
  4. `measuring` -> (Nhận `STP` hoặc `Err`) -> `error`
  5. Khi vào `error`, hệ thống đợi 5 giây (`after: 5000`) và tự động reset về `listening`.
- **Tiêu chí đạt**: FSM chuyển đúng trạng thái khi Client bắn ra các Event tương ứng, hỗ trợ reset tự động, không gọi lệnh requestResult thừa.

### Bước 3.2: Nâng cấp Component `BpInstruction` (`bp-instruction.tsx`)

- **Action**:
  - Giữ nguyên văn bản hướng dẫn tĩnh. Bỏ xử lý sự kiện động.
  - Khi `status === 'measuring'`, ẩn hướng dẫn tĩnh và hiển thị trạng thái UI "Đang đo huyết áp..." (hiệu ứng Pulsing mượt mà qua Reanimated).
  - Khi `status === 'error'`, báo lỗi và thông báo máy sẽ tự động đo lại. **Tuyệt đối không sử dụng nút bấm**.
- **Tiêu chí đạt**: Giao diện cập nhật nhanh nhạy, Pure Component, Zero-touch Kiosk.

### Bước 3.3: Tích hợp logic vào `measure.tsx` (Hoặc Hook `useBpMeasurement`)

- **Action**:
  - Kết nối `bpbio-session.machine` vào màn hình đo qua `@xstate/react`.
  - Tiêm các hàm điều khiển `VoiceEngine` vào `machine.provide`. Lắng nghe ngắt voice ngay khi bắt đầu đo.
  - Khi nhận `completed`, chốt số liệu vào Context và chuyển sang bước tiếp theo.
- **Tiêu chí đạt**: Luồng đo liền mạch.

## 4. Danh mục Kiểm tra nhanh (Checklist)

- [x] Viết lại `bpbio-session.machine.ts` sang chế độ Passive Listen (không mock) và Auto-Reset (after 5s).
- [x] Triển khai Action Injection Pattern qua `machine.provide`.
- [x] Thêm trạng thái "Đang đo huyết áp..." dạng infinite pulse loading. Bỏ qua nút bấm.
- [x] Tích hợp `VoiceEngine.stop()` khi nhận tín hiệu bơm `STA`.
- [x] Tích hợp lưu Data kết quả BP vào WatermelonDB thông qua HealthSession sau khi hoàn tất.
- [x] Test Type-check: `npx tsc --noEmit` (0 Lỗi).
- [x] Test Linter: `npm run lint` (0 Lỗi).
