# Firmware ESP32 VL53L5CX C++ Driver (PlatformIO)

> **Mô tả ngắn**: Driver C++ điều khiển cảm biến khoảng cách Time-of-Flight đa vùng STMicroelectronics VL53L5CX (8x8 = 64 zones @ 15Hz) cho vi điều khiển ESP32, hỗ trợ mode **Mock Data giả lập người đứng** và giao thức truyền dữ liệu nhị phân (Binary Serial Protocol + CRC16).

---

## ⚠️ Đoạn Cảnh báo & Phân biệt

- **Mô-đun phần cứng C++ (Firmware)**: Code trong thư mục này được viết bằng C++ chuẩn (hỗ trợ cả framework Arduino/ESP32 trên PlatformIO lẫn chạy native desktop).
- **Phân biệt với Mobile App Engine**: Driver C++ chịu trách nhiệm đọc dữ liệu từ phần cứng (hoặc sinh Mock Data) và đóng gói nhị phân gửi qua USB Serial với tần số 15Hz (66ms). Thuật toán tính toán chiều cao final ($\cos\theta$, gom cụm blob) chạy trên React Native App via `HeightMeasurementEngine.ts`.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- 📄 **[Tài liệu Đặc tả VL53L5CX Spec V5.1](file:///d:/promedi/docs/hard-ware/vl53l5cx-distance-sensor-spec.md)**
- 📄 **[Tài liệu Đặc tả Thuật toán Ma trận VL53L8CX/L5CX V5.1](file:///d:/promedi/docs/hard-ware/vl53l8cx-distance-sensor-spec.md)**
- 📄 **[Tài liệu Hướng dẫn Phần cứng Kiosk](file:///d:/promedi/docs/hard-ware/README.md)**

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                                | Trách nhiệm                                                                                                                                    |        Chạm Vào/Ra (I/O)         |
| :----------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------: |
| [`include/VL53L5CXDriver.h`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/include/VL53L5CXDriver.h)           | Interface class `VL53L5CXDriver`, định nghĩa frame data 204 bytes, enum trạng thái & hằng số CRC16                                             |          ❌ Logic thuần          |
| [`src/VL53L5CXDriver.cpp`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/src/VL53L5CXDriver.cpp)               | Hiện thực hoá hàm đọc dữ liệu, sinh Mock Frame 8x8 (giả lập đỉnh đầu ~500mm), đóng/mở gói nhị phân (Serialize/Deserialize) và đảo lăng kính Rx | ❌ Logic thuần / 🌐 Hardware I2C |
| [`src/main.cpp`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/src/main.cpp)                                   | Luồng khởi tạo ESP32 Arduino framework, vòng lặp `loop()` phát gói Serial binary 460800 baud ở 15Hz                                            |          🌐 Serial I/O           |
| [`test/test_vl53l5cx_driver.cpp`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/test/test_vl53l5cx_driver.cpp) | Bộ unit test native C++ kiểm tra 5 kịch bản (Init, Mock frame shape, Serialize/Deserialize, CRC16 corruption, Rx lens flip)                    |           ❌ Zero I/O            |
| [`platformio.ini`](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/platformio.ini)                               | File cấu hình PlatformIO cho môi trường hardware `esp32dev` và môi trường desktop `native`                                                     |         ❌ Configuration         |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Giao thức Nhị phân 204 Bytes (Binary Serial Protocol)**:
   - **Header**: 2 bytes (`0xAA, 0x55`).
   - **Frame ID**: 4 bytes `uint32_t` (Little Endian).
   - **Timestamp**: 4 bytes `uint32_t` (ms).
   - **Distance Matrix**: 64 x `uint16_t` = 128 bytes (khoảng cách mm từ 20mm -> 4000mm).
   - **Target Status Matrix**: 64 x `uint8_t` = 64 bytes (mã `5` = Valid 100%, `9` = Valid 50%).
   - **CRC16 Checksum**: 2 bytes `uint16_t` (kiểm tra tính toàn vẹn dữ liệu chống nhiễu bus Serial).
2. **Chế độ Mock Mode Giả lập (Hardware-Free Development)**:
   - Hỗ trợ cờ `#define MOCK_MODE_ONLY` hoặc `driver.init(true)` để phát dữ liệu ma trận 8x8 sinh bằng công thức Gaussian Parabol đỉnh đầu (~500mm) và nền nhà (~2100mm) giúp lập trình viên test ứng dụng Kiosk mà KHÔNG cần cắm phần cứng thật.
3. **Cơ chế Đảo Lăng kính Rx (Optical Lens Flipping)**:
   - Thấu kính Rx của VL53L5CX đảo ngược không gian 2 chiều (Zone 0 ở bottom-left nhận tia từ top-right). Driver cung cấp hàm `flipLensOrientation()` sẵn sàng cho ứng dụng.
4. **Cơ chế Bắt tay PING/PONG Probe Handshake**:
   - Firmware hỗ trợ nhận dạng gói lệnh PING (`0xAA 0x55 0x50 0x47` / `"PG"`) trong vòng lặp `loop()` và phản hồi ngay lập tức gói PONG Ack (`0xAA 0x55 0x4F 0x4B` / `"OK"`) cho Kiosk để tự động nhận diện thiết bị nhanh chóng.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh (Testing & Commands)

### A. Chạy Native Unit Test trên Máy tính (MinGW / GCC)

Không cần nạp vào ESP32, chạy trực tiếp trên máy host Windows/Linux/macOS:

```powershell
# Chuyển vào thư mục firmware
cd d:\promedi\firmware\esp32-vl53l5cx-driver

# Biển dịch và chạy 5 unit tests
g++ -DMOCK_MODE_ONLY -Iinclude src/VL53L5CXDriver.cpp test/test_vl53l5cx_driver.cpp -o test_runner.exe
.\test_runner.exe
```

### B. Chạy bằng PlatformIO (CLI hoặc VS Code Extension)

1. Mở thư mục `firmware/esp32-vl53l5cx-driver` trong VS Code có cài extension **PlatformIO**.
2. **Build cho ESP32**: Chọn environment `env:esp32dev` -> Click **Build**.
3. **Upload vào mạch ESP32**: Kết nối ESP32 qua USB -> Click **Upload & Monitor**.
