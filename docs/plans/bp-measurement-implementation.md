---
- **Thời gian tạo (Created)**: 2026-09-28 17:05:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-28 17:05:00 (GMT+7)
- **Trạng thái**: ĐANG THỰC HIỆN
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Android) + Máy đo huyết áp BPBIO 750
---

## 1. Mục tiêu

Triển khai hoàn thiện Giao diện (UI) và Luồng xử lý (Logic) cho **Bước Đo Huyết Áp (UC-04 / Màn 4)**, đảm bảo:

- **Hướng dẫn tối giản**: Loại bỏ hướng dẫn đặt "cùi chỏ" (do chưa ổn định), chỉ giữ lại hướng dẫn luồn tay và giữ yên tĩnh.
- **Lắng nghe thụ động (Passive Listen Mode)**: Không chủ động phát lệnh ép đo (`Start`) hay khóa máy (`Lock`). Kiosk chỉ mở cổng Serial và lắng nghe luồng sự kiện Broadcast 64-byte từ máy đo để tự động chuyển trạng thái (`STA` -> Đang đo, `Completed` -> Đo xong, `Err`/`STP` -> Lỗi/Hủy).
- **Tối ưu Voice Guidance**: Tự động phát âm thanh hướng dẫn ngắn gọn khi vào màn hình. Quan trọng: Nếu người dùng thao tác nhanh (nhấn Start trên máy) khi Voice đang chạy, hệ thống sẽ **ngắt ngay Voice hướng dẫn** và chuyển sang trạng thái "Đang đo" để tránh làm phiền người dùng đã có kinh nghiệm.
- **Không dùng dữ liệu giả (No Mock)**: Chạy thẳng trực tiếp với Native Adapter và phần cứng thật.

## 2. Hiện trạng mã nguồn & Đã xử lý

- Máy trạng thái `bpbio-session.machine.ts` hiện tại đang thiết kế theo luồng chủ động (`requestResult`) với Timeout 2000ms. Cần được cấu trúc lại để phù hợp với chế độ Lắng nghe thụ động (Event-Driven Broadcast).
- Component `BpInstruction` đang chứa văn bản hướng dẫn 2 bước (có bao gồm cùi chỏ). Cần tinh gọn lại thành Component hiển thị trạng thái `idle` và `measuring` (Hiệu ứng "Đang đo huyết áp...").
- Hook `useVoiceGuidance` hiện tại đang gắn ở màn `measure.tsx` nhưng chưa hỗ trợ cơ chế ngắt nhanh (Interrupt) khi nhận tín hiệu từ phần cứng.

## 3. Hướng dẫn thực thi từng bước (Step-by-Step)

### Bước 3.1: Cập nhật XState Machine (`bpbio-session.machine.ts`)

- **Action**: Viết lại FSM theo mô hình **Passive Listen**.
- **State Flow**:
  1. `disconnected` -> (Mở cổng) -> `listening`
  2. `listening` -> (Nhận event `STA`) -> `measuring`
  3. `measuring` -> (Nhận `Completed`) -> `completed` -> (Lưu kết quả & Tiếp tục)
  4. `measuring` -> (Nhận `STP` hoặc `Err`) -> `error`
  5. Cung cấp event `RESET` ở bất kỳ state nào (`error`, `completed`, `measuring`) để đưa máy quay lại trạng thái `listening` ban đầu, dọn dẹp các context cũ.
- **Tiêu chí đạt**: FSM chuyển đúng trạng thái khi Client bắn ra các Event tương ứng, hỗ trợ reset dễ dàng để đo lại, không gọi lệnh `requestResult()` thừa.

### Bước 3.2: Nâng cấp Component `BpInstruction` (`bp-instruction.tsx`)

- **Action**:
  - Giữ nguyên văn bản hướng dẫn tĩnh hiện tại (có nhắc nhở đặt cùi chỏ). **Bỏ qua xử lý các cảnh báo cùi chỏ động** (ELBOW_OFF) do event từ phần cứng trả về chưa ổn định.
  - Nhận prop `status` (`'idle' | 'measuring' | 'error' | 'completed'`).
  - Khi `status === 'measuring'`, ẩn hướng dẫn ban đầu và hiển thị trạng thái UI "Đang đo huyết áp..." (hiệu ứng Pulsing mượt mà qua Reanimated).
  - Có nút hoặc logic hỗ trợ `RESET` đo lại khi ở trạng thái `error`.
- **Tiêu chí đạt**: Giao diện cập nhật nhanh nhạy, code thuần React (Pure Component).

### Bước 3.3: Tích hợp logic vào `measure.tsx` (Hoặc Hook `useBpMeasurement`)

- **Action**:
  - Kết nối `bpbio-session.machine` vào màn hình đo qua `@xstate/react`.
  - Khởi tạo lắng nghe khi `currentStep === 0`.
  - Xử lý cơ chế ngắt giọng nói: Lắng nghe event `STA` từ máy. Gọi hàm `VoiceEngine.stopAll()` (hoặc tương tự) để ngắt voice hướng dẫn nếu đang chạy.
  - Khi nhận `completed`, gọi action `completeBp(bpData)` từ hook `useHealthSession` để lưu kết quả đo (SYS, DIA, Pulse) vào Context và chuyển sang bước tiếp theo.
- **Tiêu chí đạt**: Luồng đo liền mạch. Chạm máy thật là UI phản hồi ngay lập tức, không delay. Voice bị ngắt lập tức khi nhận sự kiện bắt đầu bơm. Kết quả được đẩy thành công vào HealthSession.

## 4. Danh mục Kiểm tra nhanh (Checklist)

- [ ] Viết lại `bpbio-session.machine.ts` sang chế độ Passive Listen (không mock) và hỗ trợ event `RESET`.
- [ ] Giữ nguyên văn bản tĩnh nhắc cùi chỏ, nhưng bỏ qua event báo lỗi ELBOW_OFF.
- [ ] Thêm trạng thái "Đang đo huyết áp..." dạng infinite pulse loading.
- [ ] Tích hợp `VoiceEngine.stop()` khi nhận tín hiệu bơm `STA`.
- [ ] Tích hợp lưu Data kết quả BP vào WatermelonDB thông qua HealthSession sau khi hoàn tất.
- [ ] Test Type-check: `npx tsc --noEmit` (0 Lỗi).
- [ ] Test Linter: `npm run lint` (0 Lỗi).
