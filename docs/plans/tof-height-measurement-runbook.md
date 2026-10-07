# Hướng Dẫn Kỹ Thuật Triển Khai & Runbook Nghiệm Thu Cảm Biến Khoảng Cách ToF VL53L5CX/L8CX (Height Measurement Runbook)

- **Thời gian tạo (Created)**: 2026-10-06 14:38:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-10-06 16:48:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH / SẴN SÀNG NGHIỆM THU
- **Thiết bị mục tiêu**: Kiosk Sumi mini K2 (Android) + Mạch ESP32 + Cảm biến ToF STMicroelectronics VL53L5CX / VL53L8CX

---

## 1. Mục tiêu

Tài liệu Runbook này hướng dẫn quy trình từng bước (Step-by-step) để kỹ thuật viên / QA cài đặt, nạp firmware, kết nối mạch cảm biến ToF trần nhà với Kiosk Sumi/Sunmi mini K2 và thực hiện nghiệm thu toàn bộ luồng đo chiều cao không tiếp xúc (Bước 4 trong quy trình khám Kiosk ProMedi).

---

## 2. Hiện trạng mã nguồn & Đã xử lý

1. **Firmware C++ Driver (`firmware/esp32-vl53l5cx-driver/`)**:
   - Khởi tạo bus I2C 1MHz, hỗ trợ đọc 64 zones @ 15Hz (66ms/frame).
   - Lắng nghe lệnh PING `0xAA 0x55 0x50 0x47` ("PG") từ Kiosk và phản hồi PONG Ack `0xAA 0x55 0x4F 0x4B` ("OK").
   - Đóng gói dữ liệu nhị phân chuẩn 204 Bytes kèm mã kiểm tra checksum CRC16-Modbus và truyền tốc độ cao qua USB Serial 460800 baud.
   - Tích hợp chế độ Giả lập (Mock Mode) sinh ma trận dữ liệu đỉnh đầu người đứng (~500mm).

2. **React Native Core Hardware (`src/core/hardware/tof/`)**:
   - `DeviceResolver`: Tự động nhận diện ứng viên cổng USB và kiểm tra chữ ký bắt tay PING/PONG Probe Signature (`TOF_PING_COMMAND` `0xAA 0x55 'P' 'G'` $\rightarrow$ `TOF_PONG_RESPONSE` `0xAA 0x55 'O' 'K'`) để gán role `'tof'`.
   - `ToFStreamFramer`: Tự gom buffer phân mảnh từ Android USB Serial, tìm Header `0xAA 0x55` và cắt khung 204 Bytes.
   - `HeightMeasurementEngine`: Bảng tra cứu trước $\cos\theta$ ($45^\circ \times 45^\circ$ FoV), quy đổi độ sâu $z = r \times \cos\theta$, tìm cụm đỉnh đầu trung tâm (Peak Blob), bộ lọc giơ tay (Hand Gesture Filter $>50\text{mm}$) và chốt chiều cao chính xác đến 0.1cm.
   - `ToFDistanceDevice`: Báo trạng thái `'error'` và ném `TransportError` khi ngắt cáp/lỗi kết nối phần cứng (Không tự động ngầm fallback sang Mock mode).

3. **Bộ dữ liệu Kiểm thử Fixture (`firmware/esp32-vl53l5cx-driver/test/`)**:
   - Kịch bản `generate_fixtures.py` sinh 23 test cases (115 frames nhị phân).
   - Đạt 100% tỷ lệ PASS trên cả Native C++ runner và Jest TypeScript runner.

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

  # 2. Chạy Jest test suite
  npx jest src/core/hardware/tof/__tests__/
  ```

- **Tiêu chí đạt (Acceptance Criteria)**:
  - `npx tsc --noEmit` báo 0 lỗi (Zero TypeScript Errors).
  - 10/10 Jest tests PASS (Bao gồm kiểm tra 23 test cases nhị phân).

---

### Bước 3.4: Kiểm thử Tích hợp trên Màn hình Kiosk (Hardware Test Modal)

- **Thao tác**:
  1. Mở ứng dụng ProMedi Kiosk trên màn hình Sumi mini K2.
  2. Bấm vào icon **Hardware Test Modal** trên góc màn hình.
  3. Chọn tab **"Cảm biến ToF VL53L5CX"**.
  4. Bấm nút **"Bắt đầu Stream (15Hz)"**.
- **Tiêu chí đạt (Acceptance Criteria)**:
  - Ma trận Heatmap 8x8 hiển thị trực quan các khoảng cách theo thời gian thực (66ms).
  - Đỉnh đầu người đứng hiển thị vùng màu đỏ/cam (~500mm), mặt sàn hiển thị màu xanh (~2100mm).
  - Giá trị chiều cao chốt (cm) hiển thị chính xác với sai số $\le 0.5\text{cm}$.
  - Khi giơ tay cao hơn đầu $\ge 50\text{mm}$, cờ `hasHandRaised = true` sáng lên và chiều cao đỉnh đầu giữ nguyên không bị nhiễu do bàn tay.
  - Khi rút cáp USB phần cứng, màn hình báo lỗi phần cứng hiển thị đúng lý do ngắt kết nối (Không tự ý bật Mock Mode).

---

## 4. Danh mục Kiểm tra nhanh (Checklist Nghiệm Thu)

- [x] **Bắt Tay Tự Dò Cổng PING/PONG (Zero-Touch Resolver Probe)**: Tự động gán role `'tof'` bằng lệnh PING `0xAA 0x55 'P' 'G'` và nhận PONG Ack `0xAA 0x55 'O' 'K'` @ 460800 baud.
- [x] **Cấu trúc Gói tin Nhị phân**: Đảm bảo kích thước đúng 204 Bytes, Header `0xAA 0x55`, CRC16-Modbus khớp 100%.
- [x] **Bù Góc Quang Học ($\cos\theta$)**: Sai số chiều cao khi đứng lệch tâm X/Y (80mm) so với đứng giữa trung tâm $< 3\text{mm}$.
- [x] **Lọc Cử Chỉ Giơ Tay (Hand Gesture Filter)**: Loại bỏ thành công 1-2 zone bàn tay cao hơn đỉnh đầu $\ge 50\text{mm}$.
- [x] **Kháng Tóc Đen (Status 9)**: Chấp nhận cả Status 5 (100%) và Status 9 (50%) cho người có tóc đen sẫm.
- [x] **Bảo Vệ Quyền Riêng Tư (Privacy Countdown)**: Tự động dọn dẹp bộ đệm stream khi kết thúc phiên đo.
- [x] **Báo Lỗi Kết Nối Chuẩn**: Ném `TransportError` và báo trạng thái `'error'` khi rút cáp/hỏng cáp thay vì tự động ngầm bật Mock mode.
