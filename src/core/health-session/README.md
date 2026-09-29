# Mô-đun Điều phối Phiên Khám Sức Khỏe (Health Session Orchestrator)

Mô-đun Core Layer 2 chịu trách nhiệm quản lý Máy trạng thái XState v5 (`healthSessionMachine`) điều phối luồng tự khám Kiosk 6 bước và đếm lùi 60 giây bảo mật.

---

⚠️ **Cảnh báo & Phân biệt**:

- Mô-đun này là **Session Orchestrator FSM thuần** (Pure Business Logic Engine).
- **KHÔNG** gọi trực tiếp Native Module phần cứng và **KHÔNG** phụ thuộc vào UI Layer 1 & Layer 3.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Đặc tả Kiến trúc FSM 2 Lớp**: [fsm-2-layer-architecture.md](../../../docs/specs/fsm-2-layer-architecture.md)
- **Đặc tả Use Case**: [usecase-specification-v4.0.md](../../../docs/specs/usecase-specification-v4.0.md)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                                             | Trách nhiệm                                      | Chạm Vào/Ra (I/O) |
| :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------- | :---------------- |
| [`index.ts`](file:///d:/promedi/src/core/health-session/index.ts)                                                               | Barrel File xuất ra Public API cho module        | ❌ Logic thuần    |
| [`machines/health-session.machine.ts`](file:///d:/promedi/src/core/health-session/machines/health-session.machine.ts)           | XState v5 State Machine điều phối 6 bước tự khám | ❌ Logic thuần    |
| [`machines/health-session.machine.test.ts`](file:///d:/promedi/src/core/health-session/machines/health-session.machine.test.ts) | Unit tests cho FSM machine (9 tests passed 100%) | ❌ Logic thuần    |
| [`hooks/use-health-session.ts`](file:///d:/promedi/src/core/health-session/hooks/use-health-session.ts)                         | React Hook bọc XState actor                      | ❌ Logic thuần    |
| [`types/health-session.types.ts`](file:///d:/promedi/src/core/health-session/types/health-session.types.ts)                     | TypeScript Context & Event Types cho FSM         | ❌ Logic thuần    |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **XState v5 Pure Actor Architecture**:
   - Máy trạng thái `healthSessionMachine` tách biệt hoàn toàn khỏi UI và Hardware Adapters.
   - UI chỉ tương tác qua việc dispatch Event: `submitIdentification`, `completeBp`, `completeInBody`, `resetSession`, `skipMeasurement`.
   - Luồng FSM Kiosk Thực Tế (không có bước chọn dịch vụ):
     ```
     idle → identification → measureBp → measureInBody → summary → (auto-reset 60s) → idle
     ```
   - **ADR-SESSION-01 (Bỏ serviceSelection)**: Bước `serviceSelection` đã bị xóa khỏi FSM vì Kiosk hiện tại luôn thực hiện cả 2 dịch vụ (Huyết áp + InBody) liên tiếp. Việc giữ state `serviceSelection` khiến FSM bị kẹt chờ sự kiện `SELECT_SERVICES` không bao giờ xảy ra trên UI.
2. **Auto-Transition sau khi đo (ADR-SESSION-02)**:
   - Sau khi phần cứng đo xong, hook `use-bp-measurement` / `use-inbody-measurement` chờ **3 giây** rồi mới dispatch `completeBp` / `completeInBody` vào FSM.
   - Thời gian chờ 3s cho phép: (1) giọng nói thông báo phát xong, (2) khách hàng nhìn thấy màn hình kết quả trước khi nhảy bước.
3. **60s Privacy Timeout Auto Reset (BR-PRIVACY-01)**:
   - State `summary` tự động đếm lùi 60s và xóa sạch dữ liệu phiên khám khi rảnh rỗi.
4. **Root Event Handlers & Tự Phục Hồi (ADR-SESSION-03)**:
   - Các sự kiện `RESET_SESSION`, `START_SESSION`, `SUBMIT_IDENTIFICATION` được đặt tại cấp Root của `healthSessionMachine`.
   - Bất kể máy đang ở trạng thái nào (hoàn tất, bị hủy giữa chừng hoặc gặp lỗi phần cứng), khi người dùng mới bắt đầu hoặc quẹt thẻ, FSM tự động dọn sạch rác phiên cũ và đưa về đúng **Bước 0: Đo Huyết Áp (`measureBp`)**, loại bỏ hoàn toàn lỗi kẹt lại bước InBody.
   - Màn hình `hardware-error.tsx` tuân thủ nguyên tắc **Pure Presentation View** (không can thiệp vào business logic reset).

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

- **Chạy Unit Tests FSM Machine**:
  ```bash
  npx jest src/core/health-session/machines/health-session.machine.test.ts
  ```
- **Kiểm tra TypeScript Strict**:
  ```bash
  npm run check-type
  ```
- **Kiểm tra Linter**:
  ```bash
  npm run lint
  ```
