# Firmware Driver ESP32 VL53L8CX (ToF Height Measurement Engine)

Module firmware C++ độc lập chạy trên vi điều khiển **ESP32 DevKit** giao tiếp với cảm biến đa vùng **STMicroelectronics VL53L8CX (8x8 Zones Time-of-Flight)**, thực hiện toàn bộ thuật toán đo và chốt khóa chiều cao 8 bước trực tiếp trên phần cứng (Edge Computing) và truyền gói tin nhị phân siêu tinh gọn 16 Bytes lên Kiosk qua USB Serial.

> ⚠️ **Đoạn Cảnh Báo & Phân Biệt**:
>
> - Thư mục này (`firmware/esp32-vl53l8cx-driver/`) là mô-đun firmware **riêng biệt dành riêng cho chip VL53L8CX**, phân biệt với module [`firmware/esp32-vl53l5cx-driver/`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/) (dành cho chip VL53L5CX).
> - **Điểm vượt trội của bản L8CX**: Hỗ trợ bus **SPI High-Speed 10–20 MHz** (giải phóng hoàn toàn nghẽn cổ chai bus I2C, đưa tần số quét thực tế lên $15.0\text{ Hz} - 30.0\text{ Hz}$ mượt mà), bộ phát Laser VCSEL công suất cao tăng tầm đo hiệu dụng lên $4.0\text{ m}$ và kháng ánh sáng môi trường lên tới $5\text{ klx}$ đèn trần phòng khám.

---

## 🔗 Danh Sách Tham Chiếu (Reference Links)

- [Tài liệu Đặc tả Kỹ thuật Cảm biến VL53L8CX V5.1](file:///d:/promedi/docs/hard-ware/vl53l8cx-distance-sensor-spec.md)
- [Giao thức Nhị phân 16-Byte Codec Kiosk](file:///d:/promedi/src/core/hardware/tof/protocol/tof-height-codec.ts)
- [HAL Adapter ToF Distance Device](file:///d:/promedi/src/core/hardware/tof/device/tof.device.ts)
- [Màn hình Kiểm định Chiều cao Kiosk Demo](<file:///d:/promedi/src/app/(kiosk)/height-demo.tsx>)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                            | Trách nhiệm                                                                 | Chạm Vào/Ra (I/O)           |
| :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- | :-------------------------- |
| [`include/VL53L8CXDriver.h`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/include/VL53L8CXDriver.h)       | Khai báo Driver phần cứng VL53L8CX (SPI/I2C, Mock, Pinout)                  | ❌ Logic thuần C++          |
| [`include/HeightEngine.h`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/include/HeightEngine.h)           | Khai báo Engine toán học 8 bước, LUT cosθ và Sliding Window                 | ❌ Logic thuần C++          |
| [`include/HeightProtocol.h`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/include/HeightProtocol.h)       | Struct nhị phân 16 Bytes `HeightPacketPayload` & Mã lệnh PING/CONFIG        | ❌ Header C/C++             |
| [`src/VL53L8CXDriver.cpp`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/src/VL53L8CXDriver.cpp)           | Khởi tạo SPI/I2C, nạp firmware ULD ST, đọc 64 zones, sinh mock frame        | 🌐 SPI/I2C Hardware Bus     |
| [`src/HeightEngine.cpp`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/src/HeightEngine.cpp)               | Hiện thực thuật toán 8 bước: bù cosθ, kẹp gai tóc đen, MAD filter, chốt 10% | ❌ 100% Pure Math           |
| [`src/main.cpp`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/src/main.cpp)                               | Setup bus, loop đo @ 15Hz, điều phối lệnh Kiosk và stream 16 Bytes          | 🌐 USB Serial (460800 baud) |
| [`test/test_height_engine.cpp`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/test/test_height_engine.cpp) | Bộ unit test native kiểm thử thuật toán và serialization                    | ❌ Zero I/O Unit Test       |
| [`platformio.ini`](file:///d:/promedi/firmware/esp32-vl53l8cx-driver/platformio.ini)                           | Cấu hình PlatformIO cho ESP32 DevKit và thư viện STM32duino VL53L8CX        | ⚙️ Build Config             |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Giao tiếp SPI High-Speed (10 MHz) thay cho I2C**:
   - _Lý do_: Đọc 64 distances qua I2C tốn $\approx 1.8\text{ ms}$, khiến FPS thực tế của L5 bị tụt xuống $11.9\text{ Hz}$. SPI chỉ tốn $< 0.2\text{ ms}$, giải phóng CPU và đảm bảo tần số đo đạt chuẩn $\ge 15.0\text{ Hz}$ không drop.
2. **Kẹp Spike Quang Học Tóc Đen (Anti-Spike Clamping)**:
   - _Lý do_: Tóc đen hấp thụ tia hồng ngoại mạnh, phản xạ chỉ 5-10%, dễ gây vọt spike 1 zone ảo. Thuật toán tự động kẹp $h_0 = h_1 + 5\text{ mm}$ nếu chênh lệch $> 15\text{ mm}$.
3. **Trích Xuất Đỉnh Đầu Trọng Số Vòm Sọ (60/25/15%)**:
   - _Lý do_: Khắc phục triệt để hiện tượng tụt $1.5 - 2.0\text{ cm}$ khi người đứng lệch mép giữa 2 ô hoặc ngã tư 4 ô.
4. **Tiêu Chuẩn Ổn Định Nhịp Thở Thực Tế**:
   - _Lý do_: Đặt biên độ $\text{Range} \le 12.0\text{ mm}$ ($1.2\text{ cm}$) để bao dung cho nhịp thở phập phồng tự nhiên của lồng ngực người thật khi đứng yên trên bàn cân.

---

## 🔌 3. Sơ đồ Đấu Nối Phần Cứng (ESP32 $\leftrightarrow$ VL53L8CX)

```text
   +---------------------------------------+
   |        ESP32 DEVKIT V1 (30/38 PINS)   |
   |                                       |
   | [3V3] ───────────────────────────────┐|
   | [GND] ──────────────────────────────┐||
   |                                     |||
   | [GPIO 18] (VSPI CLK)  ─────────────┐|||
   | [GPIO 19] (VSPI MISO) ────────────┐||||
   | [GPIO 23] (VSPI MOSI) ───────────┐|||||
   | [GPIO  5] (VSPI CS)   ──────────┐||||||
   | [GPIO  4] (Control)   ─────────┐|||||||
   | [GPIO 17] (Interrupt) ────────┐||||||||
   +-------------------------------+||||||||
                                   |||||||||
                                   vvvvvvvvv
                     +---------------------------+
                     |    MODULE VL53L8CX        |
                     |                           |
                     |  1. VIN / VDD   (3.3V)    | <── 3V3 ESP32
                     |  2. GND         (Mass)    | <── GND ESP32
                     |  3. SCL / SCK   (Clock)   | <── GPIO 18
                     |  4. SDO / MISO  (Data In) | <── GPIO 19
                     |  5. SDA / MOSI  (Data Out)| <── GPIO 23
                     |  6. NCS / CS    (Select)  | <── GPIO 5
                     |  7. LPN / XSHUT (Enable)  | <── GPIO 4
                     |  8. INT / GPIO1 (Ngắt)    | <── GPIO 17 (Tùy chọn)
                     |  9. I2C_SPI_N   (Chế độ)  | <── Kéo lên 3V3 (SPI Mode)
                     | 10. PWREN       (Nguồn)   | <── Kéo lên 3V3 (Enable)
                     +---------------------------+
```

### Cấu hình Mặc định: SPI Bus (VSPI Tốc độ cao 10 MHz)

| Chân ESP32 DevKit          | Chân Module VL53L8CX     | Chức năng SPI        | Ghi chú                                |
| :------------------------- | :----------------------- | :------------------- | :------------------------------------- |
| **`3V3`**                  | **`VIN`** _(hoặc IOVDD)_ | Nguồn 3.3V           | ⚠️ Tuyệt đối không cắm vào chân 5V/VIN |
| **`GND`**                  | **`GND`**                | Nối đất chung        | Chung Mass                             |
| **`GPIO 18`**              | **`SCL / SCLK`**         | SPI Clock (10MHz)    | Tuyến xung nhịp SPI                    |
| **`GPIO 19`**              | **`MISO / SDO`**         | Master In Slave Out  | ESP32 đọc dữ liệu frame                |
| **`GPIO 23`**              | **`MOSI / SDA`**         | Master Out Slave In  | ESP32 gửi lệnh/cấu hình                |
| **`GPIO 5`**               | **`NCS / CS`**           | Chip Select          | Kéo LOW khi truyền dữ liệu SPI         |
| **`GPIO 4`**               | **`LPn`**                | Low Power Enable     | Kéo HIGH để bật chip                   |
| **`GPIO 17`** _(Tùy chọn)_ | **`INT`**                | Chân ngắt Data Ready | Báo frame mới (Zero polling)           |
| **`3V3`**                  | **`I2C_SPI_N`**          | Chế độ SPI           | Kéo lên 3V3 để chọn SPI (bắt buộc)     |
| **`3V3`**                  | **`PWREN`**              | Power Enable         | Kéo lên 3V3 để bật nguồn module        |

---

## 4. Hướng dẫn kiểm thử & Chạy lệnh

### A. Chạy Unit Test Native trên máy tính (Không cần ESP32 thật):

```bash
cd firmware/esp32-vl53l8cx-driver
pio test -e native
```

### B. Biên dịch và Nạp Firmware lên ESP32:

```bash
cd firmware/esp32-vl53l8cx-driver
pio run -e esp32dev -t upload
```

### C. Mở Serial Monitor theo dõi tiến trình (460800 baud):

```bash
pio device monitor -b 460800
```
