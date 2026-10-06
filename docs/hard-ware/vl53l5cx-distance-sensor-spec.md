# Đặc tả Kỹ thuật Cảm biến Khoảng cách STMicroelectronics VL53L5CX (ToF Sensor) - Phiên bản V5.1

## 📌 Tổng quan & Mục đích

Tài liệu này đặc tả thiết kế kỹ thuật, sơ đồ chân cắm và hướng dẫn chuyển đổi cho cảm biến khoảng cách đa vùng **STMicroelectronics VL53L5CX (Time-of-Flight 8x8 Multizone Sensor)** khi sử dụng thay thế cho đời chip VL53L8CX tại trần nhà Kiosk ProMedi.

---

## 🎯 Scope & Alignment (Tính Tương thích với Engine V5.1)

### 🟢 PHẦN THUẬT TOÁN MOBILE/KIOSK (KHÔNG THAY ĐỔI - 100% SHARED):

Thuật toán xử lý ma trận chiều cao **`HeightMeasurementEngine.ts`** trên App Mobile/Kiosk **dùng chung 100%** giữa VL53L5CX và VL53L8CX.

Do cả 2 con chip của hãng STMicroelectronics có cùng các thông số quang học cốt lõi:

1. **Góc quét FoV**: $45^\circ \times 45^\circ$ ($65^\circ$ diagonal). Công thức bù $\cos\theta$ và mảng tra cứu `COS[64]` **giữ nguyên 100%**.
2. **Độ phân giải Ma trận**: Chế độ $8 \times 8$ (64 zones) chạy ở tần số **15 Hz**.
3. **Mã Trạng Thái Target Status**: Cùng sử dụng mảng cờ `status[64]` với mã status `5` (Valid 100%) và `9` (Valid 50%).
4. **Cơ chế Đảo Thấu kính Quang học (Section 7.1.3 - Datasheet DS13754)**: Thấu kính Rx lật ngược cả 2 chiều (Zone 0 ở bottom-left nhận tia từ top-right). Cấu hình `axisMap` **giữ nguyên 100%**.

---

## 📐 So sánh Kỹ thuật chi tiết giữa VL53L5CX và VL53L8CX

| Thông số Kỹ thuật      | ST VL53L5CX (Tài liệu DS13754)               | ST VL53L8CX (Tài liệu DS14161)               | Tác động tới Engine Mobile |
| :--------------------- | :------------------------------------------- | :------------------------------------------- | :------------------------: |
| **Góc quét (FoV)**     | $45^\circ \times 45^\circ$ ($65^\circ$ chéo) | $45^\circ \times 45^\circ$ ($65^\circ$ chéo) |        ❌ Không đổi        |
| **Ma trận Zone & FPS** | $8 \times 8$ (64 zones) @ 15Hz               | $8 \times 8$ (64 zones) @ 15Hz               |        ❌ Không đổi        |
| **Khoảng cách đo**     | $2\text{cm} - 400\text{cm}$ (4.0m)           | $2\text{cm} - 400\text{cm}$ (4.0m)           |        ❌ Không đổi        |
| **Mã Target Status**   | `5` (100%), `9` (50%), `6`, `10`             | `5` (100%), `9` (50%), `6`, `10`             |        ❌ Không đổi        |
| **Độ trôi nhiệt**      | $0.05\text{ mm}/^\circ\text{C}$              | $0.10\text{ mm}/^\circ\text{C}$              | ❌ L5CX trôi nhiệt ít hơn  |
| **Giao tiếp Bus**      | Cổng I2C (400kHz - 1MHz)                     | Cổng I2C (1MHz) & SPI (3MHz)                 |     ⚠️ ESP32 dùng I2C      |
| **Chân Reset I2C**     | Chân `I2C_RST` (Active High)                 | Chân `SPI_I2C_N`                             |   ⚠️ Chỉ khác sơ đồ mạch   |
| **Thư viện C++ ULD**   | `STM32duino VL53L5CX`                        | `STM32duino VL53L8CX`                        |   ⚠️ Đổi thư viện ESP32    |

---

## 🔌 1. Sơ đồ Đấu Nối Phần Cứng ESP32 với VL53L5CX

Cảm biến VL53L5CX giao tiếp với ESP32 qua bus I2C chuẩn (địa chỉ mặc định `0x52`):

```text
ESP32 DevKit                  VL53L5CX Module
  3V3        ───────────────►  AVDD / IOVDD (3.3V)
  GND        ───────────────►  GND
  GPIO 21    ───────────────►  SDA (I2C Data)   [Cần trở treo 2.2k - 4.7k]
  GPIO 22    ───────────────►  SCL (I2C Clock)  [Cần trở treo 2.2k - 4.7k]
  GPIO 4     ───────────────►  LPn (Low Power Enable)
  GPIO 5     ───────────────►  I2C_RST (Reset Pin)
```

---

## 💻 2. Khác biệt trong Code Firmware ESP32 C++ (PlatformIO)

Khi dùng chip **VL53L5CX**, code C++ trên ESP32 chỉ cần thay đổi tên thư viện ULD và tên hàm API của ST.

### File `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 460800
lib_deps =
    stm32duino/STM32duino VL53L5CX @ ^1.1.0
```

### File `src/main.cpp` (Khởi tạo VL53L5CX):

```cpp
#include <Arduino.h>
#include <Wire.h>
#include <vl53l5cx_api.h>

VL53L5CX_Configuration devL5;
VL53L5CX_ResultsData resultsL5;

void setup() {
  Serial.begin(460800);
  Wire.begin(21, 22);
  Wire.setClock(1000000); // 1MHz I2C Fast Mode Plus

  devL5.platform.address = 0x52;

  // 1. Init cảm biến VL53L5CX
  if (vl53l5cx_init(&devL5) != 0) {
    Serial.println("Lỗi khởi tạo VL53L5CX!");
    while(1);
  }

  // 2. Cấu hình Resolution 8x8 & 15Hz
  vl53l5cx_set_resolution(&devL5, VL53L5CX_RESOLUTION_8X8);
  vl53l5cx_set_ranging_frequency_hz(&devL5, 15);
  vl53l5cx_set_target_order(&devL5, VL53L5CX_TARGET_ORDER_CLOSEST); // Ưu tiên đỉnh đầu gần trần
  vl53l5cx_set_sharpener_percent(&devL5, 1);

  // 3. Bắt đầu đo continuous
  vl53l5cx_start_ranging(&devL5);
}

void loop() {
  uint8_t isReady = 0;
  vl53l5cx_check_data_ready(&devL5, &isReady);

  if (isReady) {
    vl53l5cx_get_ranging_data(&devL5, &resultsL5);

    // Đóng gói 64 distances (uint16) + 64 target_status (uint8) gửi qua USB Serial
    sendBinaryFrame(resultsL5.distance_mm, resultsL5.target_status);
  }
}
```

---

## 🔗 Tham chiếu Thuật toán Chốt Chiều cao

Chi tiết toàn bộ đường ống toán học $\cos\theta$, gom cụm Blobs, lọc giơ tay và chốt chiều cao V5.1 trên Mobile được tham chiếu đầy đủ tại:
👉 **[Tài liệu Đặc tả Kỹ thuật Thuật toán VL53L8CX / VL53L5CX Spec V5.1](file:///d:/promedi/docs/hard-ware/vl53l8cx-distance-sensor-spec.md)**
