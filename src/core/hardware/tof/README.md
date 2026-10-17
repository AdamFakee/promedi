# Mô-đun Đo Chiều Cao ToF VL53L5CX (`src/core/hardware/tof/`)

> **Mô tả ngắn**: Mô-đun phần cứng đo chiều cao không tiếp xúc Time-of-Flight (ToF) STMicroelectronics VL53L5CX. Toàn bộ quy trình tính toán 8 bước toán học (Bù góc $\cos\theta$, trừ Baseline sàn/bệ cân, tách vòm đầu, lọc nhiễu giật Glitch, lọc ngoại lai MAD, đánh giá ổn định Range $\le 10\text{mm}$ và chốt Trimmed Mean) được thực thi trực tiếp trên vi điều khiển ESP32 và truyền lên Kiosk qua Giao thức Nhị Phân Siêu Tinh Gọn 16 Bytes (Height Result Packet @ 15Hz).

---

## ⚠️ Đoạn Cảnh báo & Phân biệt Trách nhiệm

- **Kiến trúc Tách Module Đo Chiều Cao Độc Lập**: Cảm biến ToF không còn là module đo khoảng cách trả ma trận thô 64 zones (204 bytes) lên Kiosk như trước. Firmware C++ trên ESP32 tự động tính toán và trả trực tiếp gói kết quả chiều cao 16 Bytes (`HeightPacketPayload`) gồm: trạng thái FSM (`IDLE`, `MEASURING`, `HOLD_STILL`, `LOCKED`, `TIMEOUT`), chiều cao chốt `lockedHeightMm`, chiều cao tức thời `instantHeightMm`, tiến trình ổn định `progress` 0-100%, và cờ sự kiện `event` (`PERSON_PRESENT`, `LOCKED`, `PERSON_LEFT`, `TIMEOUT`).
- **Giao tiếp Hai Chiều & Cấu hình Động (Bi-directional Control)**:
  - Kiosk gửi lệnh **PING** (`0xAA 0x55 0x50 0x47`) $\rightarrow$ ESP32 phản hồi **PONG** (`0xAA 0x55 0x4F 0x4B`).
  - Kiosk gửi lệnh **CONFIG** (`0xAA 0x55 0x43 0x46` + 14B) $\rightarrow$ ESP32 cập nhật `expectedFloorMm` (2220mm), `platformHeightMm` (96mm), `gainScale`, `offsetMm` và phản hồi **CONFIG_OK** (`0xAA 0x55 0x43 0x4B`).
  - Kiosk gửi lệnh **RESET** (`0xAA 0x55 0x52 0x53`) $\rightarrow$ ESP32 reset FSM về IDLE.
  - Chế độ **DEBUG RAW** (`0xAA 0x55 0x44 0x42`): Bật/tắt truyền thêm gói 204B thô khi cần hiển thị Heatmap Test Bench.
- **Phối hợp với Máy InBody 260S**: `inbodySessionMachine` bắt tay chặt chẽ với ToF: Sau khi InBody cân xong tải trọng (`STATUS 10`), FSM chờ ToF phát sự kiện `TOF_LOCKED` để nạp chính xác chiều cao vào hồ sơ đo BIA.
- **Chế độ Giả lập (Mock Stream)**: `ToFClient` hỗ trợ `startMockStream()` phát chuỗi kết quả chiều cao giả lập (15Hz) cho phép dev/test trên simulator mà không cần cắm thiết bị thật.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- 📄 **[Firmware C++ Height Engine Source](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/)**
- 📄 **[Đặc tả Giao thức 16 Bytes HeightProtocol.h](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/include/HeightProtocol.h)**
- 📄 **[Thuật toán C++ HeightEngine.cpp](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/src/HeightEngine.cpp)**
- 📄 **[Hệ thống Hardware HAL ProMedi](file:///d:/promedi/src/core/hardware/README.md)**
- 📄 **[Đặc tả Use Case V4.0](file:///d:/promedi/docs/specs/usecase-specification-v4.0.md)**

---

## 1. Đang có gì (Bảng danh mục tệp & Trách nhiệm)

| Tệp                                                                                                     | Trách nhiệm                                                                                                                    |    Chạm Vào/Ra (I/O)     |
| :------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------- | :----------------------: |
| [`types/tof.types.ts`](file:///d:/promedi/src/core/hardware/tof/types/tof.types.ts)                     | Định nghĩa TypeScript Interfaces: `HeightPacketPayload`, `HeightCalculationResult`, `HeightEngineConfig`, `IToFDistanceDevice` |       ❌ Zero I/O        |
| [`protocol/tof-height-codec.ts`](file:///d:/promedi/src/core/hardware/tof/protocol/tof-height-codec.ts) | Giải mã gói 16B `decodeHeightPacket`, đóng gói lệnh PING, CONFIG, RESET, và bộ cắt khung `HeightStreamFramer`                  |       ❌ Zero I/O        |
| [`protocol/tof-frame-codec.ts`](file:///d:/promedi/src/core/hardware/tof/protocol/tof-frame-codec.ts)   | Giải mã gói 204B cũ (chế độ Debug Heatmap), kiểm tra CRC16 Modbus                                                              |       ❌ Zero I/O        |
| [`client/tof-client.ts`](file:///d:/promedi/src/core/hardware/tof/client/tof-client.ts)                 | Client API quản lý Stream, đồng bộ cấu hình `updateEngineConfig`, phát `onHeightResult` và chạy Mock Stream                    |       ❌ Zero I/O        |
| [`device/tof.device.ts`](file:///d:/promedi/src/core/hardware/tof/device/tof.device.ts)                 | Device Adapter `ToFDistanceDevice` kết nối `UsbSerialTransport` (460800 baud) giao tiếp trực tiếp với ESP32                    | ⚠️ **I/O Native Serial** |
| [`index.ts`](file:///d:/promedi/src/core/hardware/tof/index.ts)                                         | Barrel file gom và re-export toàn bộ module ToF                                                                                |       ❌ Zero I/O        |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Chuyển toàn bộ 8 bước xử lý toán học xuống Firmware C++ (ESP32)**:
   - Triệt tiêu hoàn toàn độ trễ (latency) và jitter do Android USB driver và GC pauses của JavaScript.
   - Giảm tải băng thông USB từ 3KB/s xuống gói 16 Bytes event-driven cực kỳ sạch sẽ và ổn định.
2. **Gói tin nhị phân 16 Bytes (Height Packet)**:
   - Header `0xAA 0x55 'H'`, mã trạng thái FSM, mã hướng dẫn voice, chiều cao chốt (mm), chiều cao tức thời (mm), tiến trình ổn định progress 0-100%, độ tin cậy confidence, mã sự kiện `event` và checksum CRC16-Modbus.
3. **Mốc vật lý chuẩn Kiosk ProMedi**:
   - Mặc định: Chiều cao cảm biến trần `expectedFloorMm: 2220` (222.0 cm), Độ dày bệ cân InBody `platformHeightMm: 96` (9.6 cm). Chiều cao tối thiểu nhận diện người: `900 mm` (dưới 90cm coi như sàn trống).
4. **Bộ đếm thời gian thực và tiêu chuẩn chốt khóa (Lock Criteria V5.2)**:
   - Trích xuất đỉnh đầu trọng số (Crown Peak Weighted: 60/25/15%) kết hợp kẹp chống Spike tóc đen ($|\Delta| > 15\text{mm}$).
   - Yêu cầu người đứng yên bất động trong $\ge 2000\text{ms}$ (2.0 giây) và $\ge 16$ mẫu hợp lệ.
   - Dao động rung lắc trong cửa sổ trượt: $\text{Range} \le 12\text{mm}$ ($1.2\text{ cm}$) để bù trừ nhịp thở tự nhiên.
   - Vận tốc dịch chuyển thẳng đứng: $|\text{Slope}| \le 6.0\text{mm/s}$.
   - Chốt kết quả bằng phương pháp Trimmed Mean 10% (cắt bỏ 10% biên dưới và 10% biên trên).
5. **Cơ chế Bắt tay An Toàn với Máy InBody 260S**:
   - FSM `inbodySessionMachine` chờ ToF phát sự kiện `TOF_LOCKED` mới nạp chiều cao sang máy InBody. Nếu quá 5 giây chưa lock, hệ thống kích hoạt timeout an toàn.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# 1. Chạy bài kiểm thử TypeScript Jest cho ToF Height Module
npx jest src/core/hardware/tof/__tests__/tof-height.test.ts

# 2. Biên dịch và chạy kiểm thử Native C++ trên Firmware ESP32
cd firmware/esp32-vl53l5cx-driver
g++ -std=c++11 -I include -D MOCK_MODE_ONLY src/VL53L5CXDriver.cpp src/HeightEngine.cpp test/test_height_engine.cpp -o test_height_engine.exe
.\test_height_engine.exe

# 3. Kiểm tra TypeScript Strict Mode toàn dự án
npx tsc --noEmit
```
