# Firmware ESP32 VL53L5CX C++ Driver & Height Measurement Engine (PlatformIO)

> **Mô tả ngắn**: Driver C++ và Engine Tính Toán Chiều Cao Độc Lập cho cảm biến khoảng cách Time-of-Flight đa vùng STMicroelectronics VL53L5CX (8x8 = 64 zones @ 15Hz). Thực hiện toàn bộ pipeline 8 bước xử lý toán học trực tiếp trên vi điều khiển ESP32, stream gói nhị phân 16 Bytes siêu tinh gọn (Height Packet) xuống Kiosk Android qua USB Serial (460800 baud).

---

## ⚠️ Đoạn Cảnh báo & Phân biệt Kiến trúc

- **Engine Tính Toán Độc Lập (Firmware-Level Height Engine)**: Cảm biến ToF hoạt động như một module đo chiều cao độc lập (Dedicated Height Sensor Module). ESP32 tự động tính toán bù góc $\cos\theta$, lọc đỉnh đầu, lọc nhiễu nhảy vọt, lọc ngoại lai MAD, đánh giá ổn định tư thế đứng và chốt khóa chiều cao Trimmed Mean 10%.
- **Băng thông USB Siêu Nhẹ (16 Bytes vs 204 Bytes)**: Thay vì liên tục đẩy ma trận 64 zones thô 204 Bytes lên tầng ứng dụng Mobile, ESP32 chỉ truyền gói kết quả 16 Bytes gọn nhẹ chứa: FSM State, Voice Guidance, Chiều cao chốt (mm), Chiều cao tức thời (mm), Tiến trình ổn định (0-100%), Độ tin cậy (Confidence) và Cờ sự kiện (Event Code).
- **Hỗ trợ Giao tiếp 2 Chiều (Bi-directional Control)**:
  - Lệnh **PING** (`0xAA 0x55 0x50 0x47` / `"PG"`) $\rightarrow$ Phản hồi **PONG** (`0xAA 0x55 0x4F 0x4B` / `"OK"`).
  - Lệnh **CONFIG** (`0xAA 0x55 0x43 0x46` + 14B): Cho phép Kiosk cấu hình động chiều cao trần `expectedFloorMm` (mặc định 2220mm), độ cao bệ cân `platformHeightMm` (mặc định 0mm hoặc 96mm), `gainScale`, `offsetMm`.
  - Lệnh **RESET** (`0xAA 0x55 0x52 0x53` / `"RS"`): Reset FSM về trạng thái IDLE.
  - Lệnh **DEBUG RAW** (`0xAA 0x55 0x44 0x42` / `"DB"`): Bật/tắt truyền thêm gói 204B thô cho màn hình Heatmap Test Bench khi cần chẩn đoán.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- 📄 **[Tài liệu Đặc tả Kỹ thuật VL53L5CX Spec](file:///d:/promedi/docs/hard-ware/vl53l5cx-distance-sensor-spec.md)**
- 📄 **[Mô-đun Hardware ToF trên Kiosk React Native](file:///d:/promedi/src/core/hardware/tof/README.md)**
- 📄 **[Tài liệu Hướng dẫn Phần cứng Kiosk ProMedi](file:///d:/promedi/docs/hard-ware/README.md)**
- 📄 **[Đặc tả Use Case Khám Sức Khỏe V4.0](file:///d:/promedi/docs/specs/usecase-specification-v4.0.md)**

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                            | Trách nhiệm                                                                                                                                                                                                                                                    |   Chạm Vào/Ra (I/O)    |
| :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------: |
| [`include/HeightProtocol.h`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/include/HeightProtocol.h)       | Định nghĩa Cấu trúc Giao thức Nhị phân 16 Bytes (`HeightPacketPayload`), các mã FSM State, Voice Guidance, Event Codes và hằng số lệnh PING/CONFIG/RESET                                                                                                       |     ❌ Pure Types      |
| [`include/HeightEngine.h`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/include/HeightEngine.h)           | Header định nghĩa lớp `HeightEngine`, Circular Buffer 60 mẫu tĩnh (Zero Dynamic Allocation), LUT lượng giác và phương thức xử lý                                                                                                                               |     ❌ Logic thuần     |
| [`src/HeightEngine.cpp`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/src/HeightEngine.cpp)               | Hiện thực hóa toàn bộ pipeline 8 bước: Bù góc $\cos\theta$, trừ Baseline, trích xuất đỉnh đầu trọng số (Crown Peak Weighted), kẹp chống Spike tóc đen, lọc MAD, đánh giá ổn định (`range <= 12mm`, `holdMs >= 2000ms`, `keptCount >= 16`) và chốt Trimmed Mean |     ❌ Logic thuần     |
| [`include/VL53L5CXDriver.h`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/include/VL53L5CXDriver.h)       | Interface Driver phần cứng VL53L5CX, cấu trúc frame 64 vùng đo và mock generator                                                                                                                                                                               |     ❌ Logic thuần     |
| [`src/VL53L5CXDriver.cpp`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/src/VL53L5CXDriver.cpp)           | Giao tiếp I2C phần cứng (SDA=21, SCL=22, LPN=4) qua STM32duino VL53L5CX @ 15Hz và bộ sinh Mock Frame 8x8                                                                                                                                                       | 🌐 Hardware I2C / Mock |
| [`src/main.cpp`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/src/main.cpp)                               | Entrypoint Arduino ESP32: Khởi tạo I2C, HeightEngine, lắng nghe lệnh Kiosk, loop() stream gói 16B và log hiệu năng kỹ thuật                                                                                                                                    |     🌐 Serial I/O      |
| [`test/test_height_engine.cpp`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/test/test_height_engine.cpp) | Bộ kiểm thử đơn vị Native C++: Kiểm tra đóng/giải mã 16B, CRC16 Modbus, pipeline 8 bước chốt LOCKED và sự kiện PERSON_LEFT                                                                                                                                     |      ❌ Zero I/O       |
| [`platformio.ini`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/platformio.ini)                           | File cấu hình PlatformIO cho môi trường hardware `esp32dev` (flash 4MB) và desktop `native`                                                                                                                                                                    |    ❌ Configuration    |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Pipeline 8 Bước Tính Chiều Cao C++ Chạy Trực Tiếp Trên ESP32**:
   - **Bước 1**: Bù góc lăng kính không gian $\cos\theta$ dựa trên bảng LUT 8x8 tính sẵn (`m_cosLUT[8][8]`).
   - **Bước 2**: Trừ Baseline sàn ($h = \text{floorZ} - z - \text{platformHeightMm}$).
   - **Bước 3**: Nhận diện người đứng (Vùng lõi Core Zones hàng 2..5, cột 2..5 & $h \ge 900\text{mm}$).
   - **Bước 4**: Trích xuất đỉnh đầu trọng số (Crown Peak Weighted):
     - Ô cao nhất: 60% trọng số.
     - Ô thứ 2: 25% trọng số (nếu cách đỉnh $\le 25\text{mm}$).
     - Ô thứ 3: 15% trọng số (nếu cách đỉnh $\le 25\text{mm}$).
     - Kẹp chống Spike tóc đen: Nếu ô cao nhất vọt $> 15\text{mm}$ so với ô 2, kẹp lại về `h1 + 5mm`. Triệt tiêu hoàn toàn sai số kéo tụt chiều cao khi người đứng lệch tâm ô.
   - **Bước 5**: Bộ lọc ngoại lai thống kê MAD (Median Absolute Deviation) trên cửa sổ trượt 2500ms.
   - **Bước 6**: Tiêu chuẩn ổn định thực tế:
     - Biên độ dao động $\text{Range} \le 12.0\text{mm}$ ($1.2\text{cm}$) để vừa vặn triệt tiêu rung giật nhịp thở tự nhiên.
     - Vận tốc đứng $|\text{Slope}| \le 6.0\text{mm/s}$.
     - Thời gian giữ yên bất động $\ge 2000\text{ms}$ (2.0 giây) và $\ge 16$ mẫu hợp lệ liên tục.
   - **Bước 7**: Thanh tiến trình mượt mà tăng từ 40% $\rightarrow$ 99% theo thời gian `holdMs` và chốt 100% khi khóa.
   - **Bước 8**: Chốt kết quả Trimmed Mean 10% (cắt bỏ 10% biên trên và 10% biên dưới) và phát gói nhị phân 16 Bytes.

2. **Cấu trúc Gói Nhị Phân 16 Bytes (`HeightPacketPayload`)**:

```text
Byte 0..1 : 0xAA 0x55 (Magic Header)
Byte 2    : 0x48 ('H' - Height Packet Type)
Byte 3    : State (1=IDLE, 2=MEASURING, 3=HOLD_STILL, 4=LOCKED, 5=TIMEOUT, 6=ERROR)
Byte 4    : Guidance (1=IDLE, 2=STEP_ON, 3=HOLD_STILL, 4=MEASURING, 5=LOCKED, 6=TIMEOUT)
Byte 5..6 : Locked Height (uint16_t Little-Endian, đơn vị mm)
Byte 7..8 : Instant Height (uint16_t Little-Endian, đơn vị mm)
Byte 9    : Stability Progress (uint8_t, 0 - 100%)
Byte 10   : Confidence (uint8_t, 0 - 100%)
Byte 11   : Head Zone Count (uint8_t, số zone đỉnh đầu)
Byte 12   : Event Code (0=NONE, 1=PERSON_PRESENT, 2=LOCKED, 3=PERSON_LEFT, 4=TIMEOUT)
Byte 13   : Flags (Bit 0: isStable, Bit 1: hasPerson)
Byte 14..15: CRC16 Modbus (uint16_t Little-Endian)
```

---

## 3. Sơ đồ Đấu Nối Phần Cứng Bản VL53L5CX (L5 Pinout)

| Chân trên ESP32 DevKit | Chân trên Module VL53L5CX     | Chức năng / Ghi chú                                             |
| :--------------------- | :---------------------------- | :-------------------------------------------------------------- |
| **`3V3`**              | **`VIN`** _(hoặc AVDD/IOVDD)_ | Nguồn 3.3V _(⚠️ Tuyệt đối không cắm vào chân 5V/VIN)_           |
| **`GND`**              | **`GND`**                     | Nối đất chung                                                   |
| **`GPIO 21`**          | **`SDA`**                     | Tuyến dữ liệu I2C Data (mặc định Wire ESP32)                    |
| **`GPIO 22`**          | **`SCL`**                     | Tuyến xung nhịp I2C Clock (tần số Fast Mode Plus 1MHz)          |
| **`GPIO 4`**           | **`LPn`**                     | Low Power Enable (kéo lên mức cao HIGH để kích hoạt)            |
| **Không cắm**          | **`INT`**                     | Chân ngắt (firmware dùng continuous polling 15Hz nên không cần) |

---

## 4. Hướng dẫn kiểm thử & Nạp Firmware

```powershell
# 1. Chạy Native Unit Test C++ trên máy tính (Zero Hardware)
cd d:\promedi\firmware\esp32-vl53l5cx-driver
g++ -D MOCK_MODE_ONLY -D CONFIG_VL53L5CX_8X8 -std=c++11 -I include test/test_height_engine.cpp src/HeightEngine.cpp src/VL53L5CXDriver.cpp -o test_height_engine.exe
.\test_height_engine.exe
Remove-Item -Force test_height_engine.exe

# 2. Biên dịch firmware PlatformIO
platformio run -e esp32dev

# 3. Nạp firmware xuống ESP32 qua cổng USB COM3
platformio run -e esp32dev -t upload

# 4. Mở Monitor xem log kỹ thuật và kết quả chốt
platformio device monitor
```
