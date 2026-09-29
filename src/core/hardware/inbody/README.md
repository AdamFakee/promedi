# Mô-đun SDK Phần Cứng InBody 260S (Open Protocol over USB Serial)

Mô-đun này chịu trách nhiệm điều khiển và giao tiếp với máy phân tích thành phần cơ thể **InBody 260S** thông qua giao thức mở **Open Protocol** trên nền tảng React Native / Expo Kiosk.

---

## ⚠️ Cảnh Báo & Phân Biệt Mô-đun

- **Đối tượng thiết bị**: Chỉ áp dụng cho máy **InBody 260S** giao tiếp qua **USB Serial (`19200 8N1`)** — cổng vật lý DB9 chân 2/3/5 qua dongle USB-to-Serial.
- **Phân biệt**: Mô-đun này quản lý chỉ số BIA thành phần cơ thể (BMI, BFM, SMM, WHR, BMR, VFL...), phân biệt hoàn toàn với mô-đun máy đo huyết áp tự động (`src/core/hardware/bpbio/`).
- **Giao thức**: Bán song công (Half-Duplex), Polling 500ms, tự động cắt khung theo bộ đôi `STX (0x02)` / `ETX (0x03)`.

---

## 🔗 Danh Sách Tham Chiếu (Reference Links)

- [inbody260s-open-protocol-spec.md](file:///d:/promedi/docs/hard-ware/inbody260s-open-protocol-spec.md) — Đặc tả giao thức Hex/ASCII và mảng Index 0-763.
- [AGENTS.md](file:///d:/promedi/AGENTS.md) — Quy tắc kiến trúc 4 lớp và hướng dẫn xử lý phần cứng.

---

## 1. Danh Mục Tệp Mã Nguồn (Source File Directory)

| Tệp (File)                          | Trách nhiệm                                          |   Chạm Vào/Ra (I/O)   |
| :---------------------------------- | :--------------------------------------------------- | :-------------------: |
| `types/inbody.types.ts`             | Khai báo Interfaces & Types dữ liệu InBody           |      ❌ Zero I/O      |
| `transport/transport.interface.ts`  | Interface Contract cho phân lớp Transport            |      ❌ Zero I/O      |
| `transport/usb-serial-transport.ts` | USB Serial giao tiếp với InBody 19200 8N1 qua dongle | ⚠️ **I/O USB Serial** |
| `protocol/constants.ts`             | Hằng số mã Hex STX, ETX, ESC, COMMANDS               |      ❌ Zero I/O      |
| `protocol/frame-codec.ts`           | Bộ đóng gói và cắt khung truyền an toàn              |      ❌ Zero I/O      |
| `protocol/commands.ts`              | Hàm dựng các gói tin Hex ASCII                       |      ❌ Zero I/O      |
| `protocol/result-index-map.ts`      | Bảng tra cứu Index mảng RESULT 0-763                 |      ❌ Zero I/O      |
| `protocol/result-mapper.ts`         | Mapper chuyển mảng dữ liệu sang `InBodyResult`       |      ❌ Zero I/O      |
| `client/inbody-client.ts`           | Client API công khai quản lý gửi/nhận Half-Duplex    | ⚠️ **I/O USB Serial** |
| `machine/inbody-session.machine.ts` | State Machine XState v5 điều phối luồng đo & timeout |      ❌ Zero I/O      |
| `device/inbody.device.ts`           | Adapter triển khai `IMeasurementDevice`              | ⚠️ **I/O USB Serial** |
| `hooks/use-inbody-session.ts`       | Custom Hook React Native kết nối UI với XState Actor |     ❌ Pure Hook      |
| `index.ts`                          | Barrel File xuất Public API cho mô-đun               |      ❌ Zero I/O      |

---

## 2. Các Quyết Định Đã Chốt & Lý Giải Kỹ Thuật (HOW & WHY)

1. **Dependency Inversion (DIP)**: `InBodyClient` không bao giờ import trực tiếp `UsbSerialTransport`. Sự phụ thuộc thông qua `DeviceTransport` interface cho phép dễ dàng mock hoặc thay đổi phương thức kết nối mà không ảnh hưởng logic.
2. **Streaming-Safe Codec**: `FrameCodec` sử dụng buffer lũy thừa và vòng lặp `while` tìm `STX` và `ETX` giúp chống triệt để tình trạng phân mảnh gói tin USB Serial (từng byte một).
3. **Mã Hóa `latin1` / Sanitize ASCII**: ID người dùng tự động xóa dấu tiếng Việt và giới hạn 14 ký tự ASCII an toàn trước khi đóng gói.
4. **Half-Duplex Mutex Lock**: `InBodyClient` ngăn chặn các lệnh gửi đè nhau trong khoảng delay 400ms-500ms của InBody.
5. **Auto-Pilot Protocol & Zero-Touch UI**: Triệt tiêu hoàn toàn nút bấm trên giao diện Kiosk (kể cả nút "Đo lại"). Mọi tương tác đều tự động hóa ngầm: tự nã gói `INFO` khi chốt cân nặng (`STATUS 1`), tự rút `RESULT` khi đo xong (`STATUS 3`).
6. **UNLOCK-first khi vào màn đo (ADR-INBODY-01)**: Khi Kiosk bắt đầu phiên đo mới, state `locking` gửi **UNLOCK `'2'`** (thay vì LOCK `'1'`). Lý do: InBody 260S tự động quay về trạng thái LOCK (`'4'`) sau mỗi lượt đo hoặc khi phiên cũ chưa được dọn dẹp. Gửi UNLOCK trước đảm bảo cảm biến cân hoạt động và khách hàng có thể bước lên. LOCK `'1'` chỉ xảy ra khi rời màn đo (`lockingThenDisconnect`) hoặc sau lỗi (`relockingError`) để bảo mật thiết bị.
7. **getDeviceKey từ bindingStore**: Machine nhận `getDeviceKey: () => Promise<string | undefined>` thay vì hardcode config — cho phép resolve `deviceKey` USB Serial động từ `BindingStore` (MMKV) lúc runtime, tương tự pattern của `bpbio-session.machine`.
8. **3s Delay sau khi đo xong**: `onMeasurementCompleted` action trong `use-inbody-measurement.ts` chờ 3 giây trước khi dispatch `completeInBody` để giọng nói hướng dẫn phát xong và khách hàng kịp nhìn thấy màn hình hoàn tất.
9. **Sequential Async Poller (Tránh Race Condition Mutex)**: Thay thế `setInterval` bằng vòng lặp tuần tự bất đồng bộ `pollLoop` (gọi lệnh kế tiếp qua `setTimeout` sau khi lượt trước đã hoàn tất). Điều này triệt tiêu xung đột Half-Duplex Mutex Lock khi InBody phản hồi chậm (~450-550ms), loại bỏ hoàn toàn lỗi văng sang màn hình lỗi `KIOSK_HARDWARE_ERROR` giả.
10. **Sanitize NULL Byte (`0x00`) trong FrameCodec**: Gói tin STATUS thực tế từ phần cứng có dạng `02 63 30 00 03`. `FrameCodec` hỗ trợ phân cách trường bằng regex `[\x1B\x00]` và làm sạch ký tự `\0` + `.trim()` để khớp chuẩn với `STATUS_CODE`.
11. **Safety Guard `MEASURING` trong `waitingForWeight`**: Nếu máy InBody bắt đầu quét BIA sớm trước khi Kiosk kịp chuyển bước, State Machine tự động chuyển thẳng sang state `measuring` và ngắt voice hướng dẫn.

---

## 3. Hướng Dẫn Kiểm Thử (Testing Commands)

```bash
# Chạy toàn bộ 7 Test Suites (30 Unit Tests) của InBody SDK
npx jest src/core/hardware/inbody/__tests__

# Kiểm tra TypeScript strict mode (0 Errors)
npx tsc --noEmit

# Chạy Linter rà soát tiêu chuẩn code (0 Errors)
npm run lint
```
