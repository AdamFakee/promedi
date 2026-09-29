# Mô-đun Huyết áp InBody BPBIO 750 (BPBIO Module)

Mô-đun quản lý vòng đời kết nối, giao thức truyền tin (64-byte Hex) và trích xuất dữ liệu chỉ số đo Huyết áp/Nhịp tim từ máy InBody BPBIO 750 thông qua cổng Serial/USB.

⚠️ **Đoạn Cảnh báo & Phân biệt**: Mô-đun này điều khiển máy huyết áp bằng cơ chế **Passive Listening** (chỉ mở cổng và ngồi im nghe máy quăng data về, khách hàng tự bấm nút cứng trên máy), phân biệt hoàn toàn với mô-đun InBody 270/380 (chủ động bắn lệnh đo xuống máy qua Active Polling).

**Danh sách Tham chiếu (Reference Links)**:

- [Đặc tả Use Case V4.0 (Quy trình đo & Mã lỗi)](../../../../docs/specs/usecase-specification-v4.0.md)
- [Kiến trúc FSM 2 Lớp (Tầng Orchestrator vs Adapter)](../../../../docs/specs/fsm-2-layer-architecture.md)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                | Trách nhiệm                                                                                                                     | Chạm Vào/Ra (I/O)              |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------- |
| `client/bpbio-client.ts`           | Wrapper kết nối `ITransport` cổng COM. Lắng nghe luồng byte, gom buffer và kích hoạt callback khi nhận đủ frame dữ liệu hợp lệ. | ⚠️ **I/O** (Đọc/Ghi phần cứng) |
| `machine/bpbio-session.machine.ts` | Cỗ máy XState v5 điều phối kết nối, auto-retry, bắt sự kiện đo và gọi action (XState Native, không dính dáng React).            | ❌ Logic thuần                 |
| `protocol/frame-codec.ts`          | Tầng Byte Manipulation. Dịch chuỗi Uint8Array 64-byte sang số và ngược lại, validate Checksum.                                  | ❌ Logic thuần                 |
| `protocol/event-parser.ts`         | Phân tích ý nghĩa Event (VD: Đo xong, Lỗi rụt tay, Bơm xả khí) từ mảng byte đã giải mã.                                         | ❌ Logic thuần                 |
| `types/bpbio.types.ts`             | Định nghĩa Type/Interface cho Payload, Trạng thái và Event nội bộ mô-đun.                                                       | ❌ Logic thuần                 |
| `__tests__/*.test.ts`              | Tập hợp các bài Unit Test độc lập cho Frame Codec, Machine và Client.                                                           | ❌ Logic thuần                 |
| `index.ts`                         | Barrel File Root (Chỉ export đúng Client, Machine, Types ra bên ngoài).                                                         | ❌ Logic thuần                 |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

- **Quyết định 1: Kiến trúc FSM 2 Lớp & Tiêm Action (Action Injection)**
  - _Tại sao?_ Tách biệt logic Phần cứng khỏi UI/React. Máy trạng thái `bpbio-session.machine.ts` chỉ khai báo "lỗ cắm" (Action placeholders rỗng). Các Side-effects (tắt âm thanh, chuyển màn hình báo lỗi, ném data lên Store) sẽ do `useBpMeasurement.ts` tiêm ngược (inject) vào máy thông qua hàm `.provide()`.
  - _Lợi ích?_ Chống rò rỉ bộ nhớ (Memory leak), chống render dư thừa của React, máy trạng thái có thể Unit Test 100% trong Node.js, cắt đứt hoàn toàn Require Cycle.

- **Quyết định 2: Tự động Retry 3 lần (Auto-Reconnect)**
  - _Tại sao?_ Cáp USB Serial môi trường bệnh viện dễ bị lỏng nhịp. Nếu FSM vào `connecting` mà lỗi, nó tự động nhảy sang `waiting_retry` (đợi 1s) rồi thử lại tối đa 3 lần trước khi quăng cờ `connection_error` lên màn hình đỏ.

- **Quyết định 3: Tách đứt `bindingStore` (MMKV) ra khỏi Machine**
  - _Tại sao?_ Trước đây Machine tự `import { bindingStore }` để lấy ID cổng USB dẫn đến Lỗi Dependency Cycle. Nay đã được refactor: Hook phải đọc `bindingStore` rồi bơm ID cổng vào tham số `input` lúc khởi tạo Machine. Machine hoàn toàn "sạch" I/O cục bộ.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

Do mô-đun đã được tách bạch Logic/IO rõ ràng, bạn có thể Unit Test 100% các logic nhúng (Event Parser, Frame Codec, FSM) mà không cần nối cáp máy huyết áp:

- Chạy bộ Unit Test cho máy Huyết áp:
  ```bash
  npx jest src/core/hardware/bpbio
  ```
- Kiểm tra tính chặt chẽ của TypeScript (Không được có bất kì lỗi Type nào đỏ):
  ```bash
  npx tsc --noEmit
  ```
- Kiểm tra Linter:
  ```bash
  npm run lint
  ```
