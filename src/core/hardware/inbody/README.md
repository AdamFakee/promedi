# Mô-đun SDK Phần Cứng InBody 260S (Open Protocol over TCP/IP)

Mô-đun này chịu trách nhiệm điều khiển và giao tiếp với máy phân tích thành phần cơ thể **InBody 260S** thông qua giao thức mở **Open Protocol** trên nền tảng React Native / Expo Kiosk.

---

## ⚠️ Cảnh Báo & Phân Biệt Mô-đun

- **Đối tượng thiết bị**: Chỉ áp dụng cho máy **InBody 260S** giao tiếp qua TCP/IP (Port `2004`) hoặc UART Serial (`19200 8N1`).
- **Phân biệt**: Mô-đun này quản lý chỉ số BIA thành phần cơ thể (BMI, BFM, SMM, WHR, BMR, VFL...), phân biệt hoàn toàn với mô-đun máy đo huyết áp tự động (`src/core/hardware/bp/`).
- **Giao thức**: Bán song công (Half-Duplex), Polling 500ms, tự động cắt khung theo bộ đôi `STX (0x02)` / `ETX (0x03)`.

---

## 🔗 Danh Sách Tham Chiếu (Reference Links)

- [inbody260s-open-protocol-spec.md](file:///d:/promedi/docs/hard-ware/inbody260s-open-protocol-spec.md) — Đặc tả giao thức Hex/ASCII và mảng Index 0-763.
- [AGENTS.md](file:///d:/promedi/AGENTS.md) — Quy tắc kiến trúc 4 lớp và hướng dẫn xử lý phần cứng.

---

## 1. Danh Mục Tệp Mã Nguồn (Source File Directory)

| Tệp (File)                          | Trách nhiệm                                           |  Chạm Vào/Ra (I/O)   |
| :---------------------------------- | :---------------------------------------------------- | :------------------: |
| `types/inbody.types.ts`             | Khai báo Interfaces & Types dữ liệu InBody            |     ❌ Zero I/O      |
| `transport/transport.interface.ts`  | Interface Contract cho phân lớp Transport             |     ❌ Zero I/O      |
| `transport/tcp-transport.ts`        | Socket TCP giao tiếp với InBody qua Port 2004         | ⚠️/🌐 **I/O Socket** |
| `protocol/constants.ts`             | Hằng số mã Hex STX, ETX, ESC, COMMANDS                |     ❌ Zero I/O      |
| `protocol/frame-codec.ts`           | Bộ đóng gói và cắt khung truyền an toàn cho luồng TCP |     ❌ Zero I/O      |
| `protocol/commands.ts`              | Hàm dựng các gói tin Hex ASCII                        |     ❌ Zero I/O      |
| `protocol/result-index-map.ts`      | Bảng tra cứu Index mảng RESULT 0-763                  |     ❌ Zero I/O      |
| `protocol/result-mapper.ts`         | Mapper chuyển mảng dữ liệu sang `InBodyResult`        |     ❌ Zero I/O      |
| `client/inbody-client.ts`           | Client API công khai quản lý gửi/nhận Half-Duplex     | ⚠️/🌐 **I/O Socket** |
| `machine/inbody-session.machine.ts` | State Machine XState v5 điều phối luồng đo & timeout  |     ❌ Zero I/O      |
| `device/inbody.device.ts`           | Adapter triển khai `IMeasurementDevice`               | ⚠️/🌐 **I/O Socket** |
| `hooks/use-inbody-session.ts`       | Custom Hook React Native kết nối UI với XState Actor  |     ❌ Pure Hook     |
| `index.ts`                          | Barrel File xuất Public API cho mô-đun                |     ❌ Zero I/O      |

---

## 2. Các Quyết Định Đã Chốt & Lý Giải Kỹ Thuật (HOW & WHY)

1. **Dependency Inversion (DIP)**: `InBodyClient` không bao giờ import trực tiếp `TcpTransport`. Sự phụ thuộc thông qua `DeviceTransport` interface cho phép dễ dàng mock hoặc thay đổi phương thức kết nối sang Serial/Bluetooth mà không ảnh hưởng logic.
2. **Streaming-Safe Codec**: `FrameCodec` sử dụng buffer lũy thừa và vòng lặp `while` tìm `STX` và `ETX` giúp chống triệt để tình trạng phân mảnh gói tin TCP.
3. **Mã Hóa `latin1` / Sanitize ASCII**: ID người dùng tự động xóa dấu tiếng Việt và giới hạn 14 ký tự ASCII an toàn trước khi đóng gói.
4. **Half-Duplex Mutex Lock**: `InBodyClient` ngăn chặn các lệnh gửi đè nhau trong khoảng delay 400ms-500ms của InBody.
5. **Auto-Pilot Protocol & Zero-Touch UI**: Triệt tiêu hoàn toàn nút bấm trên giao diện Kiosk (kể cả nút "Đo lại"). Mọi tương tác đều tự động hóa ngầm: tự nã gói `INFO` khi chốt cân nặng (`STATUS 1`), tự rút `RESULT` khi đo xong (`STATUS 3`).
6. **Chính sách An ninh Phần cứng (Always-Locked)**: Gửi lệnh `LOCK` vô hiệu hóa phím bấm phần cứng InBody ngay khi mở Kiosk (`connecting` $\rightarrow$ `locking`), và bắt buộc khóa lại trước khi Kiosk chuyển bước (`lockingThenDisconnect`) hoặc ngay sau khi dính lỗi (`relockingError`).
7. **Xác minh Dọn dẹp (Resend Status)**: Áp dụng state `verifyingCompletion` để đợi máy InBody trả về mã `30` (Ready) sau khi kéo `RESULT`, đảm bảo phần cứng đã reset bộ đệm hoàn toàn trước khi cho UI nhảy qua bước đo Huyết áp.

---

## 3. Hướng Dẫn Kiểm Thử (Testing Commands)

```bash
# Chạy toàn bộ 6 Test Suites (26 Unit Tests) của InBody SDK
npx jest src/core/hardware/inbody/__tests__

# Kiểm tra TypeScript strict mode (0 Errors)
npx tsc --noEmit

# Chạy Linter rà soát tiêu chuẩn code (0 Errors)
npm run lint
```
