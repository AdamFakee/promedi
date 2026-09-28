# Kế Hoạch & Ma Trận Use Case Kiểm Thử Thiết Bị Phần Cứng (Dual USB-Serial & TCP/IP Transport)

- **Thời gian tạo (Created)**: 2026-09-24 16:45:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-24 16:45:00 (GMT+7)
- **Trạng thái**: ĐÃ SẴN SÀNG KIỂM THỬ (READY FOR TESTING)
- **Thiết bị mục tiêu**: Kiosk Sunmi K2 Mini (Android Host / Web Simulator) + Máy phân tích cơ thể InBody 260S + Máy đo huyết áp BPBIO750 (Kết nối Dual USB-Serial CH340/FTDI & TCP Socket)

---

## 1. Mục Tiêu

Tài liệu này xác định đầy đủ các kịch bản kiểm thử (Use Cases & Test Cases) cho tầng phần cứng **Hardware Abstraction Layer (HAL)** tại `src/core/hardware/`, bao gồm:

1. **2 Thiết bị phần cứng cổng Serial**:
   - **InBody 260S**: Máy phân tích thành phần cơ thể (Baud rate `19200 8N1`, giao thức khung biến-độ-dài `STX`/`ETX`/`ESC`, Polling STATUS 500ms, parse 764 bytes Hex/ASCII).
   - **BPBIO750**: Máy đo huyết áp tự động (Baud rate `9600 8N1`, giao thức khung cố định 16-byte, Checksum `BCC` XOR, thu thập & ghép 3 gói `S`/`D`/`P`, tự động reset bộ đệm trùng lặp).
2. **Kênh truyền mạng TCP/IP Socket (`TcpTransport`)**:
   - Giao tiếp socket không chặn qua LAN/Wi-Fi (`IP:Port 2004`).
   - Bảo toàn mảng byte nhị phân thô Hex (`latin1` encoding).
   - Quản lý timeout kết nối, phát hiện ngắt kết nối mạng (`onClose`) và phục hồi tự động.
3. **Cơ chế Dò cổng tự động (Device Resolver)**:
   - Fast-path verification qua MMKV Cache.
   - Handshake Probe trên cổng ảo `probe:role` phân định thiết bị khi dùng chung chip USB (CH340/FTDI).
4. **Xử lý ngoại lệ & Biên (Exception & Boundary Cases)**:
   - Rút cáp đột ngột, nhiễu byte checksum, lỗi cử động tay, tuột bao đo, timeout 3x no-ETX.

---

## 2. Hiện Trạng Mã Nguồn & Kiến Trúc Phần Cứng

- **Thư mục mã nguồn**: `src/core/hardware/`
- **Native Module USB Serial**: `expo-usb-serial-bridge` (tích hợp `usb-serial-for-android` v3.11.0).
- **Socket TCP Transport**: `src/core/hardware/transport/tcp-transport.ts` (tích hợp `react-native-tcp-socket`).
- **State Machines**: `inbodySessionMachine` (`inbody-session.machine.ts`) & `bpbioSessionMachine` (`bpbio-session.machine.ts`).
- **Device Resolver**: `src/core/hardware/resolver/device-resolver.ts` & `binding-store.ts` (MMKV).

---

## 3. Danh Sách Các Use Case Kiểm Thử (Detailed Test Cases)

---

### 🅰️ NHÓM A: THIẾT BỊ SERIAL 1 — MÁY PHÂN TÍCH CƠ THỂ INBODY 260S (USB-SERIAL 19200 8N1)

#### UC-SER-INBODY-01: Khởi Tạo Kết Nối Serial & Polling Trạng Thái Ban Đầu (Idle Status '0')

- **Mục đích**: Kiểm tra khả năng mở cổng USB-Serial 19200 8N1 và bắt đầu chu kỳ Polling STATUS 500ms.
- **Tiền điều kiện**: Máy InBody 260S đã bật nguồn, cắm cáp USB vào Kiosk, chưa có người đứng lên cân.
- **Các bước thực thi**:
  1. Khởi tạo `InBodyDevice` với `UsbSerialTransport` (Baud `19200`).
  2. Kích hoạt lệnh `connect()`.
  3. Gọi `startMeasurement()` để phát tín hiệu Polling STATUS (`0x73`).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Cổng USB mở thành công, `isConnected() === true`.
  - Thiết bị phản hồi khung byte: `STX (0x02)` -> Status `'0'` -> `ETX (0x03)`.
  - State machine chuyển sang trạng thái `waitingForWeight`.

#### UC-SER-INBODY-02: Nhận Diện Cân Nặng & Gửi Gói Thông Tin Định Danh (Status '1' ➔ INFO)

- **Mục đích**: Xác nhận máy InBody đo xong trọng lượng và nhận thành công thông tin khách hàng (ID, Tuổi, Giới tính, Chiều cao).
- **Tiền điều kiện**: Máy InBody đang ở trạng thái `waitingForWeight` (Status `'0'`).
- **Các bước thực thi**:
  1. Khách hàng bước lên cân InBody.
  2. Máy InBody tự động cân trọng lượng và trả về Status `'1'`.
  3. SDK tự động đóng gói lệnh `INFO` gửi thông tin định danh và gửi lệnh `LOCK 1` (Khóa thiết bị).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Máy InBody kêu tiếng "Bíp" xác nhận nhận đủ dữ liệu INFO.
  - State machine chuyển mượt từ `waitingForWeight` ➔ `sendingInfo` ➔ `measuring`.

#### UC-SER-INBODY-03: Đo BIA & Cập Nhật Tiến Trình Đo (Status '2' Progress 5% - 95%)

- **Mục đích**: Kiểm tra luồng Polling STATUS liên tục trong suốt quá trình đo điện trở sinh học BIA.
- **Tiền điều kiện**: Khách hàng đang đứng trên cân và cầm 2 tay nắm electrod.
- **Các bước thực thi**:
  1. Máy InBody tiến hành quét dòng điện đa tần số qua 4 cực từ tay đến chân.
  2. SDK tiếp tục Polling STATUS 500ms một lần.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Thiết bị trả về Status `'2'` kèm giá trị % tiến trình.
  - SDK phát event `PROGRESS` đều đặn với payload `%` tăng dần từ 5% ➔ 95%.
  - Màn hình UI hiển thị thanh Progress Bar cập nhật theo thời gian thực.

#### UC-SER-INBODY-04: Thu Thập & Giải Mã 764 Bytes Kết Quả BIA (Status '3' ➔ RESULT Data Parsing)

- **Mục đích**: Kiểm tra quá trình nhận gói kết quả thô Hex/ASCII và parse thành đối tượng `InBodyMetrics`.
- **Tiền điều kiện**: Quá trình đo BIA hoàn tất, máy InBody trả về Status `'3'`.
- **Các bước thực thi**:
  1. SDK phát hiện Status `'3'`, lập tức gửi lệnh yêu cầu dữ liệu kết quả (`0x72` - RESULT).
  2. Nhận chuỗi byte thô 764 bytes giữa `STX` và `ETX`.
  3. Đưa qua `InBodyResultMapper.parse()` để giải mã.
  4. Gửi lệnh `LOCK 2` để mở khóa máy (Unlock).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Chuỗi byte 764-byte được parse chính xác 100% không bị mất thông số.
  - Trả về đối tượng `InBodyMetrics` chứa đầy đủ: _Cân nặng (Weight), Khối lượng cơ (SMM), Tỷ lệ mỡ (PBF), BMI, Tuổi cơ thể, Nước cơ thể (TBW), Mỡ nội tạng (VFL)_.
  - State machine chuyển sang trạng thái `completed`.

---

### 🅱️ NHÓM B: THIẾT BỊ SERIAL 2 — MÁY ĐO HUYẾT ÁP BPBIO750 (USB-SERIAL 9600 8N1)

#### UC-SER-BPBIO-01: Khởi Tạo Kết Nối Serial & Gửi Lệnh Yêu Cầu Kết Quả (REQUEST_RESULT 0x43)

- **Mục đích**: Kiểm tra mở cổng USB-Serial 9600 8N1 và sẵn sàng nhận dữ liệu từ BPBIO750.
- **Tiền điều kiện**: Máy đo huyết áp BPBIO750 bật nguồn, cắm cáp USB vào Kiosk K2 Mini.
- **Các bước thực thi**:
  1. Khởi tạo `BpbioDevice` với `UsbSerialTransport` (Baud `9600`).
  2. Kích hoạt `connect()`.
  3. Gọi `startMeasurement()` -> SDK gửi lệnh `REQUEST_RESULT` (`0x43`).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Kết nối cổng Serial 9600 thành công.
  - State machine chuyển sang trạng thái `collectingResult`.

#### UC-SER-BPBIO-02: Thu Thập & Ghép 3 Gói Dữ Liệu Đơn Lẻ (`S` Systolic, `D` Diastolic, `P` Pulse)

- **Mục đích**: Xác nhận bộ giải mã `BpbioFrameCodec` cắt đúng khung 16-byte cố định, kiểm tra Checksum `BCC` và ghép đủ 3 gói dữ liệu.
- **Tiền điều kiện**: Khách hàng xỏ tay vào bao đo và nhấn nút START trên máy BPBIO750.
- **Các bước thực thi**:
  1. Máy BPBIO750 thực hiện bơm hơi và xả xẹp vòng đo.
  2. Sau khi đo xong, máy gửi 3 khung 16-byte nối tiếp nhau chứa ký tự nhận diện `S`, `D`, `P`.
  3. Codec kiểm tra byte Checksum XOR (`BCC === raw[15]`).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Cả 3 gói `S` (Huyết áp tâm thu), `D` (Huyết áp tâm trương), `P` (Nhịp tim) được thu thập đầy đủ.
  - Checksum `BCC` hợp lệ 100%.
  - Ghép thành công đối tượng `BloodPressureMetrics` (Ví dụ: `systolic: 120`, `diastolic: 80`, `pulseRate: 72`).
  - State machine chuyển sang trạng thái `completed`.

#### UC-SER-BPBIO-03: Tự Động Reset Bộ Đệm Khi Nhận Identifier Trùng Lặp (Duplicate Reset Safety)

- **Mục đích**: Đảm bảo không bị ghép nhầm dữ liệu của 2 lần đo khác nhau nếu người dùng hủy đo giữa chừng.
- **Tiền điều kiện**: Lần đo 1 bị dừng đột ngột (chỉ mới truyền được gói `S`), người dùng thực hiện lượt đo mới.
- **Các bước thực thi**:
  1. Lần đo 1: Nhận gói `S` (Ví dụ: `systolic = 135`).
  2. Khách hàng rút tay ra làm ngắt đo giữa chừng.
  3. Lần đo 2: Khách hàng nhấn đo lại. Máy gửi gói `S` mới (Ví dụ: `systolic = 118`).
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Khi nhận gói `S` thứ hai, `BpbioClient` tự động phát hiện `identifier` `'S'` đã tồn tại trong bộ đệm pending.
  - Lập tức xóa bỏ gói `S` cũ (135) và ghi nhận gói `S` mới (118).
  - Kết quả cuối cùng ghép đúng dữ liệu của lần đo 2, không bị rác dữ liệu cũ.

---

### 🌐 NHÓM C: KÊNH TRUYỀN MẠNG TCP/IP SOCKET (`TcpTransport`)

#### UC-TCP-01: Kết Nối Socket TCP Thành Công Tới Máy Đo Qua LAN / Wi-Fi

- **Mục đích**: Kiểm tra khả năng kết nối mạng không qua cổng USB vật lý, áp dụng cho máy đo hỗ trợ Module LAN TCP/IP.
- **Tiền điều kiện**: Máy InBody 260S kết nối chung mạng nội bộ LAN/Wi-Fi với Kiosk, địa chỉ IP cố định (Ví dụ: `192.168.1.100`, Port `2004`).
- **Các bước thực thi**:
  1. Khởi tạo `TcpTransport`.
  2. Gọi `connect({ type: 'tcp', host: '192.168.1.100', port: 2004, connectTimeoutMs: 5000 })`.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Socket TCP mở thành công trong thời gian dưới 5000ms.
  - `isConnected() === true`.

#### UC-TCP-02: Bảo Toàn Mảng Byte Nhị Phân Thô Hex Qua TCP Socket (`latin1` Encoding)

- **Mục đích**: Kiểm tra xem các byte Hex nhị phân thô (`0x02`, `0x03`, `0x1B`, `0x80`..`0xFF`) có bị biến dạng mã hóa khi đi qua Socket hay không.
- **Tiền điều kiện**: Socket TCP đã kết nối thành công.
- **Các bước thực thi**:
  1. Gửi mảng byte nhị phân thô chứa STX (`0x02`), ETX (`0x03`), ESC (`0x1B`) và các byte ASCII/Hex trên `0x7F`.
  2. Đọc luồng byte phản hồi từ event `onData()`.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Thư viện `TcpTransport` dùng encoding `'latin1'` giúp giữ nguyên từng byte nhị phân thô (Zero data corruption).
  - `FrameCodec` phân tách đúng frame `STX`/`ETX` mà không bị lệch vị trí byte.

#### UC-TCP-03: Xử Lý Thất Bại Kết Nối TCP & Timeout Socket (`CONNECT_FAILED`)

- **Mục đích**: Đảm bảo ứng dụng xử lý êm đẹp khi máy đo bị tắt nguồn mạng hoặc sai IP/Port.
- **Tiền điều kiện**: Nhập sai IP (`192.168.1.250`) hoặc rút dây mạng của máy đo.
- **Các bước thực thi**:
  1. Gọi `connect({ type: 'tcp', host: '192.168.1.250', port: 2004, connectTimeoutMs: 3000 })`.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Hết 3000ms, bộ đếm timeout kích hoạt, hủy socket và ném lỗi `TransportError` với mã `'CONNECT_FAILED'`.
  - Ứng dụng không bị treo UI, hiển thị thông báo toast: _"Không thể kết nối máy đo qua mạng TCP/IP"_.

#### UC-TCP-04: Phát Hiện Sự Cố Đóng Kết Nối Mạng Đột Ngột (`onClose` Event)

- **Mục đích**: Bắt sự kiện rớt mạng LAN/Wi-Fi lúc đang trong phiên đo.
- **Tiền điều kiện**: Socket TCP đang kết nối và trao đổi dữ liệu.
- **Các bước thực thi**:
  1. Rút dây mạng LAN hoặc ngắt Wi-Fi của trạm Kiosk.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Event `onClose()` của `TcpTransport` được kích hoạt ngay lập tức.
  - Cập nhật `isConnected() === false`.
  - State machine chuyển về trạng thái `disconnected` và thông báo ngắt kết nối.

---

### 🔍 NHÓM D: CƠ CHẾ DÒ CỔNG TỰ ĐỘNG (DEVICE RESOLVER & PROBE HANDSHAKE)

#### UC-RES-01: Dò Tự Động 2 Cổng Serial Bằng Probe Handshake Không Phụ Thuộc Cổng Cắm

- **Mục đích**: Đảm bảo khi cắm 2 dây cáp USB (InBody và BPBIO) vào bất kỳ cổng USB nào trên Kiosk, hệ thống vẫn tự nhận diện đúng thiết bị mà không bị nhầm lẫn.
- **Tiền điều kiện**: 2 dongle USB-to-Serial dùng cùng loại chip CH340 (`VID:1A86`, `PID:7523`).
- **Các bước thực thi**:
  1. Xóa cache MMKV cũ.
  2. Gọi `DeviceResolver.resolveAll()`.
  3. Resolver mở cổng ảo `probe:role` với Baud 19200 gửi tín hiệu STATUS InBody. Nếu không phản hồi, thử mở Baud 9600 gửi tín hiệu BPBIO.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Gán đúng vai trò: `inbody` ➔ USB Port A, `bpbio` ➔ USB Port B.
  - Việc probe không làm ảnh hưởng hay đóng nhầm cổng của thiết bị đang hoạt động.

#### UC-RES-02: Tối Ưu Tốc Độ Khởi Động Qua Fast-Path MMKV Cache Verification

- **Mục đích**: Giúp Kiosk khởi động lại nhanh chóng mà không cần chạy lại quy trình Probe Scan tốn thời gian.
- **Tiền điều kiện**: Đã hoàn tất gán vai trò cổng ở lần chạy trước, dữ liệu đã lưu vào `BindingStore` (MMKV).
- **Các bước thực thi**:
  1. Khởi động lại ứng dụng ProMedi Kiosk.
  2. Gọi `DeviceResolver.resolveAll()`.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Resolver đọc cache từ MMKV và chạy `verifyBinding()`.
  - Bắt tay thành công ngay ở bước Fast-Path (< 300ms), không cần quét lại tất cả các cổng USB.

---

### ⚠️ NHÓM E: XỬ LÝ NGOẠI LỆ & BIÊN (EXCEPTION & BOUNDARY TEST CASES)

#### UC-ERR-01: Khách Hàng Cử Động Tay / Tuột Bao Đo BPBIO (Timeout 2000ms Collector)

- **Mục đích**: Xử lý tình huống người dùng nhúc nhích tay hoặc bao đo quấn lỏng làm máy BPBIO xả hơi sớm và không gửi đủ 3 gói.
- **Tiền điều kiện**: Máy BPBIO750 đang bơm hơi đo huyết áp.
- **Các bước thực thi**:
  1. Khách hàng nói chuyện hoặc cử động tay mạnh.
  2. Máy BPBIO ngắt đo giữa chừng, chỉ gửi 1 gói `S` rồi dừng.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - `bpbioSessionMachine` chờ hết timeout 2000ms mà không nhận đủ gói `D` và `P`.
  - Tự động chuyển sang trạng thái `deviceError`.
  - Voice Engine phát giọng nói hướng dẫn: _"Phát hiện di chuyển. Vui lòng thả lỏng tay, giữ yên và bấm đo lại."_

#### UC-ERR-02: Rút Cáp USB Vật Lý Đột Ngột Lúc Đang Đo (`DEVICE_DETACHED`)

- **Mục đích**: Đảm bảo hệ thống không bị crash khi cáp USB bị lỏng hoặc người dùng vô tình rút dây cáp.
- **Tiền điều kiện**: Thiết bị InBody hoặc BPBIO đang ở giữa phiên đo.
- **Các bước thực thi**:
  1. Rút cáp USB nối với Kiosk.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Native listener `SerialInputOutputManager.Listener` bắt sự kiện `onRunError` và bắn event `DEVICE_DETACHED`.
  - State machine lập tức chuyển về `disconnected`.
  - Hiển thị thông báo Toast đỏ: _"Mất kết nối thiết bị đo. Vui lòng kiểm tra cáp cắm USB."_

#### UC-ERR-03: Lỗi Nhiễu Tín Hiệu Serial / Sai Byte Checksum `BCC`

- **Mục đích**: Đảm bảo các mảng byte rác do nhiễu điện từ không gây ra sai lệch dữ liệu y tế.
- **Tiền điều kiện**: Gửi một khung truyền bị biến dạng byte xuống SDK.
- **Các bước thực thi**:
  1. Giả lập gói dữ liệu BPBIO 16-byte có byte cuối `BCC !== XOR_SUM`.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - `BpbioFrameCodec.tryParseDataFrame()` phát hiện `BCC` không hợp lệ.
  - Âm thầm loại bỏ gói rác, không đẩy dữ liệu sai vào State Machine, không gây crash ứng dụng.

#### UC-ERR-04: Timeout 3 Lần Không Nhận Byte Kết Thúc `ETX` InBody (3x No-ETX Timeout 800ms)

- **Mục đích**: Xử lý tình huống truyền dở dang gói BIA của InBody 260S.
- **Tiền điều kiện**: Máy InBody gửi gói tin nhưng bị đứt đoạn giữa chừng (thiếu byte `0x03` ETX).
- **Các bước thực thi**:
  1. SDK chờ nhận byte `ETX` (`0x03`).
  2. Bộ đếm thời gian 800ms hết hạn mà chưa nhận đủ frame.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - SDK tự động thử lại (Retry) tối đa 3 lần.
  - Nếu sau 3 lần vẫn thất bại, FSM chuyển sang `transportTimeout` và gửi lệnh RESET/UNLOCK để đưa máy InBody trở về trạng thái an toàn.

---

## 4. Hướng Dẫn Vận Hành Popup Modal `HardwareTestModal` Trên Kiosk

### 4.1 Vị trí và Cách kích hoạt Modal

- **Màn hình gắn**: Đặt duy nhất tại màn hình chờ / Màn 1 Idle (`src/app/(kiosk)/idle.tsx`).
- **Nút kích hoạt**: Nút bấm nổi phía trên bên phải màn hình `🛠 TEST HARDWARE (15 UCs)`.
- **Chi tiết giao diện**: Modal kích thước lớn (92% chiều rộng màn hình dọc Kiosk K2 Mini), gồm Header, Thanh Tab Navigation, Danh sách Use Case, Log Console thời gian thực và Inspector Modal xem Hex/JSON chi tiết.

### 4.2 Cấu trúc 7 Tab Kiểm Thử

| Tab       | Tên Tab                      | Nội dung và Mục đích                                                                                                                                                                                                                                                                             |
| --------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tab 0** | `📋 TUẦN TỰ 15 BƯỚC`         | Luồng kiểm thử thủ công 15 bước theo trình tự từ Step 01/15 đến Step 15/15 bao quát toàn bộ vòng đời phiên khám.                                                                                                                                                                                 |
| **Tab 1** | `🔬 8 TEST SUNMI THẬT`       | Bộ 8 bài test nghiệm thu phần cứng Sunmi K2 Mini thật: Mục 0 (Device Claim), Mục 0-RAW (`listRawUsbDevices`), Mục 1 (BCC Checksum), Mục 2 (Serial Params), Mục 3 (ACK Response), Mục 4 (Cross-talk Probe Safety), Mục 5 (DTR/RTS powering), Mục 6 (USB Auto-grant), Mục 7 (Fast-Path Benchmark). |
| **Tab 2** | `⚖️ INBODY 260S (5 UCs)`     | Test chuyên sâu 5 Use Cases độc lập cho máy phân tích cơ thể InBody 260S.                                                                                                                                                                                                                        |
| **Tab 3** | `🫀 BPBIO750 (4 UCs)`        | Test chuyên sâu 4 Use Cases độc lập cho máy đo huyết áp tự động BPBIO750.                                                                                                                                                                                                                        |
| **Tab 4** | `🌐 TCP SOCKET (4 UCs)`      | Test chuyên sâu 4 Use Cases cho truyền nhận mạng Socket TCP (`192.168.1.100:2004`).                                                                                                                                                                                                              |
| **Tab 5** | `🔍 RESOLVER (2 UCs)`        | Test cơ chế tự dò cổng USB và Fast-Path Cache MMKV.                                                                                                                                                                                                                                              |
| **Tab 6** | `⚠️ FAULT INJECTION (4 UCs)` | Tiêm lỗi giả lập (Fault Injection): Cử động tay, Rút cáp USB, Sai Checksum BCC, Timeout 3x No-ETX.                                                                                                                                                                                               |

### 4.3 Chi Tiết Bộ 8 Bài Test Sunmi K2 Mini Thật (Tab 1: `🔬 8 TEST SUNMI THẬT`)

1. **MỤC 0: Enumerate & Open Drivers (Claim Check)**:
   - Thực thi: Gọi `UsbSerialBridge.listDevices()` và mở cổng driver đầu tiên tìm thấy.
   - Mục đích: Xác minh hệ điều hành Sunmi Android OS không bị service OEM chiếm quyền độc quyền USB.
2. **MỤC 0-RAW: Enumeration Cổng USB Thô (`listRawUsbDevices`)**:
   - Thực thi: Gọi `UsbSerialBridge.listRawUsbDevices()` quét tất cả các thiết bị USB đang cắm vào Kiosk.
   - Mục đích: Liệt kê Vendor ID (VID), Product ID (PID), Device Class và Device Name của mọi cổng USB kết nối (USB Hub, Scanner, Touch screen, Serial dongle).
3. **MỤC 1: Thuật Toán Checksum BCC XOR BPBIO750 Thật**:
   - Thực thi: Gửi khung 16-byte mẫu và kiểm tra `BCC === XOR_SUM(bytes[5..14])`.
   - Mục đích: Kiểm chứng thuật toán tính checksum XOR chính xác tuyệt đối trên byte thô.
4. **MỤC 2: Thông Số Serial 9600 8N1 BPBIO750 Thật**:
   - Thực thi: Cấu hình Baudrate 9600, 8 Data bits, 1 Stop bit, Parity NONE.
   - Mục đích: Đảm bảo chip USB-to-Serial giữ đúng thông số truyền nhận 9600 8N1.
5. **MỤC 3: Phản Hồi Byte ACK (`0x06`) BPBIO750**:
   - Thực thi: Gửi lệnh `LOCK` (`0x4C`) / `UNLOCK` (`0x55`) `[16 16 01 30 30 02 31 4C 03]` và lắng nghe byte phản hồi.
   - Mục đích: Xác nhận máy BPBIO750 thật có trả về byte ACK `0x06` khi nhận lệnh điều khiển.
6. **MỤC 4: Cross-Talk Probe Safety (An Toàn Nhiễu Lệnh Chéo)**:
   - Thực thi: Gửi lệnh `STATUS` (`0x73`) của InBody xuống máy BPBIO750 và lệnh `REQUEST_RESULT` (`0x43`) của BPBIO xuống máy InBody.
   - Mục đích: Đảm bảo 2 thiết bị không bị treo hay phản hồi rác khi nhận nhầm lệnh của nhau.
7. **MỤC 5: Tín Hiệu DTR/RTS Powering**:
   - Thực thi: Mở cổng với cờ `dtr = true` và `rts = true`.
   - Mục đích: Cấp điện nuôi mạch chuyển đổi tín hiệu RS232 cho các dòng dongle USB-to-Serial CH340 / FTDI.
8. **MỤC 6 & 7: USB Auto-Grant & Fast-Path MMKV Benchmark**:
   - Thực thi: Thử cấp quyền tự động không hiện popup system Android và đo thời gian truy xuất Fast-Path MMKV (< 50ms).

### 4.4 Detail Inspector Popup Modal (Xem Hex / JSON Thô)

- Bấm vào nút `🔍 XEM NATIVE HEX / JSON DETAILED LOGS` tại góc trên Console Log để mở Inspector Modal.
- Hiển thị tab `SENT HEX PAYLOAD`, `RECV HEX PAYLOAD`, và `DECODED JSON OBJECT`.
- Hỗ trợ nút `Copy Hex Bytes` và `Copy Decoded JSON` để kỹ thuật viên sao chép gửi báo cáo.

---

## 5. Danh Mục Kiểm Tra Nhanh (Checklist Nghiệm Thu)

- [x] **Serial InBody 260S**: Test thành công luồng Polling STATUS, gửi INFO, tiến trình % và parse 764 bytes kết quả.
- [x] **Serial BPBIO750**: Test thành công ghép 3 gói `S`/`D`/`P`, kiểm tra Checksum `BCC` và cờ Duplicate Reset Safety.
- [x] **TCP/IP Transport**: Test kết nối Socket TCP thành công, bảo toàn byte `latin1`, timeout 5s và sự kiện `onClose`.
- [x] **Device Resolver**: Test tự động dò cổng USB qua Probe Handshake và xác thực Fast-Path Cache qua MMKV.
- [x] **Biên & Ngoại lệ**: Test rút cáp USB đột ngột (`DEVICE_DETACHED`), cử động tay BPBIO, nhiễu Checksum và Timeout 3x No-ETX.
- [x] **Tích hợp Modal Test UI**: Mount `HardwareTestModal` duy nhất trên `src/app/(kiosk)/idle.tsx` với đầy đủ 7 Tab và 23 Test items.
- [x] **Native raw USB enumeration**: `listRawUsbDevices` tích hợp thành công trên Android Native Bridge.
- [x] **Chất lượng mã nguồn**: Chạy `npx tsc --noEmit` (0 Errors) & `npm run lint` (0 Errors).
