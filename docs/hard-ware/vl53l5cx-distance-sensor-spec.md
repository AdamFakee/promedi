# Đặc tả Kỹ thuật Cảm biến Khoảng cách STMicroelectronics VL53L5CX (ToF Height Sensor) - Phiên bản V5.2

## 📌 Tổng quan & Mục đích

Tài liệu này đặc tả thiết kế kỹ thuật, sơ đồ phần cứng và giao thức nhị phân siêu tinh gọn 16 Bytes cho cảm biến khoảng cách đa vùng **STMicroelectronics VL53L5CX (Time-of-Flight 8x8 Multizone Sensor)** kết hợp vi điều khiển **ESP32** đóng vai trò là một mô-đun đo chiều cao chuyên dụng (Dedicated Height Measurement Engine) cho hệ thống Kiosk Y Tế Tự Động ProMedi.

---

## 🎯 Scope & Boundaries (Kiến trúc Module Hóa V5.2)

```text
[ Cảm biến ST VL53L5CX (8x8 @ 15Hz) ]
               │ I2C Fast Mode Plus (1MHz)
               ▼
[ Vi điều khiển ESP32 - HeightEngine C++ ]
  - Bù góc cosθ Spatial Transform (LUT 8x8)
  - Trừ Baseline sàn & bệ cân InBody (96mm)
  - Nhận diện người (Core Zones 2..5 & h >= 900mm)
  - Trích xuất đỉnh đầu trọng số (Crown Peak Weighted: 60/25/15%)
  - Kẹp chống Spike quang học trên tóc đen (|Δ| > 15mm)
  - Lọc ngoại lai thống kê MAD trên cửa sổ trượt 2500ms
  - Đánh giá ổn định (Range <= 12mm, |Slope| <= 6mm/s, Hold >= 2.0s)
  - Chốt khóa Trimmed Mean 10%
               │
               ▼ Gói Nhị Phân Siêu Tinh Gọn 16 Bytes (USB Serial @ 460800 baud)
[ Kiosk React Native - Hardware ToF HAL ]
  - ToFDistanceDevice / ToFClient
  - Giải mã gói tin 16B & Cắt khung HeightStreamFramer
  - Điều khiển FSM inbodySessionMachine (bắt tay tải trọng InBody 260S)
  - Đồng bộ cấu hình động (PING, CONFIG, RESET)
```

### 1. Phân định Trách nhiệm (Boundaries):

- **ESP32 Firmware C++**: Thực thi 100% pipeline toán học 8 bước trực tiếp trên phần cứng. Triệt tiêu hoàn toàn hiện tượng lag/drop frame, jitter do Android USB driver và Garbage Collection (GC) pauses của React Native.
- **Kiosk React Native Layer**: Đóng vai trò là Consumer nhận gói tin 16 Bytes (`HeightPacketPayload`) nhẹ nhàng, điều hướng FSM, cập nhật thanh tiến trình UI và hướng dẫn giọng nói (Voice Guidance) tương ứng.

---

## 📦 Giao thức Nhị Phân 16 Bytes (`HeightPacketPayload`)

Mỗi 66ms (15Hz), ESP32 phát một gói tin nhị phân 16 Bytes có cấu trúc:

| Byte Offset | Kiểu dữ liệu | Tên trường        | Ý nghĩa / Giá trị                                                                                  |
| :---------: | :----------: | :---------------- | :------------------------------------------------------------------------------------------------- |
|   `0..1`    | `uint8_t[2]` | `header`          | Magic Header: `0xAA`, `0x55`                                                                       |
|     `2`     |  `uint8_t`   | `packetType`      | Mã loại gói: `0x48` (ký tự ASCII `'H'`)                                                            |
|     `3`     |  `uint8_t`   | `state`           | Trạng thái FSM: `1`=IDLE, `2`=MEASURING, `3`=HOLD_STILL, `4`=LOCKED, `5`=TIMEOUT, `6`=ERROR        |
|     `4`     |  `uint8_t`   | `guidance`        | Lời thoại hướng dẫn: `1`=IDLE, `2`=STEP_ON, `3`=HOLD_STILL, `4`=MEASURING, `5`=LOCKED, `6`=TIMEOUT |
|   `5..6`    |  `uint16_t`  | `lockedHeightMm`  | Chiều cao đã chốt (Little-Endian, đơn vị mm, VD: `1798` = 179.8 cm)                                |
|   `7..8`    |  `uint16_t`  | `instantHeightMm` | Chiều cao tức thời thời gian thực (Little-Endian, đơn vị mm)                                       |
|     `9`     |  `uint8_t`   | `progress`        | Tiến trình ổn định tư thế đứng (`0` đến `100%`)                                                    |
|    `10`     |  `uint8_t`   | `confidence`      | Độ tin cậy kết quả (`85%` đến `99%`)                                                               |
|    `11`     |  `uint8_t`   | `headZoneCount`   | Số lượng zone phát hiện đỉnh đầu (1 đến 4 zones)                                                   |
|    `12`     |  `uint8_t`   | `eventCode`       | Mã sự kiện kích hoạt: `0`=NONE, `1`=PERSON_PRESENT, `2`=LOCKED, `3`=PERSON_LEFT, `4`=TIMEOUT       |
|    `13`     |  `uint8_t`   | `flags`           | Cờ trạng thái bitwise (`Bit 0`: isStable, `Bit 1`: hasPerson)                                      |
|  `14..15`   |  `uint16_t`  | `checksumCrc16`   | Mã kiểm tra toàn vẹn CRC16-Modbus tính trên 14 bytes đầu                                           |

---

## 🔄 Bộ Lệnh Điều Khiển Từ Kiosk Xuống ESP32 (Bi-directional Control)

1. **Lệnh PING (`0xAA 0x55 0x50 0x47` / `"PG"`)**:
   - ESP32 phản hồi ngay lập tức gói PONG (`0xAA 0x55 0x4F 0x4B` / `"OK"`). Dùng để nhận diện cổng COM khi Kiosk khởi động.
2. **Lệnh CONFIG (`0xAA 0x55 0x43 0x46` + 14 Bytes Payload)**:
   - Truyền cấu hình: `expectedFloorMm` (uint16), `platformHeightMm` (uint16), `gainScale` (float 4B), `offsetMm` (float 4B) và CRC16 (2B).
   - ESP32 xác thực CRC và phản hồi `CONFIG_OK` (`0xAA 0x55 0x43 0x4B` / `"CK"`).
3. **Lệnh RESET (`0xAA 0x55 0x52 0x53` / `"RS"`)**:
   - Yêu cầu ESP32 hủy bỏ phiên đo hiện tại và reset FSM về trạng thái IDLE sẵn sàng cho người mới.
4. **Lệnh DEBUG RAW (`0xAA 0x55 0x44 0x42 0x01` / `"DB 1"`)**:
   - Bật/tắt chế độ truyền song song gói tin 204 Bytes ma trận thô 64 zones khi Kiosk mở màn hình kiểm định quang học Heatmap.

---

## 🔌 Sơ Đồ Đấu Nối Phần Cứng ESP32 & Module VL53L5CX

| Chân trên ESP32 DevKit | Chân trên Module VL53L5CX     | Chức năng / Ghi chú                                             |
| :--------------------- | :---------------------------- | :-------------------------------------------------------------- |
| **`3V3`**              | **`VIN`** _(hoặc AVDD/IOVDD)_ | Nguồn 3.3V _(⚠️ Tuyệt đối không cắm vào chân 5V/VIN)_           |
| **`GND`**              | **`GND`**                     | Nối đất chung                                                   |
| **`GPIO 21`**          | **`SDA`**                     | Tuyến dữ liệu I2C Data (mặc định Wire ESP32)                    |
| **`GPIO 22`**          | **`SCL`**                     | Tuyến xung nhịp I2C Clock (tần số Fast Mode Plus 1MHz)          |
| **`GPIO 4`**           | **`LPn`**                     | Low Power Enable (kéo lên mức cao HIGH để bật cảm biến)         |
| **Không cắm**          | **`INT`**                     | Chân ngắt (firmware dùng continuous polling 15Hz nên không cần) |

---

## 🎯 Tiêu Chuẩn Nhân Trắc Học & Chốt Khóa Chiều Cao

1. **Khử Spike Quang Học Trên Tóc Đen (Anti-Spike Clamping)**:
   - Tóc đen có độ phản xạ hồng ngoại ToF thấp (~5-10%), dễ xuất hiện gai nhọn tức thời $\pm 20\text{mm}$. Nếu ô cao nhất vọt lên $> 15\text{mm}$ so với ô thứ 2, thuật toán tự động kẹp lại (`h0 = h1 + 5mm`).
2. **Trích Xuất Đỉnh Đầu Trọng Số (Crown Peak-Weighted)**:
   - Ô 1 (đỉnh): 60% trọng số.
   - Ô 2: 25% trọng số (nếu cách đỉnh $\le 25\text{mm}$).
   - Ô 3: 15% trọng số (nếu cách đỉnh $\le 25\text{mm}$).
   - Triệt tiêu hoàn toàn sai số lệch 1.5–2.0 cm khi vị trí đỉnh đầu rơi giữa 1 ô hay ngã tư giữa các ô.
3. **Tiêu Chuẩn Ổn Định Đứng Thẳng**:
   - Biên độ dao động $\text{Range} \le 12.0\text{mm}$ ($1.2\text{cm}$) để chấp nhận nhịp thở tự nhiên của lồng ngực.
   - Vận tốc đứng $|\text{Slope}| \le 6.0\text{mm/s}$.
   - Thời gian giữ yên bất động $\ge 2000\text{ms}$ (2.0 giây) với $\ge 16$ mẫu hợp lệ liên tục.
4. **Chốt Khóa Trimmed Mean 10%**:
   - Loại bỏ 10% biên dưới và 10% biên trên của các mẫu đã ổn định, tính trung bình các mẫu còn lại, bù trừ `gainScale` và `offsetMm` để đạt độ chính xác $\pm 1\text{mm}$.
