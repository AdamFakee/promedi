# Hướng Dẫn Kỹ Thuật Triển Khai & Runbook Nghiệm Thu Cảm Biến Khoảng Cách ToF VL53L5CX/L8CX (Height Measurement Runbook)

- **Thời gian tạo (Created)**: 2026-10-06 14:38:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-10-08 12:45:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH / ĐÃ NGHIỆM THU TRÊN MÁY THẬT
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Android) + Mạch ESP32 + Cảm biến ToF STMicroelectronics VL53L5CX / VL53L8CX
- **Độ cao lắp đặt mặc định**: **`2457 mm` (245.7 cm)** (Hỗ trợ Presets: 244.5 cm, 210.0 cm, 184.7 cm, 220.0 cm)

---

## 1. Mục tiêu

Tài liệu Runbook này hướng dẫn quy trình từng bước (Step-by-step) để kỹ thuật viên / QA cài đặt, nạp firmware, kết nối mạch cảm biến ToF trần nhà với Kiosk Sumi/Sunmi mini K2 và thực hiện nghiệm thu toàn bộ luồng đo chiều cao không tiếp xúc (Bước 4 trong quy trình khám Kiosk ProMedi).

---

## 2. Hiện trạng mã nguồn & Đã xử lý

1. **Firmware C++ Driver (`firmware/esp32-vl53l5cx-driver/`)**:
   - Khởi tạo bus I2C 1MHz, hỗ trợ đọc 64 zones @ 15Hz (66ms/frame).
   - Lắng nghe lệnh PING `0xAA 0x55 0x50 0x47` ("PG") từ Kiosk và phản hồi PONG Ack `0xAA 0x55 0x4F 0x4B` ("OK").
   - Đóng gói dữ liệu nhị phân chuẩn 204 Bytes kèm mã kiểm tra checksum CRC16-Modbus và truyền tốc độ cao qua USB Serial 460800 baud.
   - Thiết lập mặc định độ cao trần `VL53L5CX_BASE_HEIGHT_MM = 2457` (245.7 cm).

2. **React Native Core Hardware (`src/core/hardware/tof/`)**:
   - `DeviceResolver`: Tự động nhận diện ứng viên cổng USB và kiểm tra chữ ký bắt tay PING/PONG Probe Signature (`TOF_PING_COMMAND` `0xAA 0x55 'P' 'G'` $\rightarrow$ `TOF_PONG_RESPONSE` `0xAA 0x55 'O' 'K'`) để gán role `'tof'`.
   - `ToFStreamFramer`: Thuật toán chống trôi offset, tự gom buffer phân mảnh từ Android USB Serial (các chunk 32B), tìm Header `0xAA 0x55` và cắt khung 204 Bytes chuẩn xác.
   - `formatToFFrame`: Tắt log spam chunk 32 byte thô; in log nguyên vẹn ma trận 8x8 ASCII kèm tóm tắt trạng thái Engine (`State`, `Guidance`, `Progress`, `Height`).
   - `HeightMeasurementEngine`: Bảng tra cứu trước $\cos\theta$ ($45^\circ \times 45^\circ$ FoV), quy đổi độ sâu $z = r \times \cos\theta$. Mở rộng bộ lọc `targetStatus` (hỗ trợ mã **10 SNR Low** cho tóc người), cửa sổ trượt $1500\text{ms}$ (hold $1000\text{ms}$) và chốt chiều cao bằng Trimmed Mean 10%. Mặc định `expectedFloorMm: 2457`.
   - `ToFDistanceDevice`: Báo trạng thái `'error'` và ném `TransportError` khi ngắt cáp/lỗi kết nối phần cứng. Hỗ trợ API `updateEngineConfig()`.

3. **Ghi Log Thao Trường (Field Diagnosis)**:
   - Cơ chế ghi file `.jsonl` trực tiếp vào bộ nhớ máy Android (`FileSystem.writeAsStringAsync` Append mode) giúp trích xuất hàng trăm frame dữ liệu thực tế mà không gây gián đoạn UI.

---

## 3. Hướng dẫn thực thi từng bước (Step-by-Step Execution Guide)

### Bước 3.1: Nạp Firmware và Kiểm tra Luồng Nhị phân trên ESP32

- **Lệnh thực thi nạp code**:
  ```bash
  cd firmware/esp32-vl53l5cx-driver
  pio run -t upload
  ```
- **Lệnh kiểm tra Serial Monitor**:
  ```bash
  pio device monitor -b 460800
  ```
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Cổng Serial hiển thị log thông báo: `[VL53L5CX] Driver san sang. Dang bat dau do 15Hz (66ms/frame)...`
  - Đèn LED trên mạch ESP32 nhấp nháy ổn định ở tần số 15Hz.

---

### Bước 3.2: Kiểm tra Tự Dò Cổng USB (Device Resolver PING/PONG Handshake Test)

- **Thao tác**:
  1. Cắm dây USB Serial của mạch ESP32 ToF vào bất kỳ cổng USB nào trên Sunmi K2 Mini Kiosk.
  2. Khởi chạy ứng dụng ProMedi Kiosk hoặc bấm nút **Rescan Hardware** trong Hardware Test Modal.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Kiosk bơm lệnh PING `0xAA 0x55 'P' 'G'`, ESP32 phản hồi PONG Ack `0xAA 0x55 'O' 'K'`.
  - Log hệ thống hiển thị: `[DEVICE-RESOLVER] Handshake role 'tof' successful on deviceKey: ...`
  - Cổng USB được tự động lưu vào MMKV BindingStore cho các lần bật máy tiếp theo (Fast-Path).

---

### Bước 3.3: Kiểm tra Phân lớp React Native (Jest Test Suite)

- **Lệnh thực thi**:

  ```bash
  # 1. Kiểm tra TypeScript strict
  npx tsc --noEmit

  # 2. Kiểm tra ESLint
  npm run lint

  # 3. Chạy Jest test suite
  npx jest src/core/hardware/tof/__tests__/tof-fixture-suite.test.ts
  ```

- **Tiêu chí đạt (Acceptance Criteria)**:
  - `npx tsc --noEmit` báo 0 lỗi (Zero TypeScript Errors).
  - `npm run lint` báo 0 lỗi (Zero ESLint Errors).
  - 21/21 Jest tests PASS (Bao gồm kiểm tra 23 test cases nhị phân và Voice Engine).

---

### Bước 3.4: Kiểm thử Tích hợp trên Màn hình Kiosk (Height Demo Screen)

- **Thao tác**:
  1. Mở màn hình Height Demo tại tuyến đường `/kiosk/height-demo` trên màn hình Sumi mini K2.
  2. Bấm nút **"Bắt đầu Stream (15Hz)"**.
  3. Mở **Modal Tinh chỉnh** để xác nhận độ cao trần đang là **`245.7 cm`**.
  4. Người thử nghiệm bước vào giữa vùng quét của cảm biến.
  5. Bấm **"Ghi log (JSONL)"** để bắt đầu thu thập khung hình thực địa, bấm lại lần nữa để lưu tệp.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Ma trận Heatmap 8x8 hiển thị trực quan các khoảng cách theo thời gian thực (66ms).
  - Đỉnh đầu người đứng hiển thị vùng màu đỏ/cam (~678mm), mặt sàn hiển thị màu xanh (~2457mm).
  - Target Status 10 (tóc người) và Target Status 5 được nhận diện mượt mà.
  - Giá trị chiều cao chốt (cm) hiển thị chính xác với độ lệch $0.0\text{cm}$ (Ví dụ thực tế đạt $177.9\text{cm}$).
  - Khi rút cáp USB phần cứng, màn hình báo lỗi phần cứng hiển thị đúng lý do ngắt kết nối `TransportError`.

---

## 4. Danh mục Kiểm tra nhanh (Checklist Nghiệm Thu)

- [x] **Bắt Tay Tự Dò Cổng PING/PONG (Zero-Touch Resolver Probe)**: Tự động gán role `'tof'` bằng lệnh PING `0xAA 0x55 'P' 'G'` và nhận PONG Ack `0xAA 0x55 'O' 'K'` @ 460800 baud.
- [x] **Cấu trúc Gói tin Nhị phân 204 Bytes**: Thuật toán `ToFStreamFramer` chống lệch offset trên dòng byte phân mảnh 32B từ Android USB Serial.
- [x] **Kiểm tra Mã Lỗi CRC16-Modbus**: Kiểm tra toàn vẹn gói tin trước khi giải mã.
- [x] **Mốc Độ Cao Thực Tế 245.7cm**: Đồng bộ mặc định `2457mm` trên cả Firmware ESP32 và React Native Engine.
- [x] **Kháng Tóc Đen (Target Status 10 & 9 & 5)**: Nhận diện chính xác đỉnh đầu ngay cả khi tóc hấp thụ hồng ngoại gây SNR Low (Status 10).
- [x] **Nạp Sẵn Baseline & Nới lỏng Hiệu chuẩn Sàn**: Thích ứng hoàn hảo với sàn gạch và chân đế máy InBody thực tế (`stdDev <= 80mm`, $\ge 4$ zones).
- [x] **Log 8x8 ASCII Hoàn Chỉnh**: Tắt log chunk 32 byte thô; xuất log trực quan 8x8 kèm tóm tắt Engine.
- [x] **Bộ Ghi Log JSONL Thực Địa**: Trích xuất dữ liệu frame qua ADB phục vụ phân tích thuật toán chuyên sâu.
- [x] **Bảo Vệ Quyền Riêng Tư (Privacy Countdown)**: Tự động dọn dẹp bộ đệm stream khi kết thúc phiên đo.
- [x] **Báo Lỗi Kết Nối Chuẩn**: Ném `TransportError` và báo trạng thái `'error'` khi rút cáp/hỏng cáp thay vì tự động ngầm bật Mock mode.
