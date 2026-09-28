# Mô-đun Quản Lý Phần Cứng & Thiết Bị Đo Y Tế (`src/core/hardware/`)

Mô-đun Core Hardware Abstraction Layer (HAL) cung cấp trình điều khiển đa cổng USB-Serial tự động, kết nối và điều khiển máy phân tích thành phần cơ thể **InBody 260S** và máy đo huyết áp tự động **BPBIO750** trên Kiosk Sumi/Sunmi K2 Mini.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt Trách nhiệm**:
>
> - Mô-đun này **chỉ chịu trách nhiệm giao tiếp phần cứng, mã hóa/giải mã giao thức nhị phân/ASCII, tự dò cổng USB và quản lý FSM phiên đo**.
> - **KHÔNG** chứa giao diện UI chính (giao diện khám thuộc `src/features/measure-inbody/` và `src/features/measure-bp/`).
> - **Giao diện Kiểm thử phần cứng**: Đóng gói tại Popup Modal `HardwareTestModal` (`src/shared/components/common/hardware-test-modal.tsx`), được mount duy nhất tại Màn 1 Idle (`src/app/(kiosk)/idle.tsx`).
> - **KHÔNG** phát âm thanh trực tiếp (việc phát giọng nói hướng dẫn do `VoiceEngine` tại `src/core/voice-engine/` đảm nhận).
> - **KHÔNG** tự ghi cơ sở dữ liệu SQLite / WatermelonDB (việc lưu dữ liệu do Session Machine tổng `health-session.machine.ts` đảm nhận).

---

## 🔗 Danh Sách Tham Chiếu (Reference Links)

- [Kế Hoạch & Ma Trận Use Case Kiểm Thử 15 Bước & 8 Test Sunmi Thật](file:///d:/promedi/docs/plans/hardware-test-cases-serial-tcp.md)
- [Tài liệu Đặc tả Kiến trúc SDK USB-Serial V4.0](file:///d:/promedi/docs/specs/device-sdk-usb-serial-architecture.md)
- [Đặc tả Use Case Nghiệp vụ V4.0](file:///d:/promedi/docs/specs/usecase-specification-v4.0.md)
- [Giao thức Gốc InBody 260S Open Protocol](file:///d:/promedi/docs/hard-ware/inbody260s-open-protocol-spec.md)
- [Native Module `expo-usb-serial-bridge`](file:///d:/promedi/modules/expo-usb-serial-bridge/)

---

## 1. Đang có gì (Bảng Danh Mục Tệp & Trách Nhiệm)

| Tệp / Thư mục                                            | Trách nhiệm                                                                  |     Chạm Vào/Ra (I/O)     |
| :------------------------------------------------------- | :--------------------------------------------------------------------------- | :-----------------------: |
| `types/measurement-device.interface.ts`                  | Generic Interface `IMeasurementDevice` cho mọi máy đo                        |        ❌ Zero I/O        |
| `transport/usb-serial-transport.ts`                      | JS Wrapper giao tiếp Native Bridge kèm timeout `Promise.race`                | ⚠️ **I/O Native Bridge**  |
| `transport/tcp-transport.ts`                             | Trình vận chuyển TCP Socket (dự phòng)                                       |     🌐 **I/O Socket**     |
| `transport/transport-factory.ts`                         | Factory khởi tạo Transport theo type (`usb-serial` / `tcp`)                  |        ❌ Zero I/O        |
| `resolver/device-resolver.ts`                            | Logic tự dò cổng USB bắt tay Handshake Probe & Verify Cache                  | ⚠️ **I/O Hardware Probe** |
| `resolver/binding-store.ts`                              | Lưu trữ Binding giữa Role (`inbody`/`bpbio`) và `deviceKey` vào MMKV         |  ⚠️ **I/O Storage MMKV**  |
| `resolver/device-probes.ts`                              | Khai báo Probe Signature kiểm tra phản hồi InBody và BPBIO                   |        ❌ Zero I/O        |
| `inbody/protocol/frame-codec.ts`                         | Cắt khung truyền STX/ETX/ESC InBody biến-độ-dài                              |        ❌ Zero I/O        |
| `inbody/protocol/result-mapper.ts`                       | Parse 764 chỉ số Hex/ASCII InBody sang Object                                |        ❌ Zero I/O        |
| `inbody/client/inbody-client.ts`                         | Public Client API InBody, Polling STATUS 500ms, Mutex Lock                   |    ⚠️ **I/O Hardware**    |
| `inbody/machine/inbody-session.machine.ts`               | XState v5 State Machine điều khiển phiên đo InBody                           |        ❌ Zero I/O        |
| `inbody/device/inbody.device.ts`                         | Device Adapter InBody 260S implement `IMeasurementDevice`                    |    ⚠️ **I/O Hardware**    |
| `bpbio/protocol/frame-codec.ts`                          | Parse khung 16-byte BPBIO750 cố định + Checksum `BCC`                        |        ❌ Zero I/O        |
| `bpbio/client/bpbio-client.ts`                           | Client gom 3 gói `S`/`D`/`P` BPBIO, tự reset dữ liệu trùng lặp               |    ⚠️ **I/O Hardware**    |
| `bpbio/machine/bpbio-session.machine.ts`                 | XState v5 State Machine BPBIO kèm timeout 2000ms thu thập dữ liệu            |        ❌ Zero I/O        |
| `bpbio/device/bpbio.device.ts`                           | Device Adapter BPBIO750 implement `IMeasurementDevice`                       |    ⚠️ **I/O Hardware**    |
| `index.ts`                                               | Public Barrel Export cho toàn bộ Hardware Layer                              |        ❌ Zero I/O        |
| `../../shared/components/common/hardware-test-modal.tsx` | Popup Modal Test Hardware Suite 15 UCs + 8 Test Sunmi Thật + Inspector Modal | ⚠️ **I/O Native & Mock**  |

---

## 2. Các Quyết Định Đã Chốt & Lý Giải Kỹ Thuật (HOW & WHY)

1. **Vì sao dùng Native Module `expo-usb-serial-bridge` thay vì TTY File Path?**
   - Thư viện `usb-serial-for-android` (v3.11.0) đã tích hợp sẵn toàn bộ driver chip (CH340/FTDI/CP210x) qua USB Host API chuẩn của Android `UsbManager`. Việc này loại bỏ nhu cầu tự duy trì code JNI/C++ mức thấp và chạy ổn định trên fleet Kiosk.

2. **Vì sao bổ sung API `listRawUsbDevices()`?**
   - `listDevices()` chỉ liệt kê các thiết bị đã match với USB Serial Prober drivers (CH340/FTDI/CP210x). `listRawUsbDevices()` truy vấn trực tiếp `usbManager.deviceList` để quét toàn bộ thiết bị USB thô đang kết nối vào Kiosk (USB Hub, Barcode scanner, Touchscreen controller) phục vụ nghiệm thu phần cứng Sunmi K2 Mini.

3. **Vì sao phải dùng Device Resolver (Probe Handshake) thay vì gán cố định VID/PID?**
   - 2 dongle USB-to-Serial có thể dùng cùng loại chip (cùng VID/PID như CH340 `1A86:7523`). Hệ điều hành Android không thể phân biệt dây nào cắm vào InBody, dây nào cắm vào BPBIO. Resolver tự gửi tín hiệu probe hỏi thử để tự động gán role mà không cần sửa code theo từng trạm Kiosk.

4. **Vì sao Probe phải dùng Namespace `probe:role` cho `portId`?**
   - Để tránh việc lệnh probe lúc khởi động hoặc lúc admin quét lại âm thầm đóng cổng thật (`inbody` hoặc `bpbio`) đang đo dữ liệu trực tiếp.

5. **Vì sao BPBIO Client phải tự reset `pending` khi gặp `identifier` trùng lặp?**
   - Khi người dùng cử động tay hoặc hủy đo giữa chừng, máy BPBIO750 có thể gửi dở dở 1-2 gói (ví dụ chỉ có `S` và `D`). Khi chu kỳ đo mới bắt đầu, máy gửi lại gói `S` mới. Nếu không reset `pending`, chỉ số `D` cũ sẽ bị ghép nhầm với `S` và `P` mới, làm sai lệch chỉ số huyết áp mà không báo lỗi.

6. **Vì sao Popup Modal `HardwareTestModal` được mount duy nhất tại Màn 1 Idle?**
   - Giúp kỹ thuật viên dễ dàng truy cập và kiểm thử độc lập 15 UCs + 8 bài test phần cứng thật mà không gây ảnh hưởng hay xung đột FSM với các màn hình đo của người dùng cuối.

7. **Vì sao BPBIO Probe và Client phải có cơ chế cộng dồn (accumulate) byte?**
   - Máy đo huyết áp BPBIO truyền dữ liệu qua cổng Serial với Baud rate 9600. Tốc độ này kết hợp với Sunmi K2 Mini Android OS sẽ gây ra hiện tượng phân mảnh gói tin (nhận từng chunk 1-2 bytes ở sự kiện `onData`). Do đó, BẮT BUỘC phải dùng mảng cộng dồn (`accumulatedBytes`) và bộ định thời (`setTimeout` 1500ms - 3000ms tùy lệnh) để hứng đủ byte thay vì parse chuỗi ngay khi nhận từng chunk, tránh lỗi Timeout hoặc mất mát tín hiệu.

---

## 3. Hướng Dẫn Kiểm Thử & Chạy Lệnh

```bash
# 1. Kiểm tra TypeScript Strict Mode (Bắt buộc 0 Errors)
npx tsc --noEmit

# 2. Kiểm tra Code Style & Quality Linter (Bắt buộc 0 Errors)
npm run lint

# 3. Thực thi toàn bộ Unit Tests cho Hardware Layer
npx jest src/core/hardware
```
