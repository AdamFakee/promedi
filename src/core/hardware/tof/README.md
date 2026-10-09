# Mô-đun Cảm Biến Khoảng Cách ToF VL53L5CX/L8CX (`src/core/hardware/tof/`)

> **Mô tả ngắn**: Mô-đun phần cứng React Native quản lý và giải mã luồng dữ liệu 64 vùng đo nhị phân (204 Bytes @ 15Hz) từ cảm biến trần Kiosk STMicroelectronics VL53L5CX / VL53L8CX, thực hiện quy trình xử lý 8 bước toán học (Floor Baseline Calibration, $\cos\theta$ Spatial Transform, Connected Blobs, Valley Depth Separation, Temporal Rolling Window MAD Filter, và Trimmed Mean Height Lock).

---

## ⚠️ Đoạn Cảnh báo & Phân biệt Trách nhiệm

- **Giao tiếp phần cứng & Giải mã nhị phân**: Mô-đun này chịu trách nhiệm nhận luồng byte từ USB Serial (`UsbSerialTransport`), giải mã 204 bytes nhị phân, kiểm tra mã lỗi CRC16 Modbus, tự động bù góc $\cos\theta$ và lọc cử chỉ giơ tay.
- **Phân biệt với InBody và Máy đo huyết áp**: Cảm biến ToF hoạt động qua luồng Stream liên tục 15Hz (66ms/frame) thay vì polling trạng thái đơn lẻ.
- **Thuật toán Chuỗi Thời Gian 8 Bước (Production Engine)**: Tích hợp đầy đủ cửa sổ trượt ~1.5s, lọc Outlier bằng Median Absolute Deviation (MAD), kiểm tra độ dốc xu hướng $\le 8\text{mm/s}$, phát hiện đứt quãng timestamp và tự động chốt chiều cao bằng Trimmed Mean 10%.
- **Chế độ Mock Data**: Tích hợp sẵn `startMockStream()` cho phép chạy giả lập 115 frames nhị phân từ file fixture hoặc sinh ma trận 8x8 mà KHÔNG cần cắm thiết bị thật.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- 🏛️ **[Tài liệu Đặc tả Kiến trúc & ADR V5.2 (Tier 3 Spec)](file:///d:/promedi/docs/specs/tof-height-architecture-spec.md)**
- 📋 **[Runbook Triển khai & Nghiệm thu Phần cứng (Tier 2 Plan)](file:///d:/promedi/docs/plans/tof-height-measurement-runbook.md)**
- 📄 **[Tài liệu Kỹ thuật Cảm biến VL53L5CX (Hardware Spec)](file:///d:/promedi/docs/hard-ware/vl53l5cx-distance-sensor-spec.md)**
- 📄 **[Firmware C++ ESP32 Driver Source](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/README.md)**
- 📄 **[Hệ thống Hardware HAL ProMedi](file:///d:/promedi/src/core/hardware/README.md)**

---

## 1. Đang có gì (Bảng danh mục tệp & Trách nhiệm)

| Tệp                                                                                                                   | Trách nhiệm                                                                                                                                                                                                                                      |    Chạm Vào/Ra (I/O)     |
| :-------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------: |
| [`types/tof.types.ts`](file:///d:/promedi/src/core/hardware/tof/types/tof.types.ts)                                   | Định nghĩa TypeScript Interfaces: `VL53L5CXFramePayload`, `HeightEngineConfig`, `HeightEngineOutput`, `HeightLockResult`, `HeightCalculationResult`, `FloorCalibrationData`, `IToFDistanceDevice`                                                |       ❌ Zero I/O        |
| [`protocol/tof-frame-codec.ts`](file:///d:/promedi/src/core/hardware/tof/protocol/tof-frame-codec.ts)                 | Decode 204 bytes nhị phân, kiểm tra CRC16 Modbus, Framer cắt chuỗi chunk USB Serial, lật thấu kính Rx & format log ma trận 8x8 ASCII (`formatToFFrame`)                                                                                          |       ❌ Zero I/O        |
| [`engine/height-measurement.engine.ts`](file:///d:/promedi/src/core/hardware/tof/engine/height-measurement.engine.ts) | Thực thi 8 bước đo lường: Hiệu chuẩn sàn, bù góc $\cos\theta$, gom cụm Blobs, thung lũng 150mm tách 2 người/tay giơ, cửa sổ trượt $1500\text{ms}$ (hold $1000\text{ms}$), chốt chiều cao bằng Trimmed Mean 10%. Mặc định `ceilingHeightMm: 2445` |       ❌ Zero I/O        |
| [`client/tof-client.ts`](file:///d:/promedi/src/core/hardware/tof/client/tof-client.ts)                               | Client API quản lý Stream, đăng ký callback `onFrame`/`onHeightResult`, xuất log 8x8 ASCII và cập nhật cấu hình `updateEngineConfig`                                                                                                             |       ❌ Zero I/O        |
| [`device/tof.device.ts`](file:///d:/promedi/src/core/hardware/tof/device/tof.device.ts)                               | Device Adapter `ToFDistanceDevice` kết nối `UsbSerialTransport` (460800 baud) hoặc fallback Mock Stream. Báo lỗi `TransportError` khi đứt cáp                                                                                                    | ⚠️ **I/O Native Serial** |
| [`index.ts`](file:///d:/promedi/src/core/hardware/tof/index.ts)                                                       | Barrel file gom và re-export toàn bộ module ToF                                                                                                                                                                                                  |       ❌ Zero I/O        |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Độ cao lắp đặt thực tế `2460 mm` (246.0 cm) & Bảng Presets**:
   - Mặc định khởi tạo tại `2460 mm` (setup Kiosk thực tế: 210cm trần + 21cm bệ InBody + 15cm giá đỡ). Hỗ trợ các mốc preset `245.7 cm`, `210.0 cm`, `184.7 cm` (cột Kiosk K2 mini), và `220.0 cm` (trần tiêu chuẩn).
2. **Hiệu chuẩn sàn theo từng zone (`floorZ[64]` baseline) & Nạp sẵn Baseline**:
   - Triệt tiêu độ nghiêng vật lý của cảm biến và mấp mô sàn. Hỗ trợ truyền `config.calibration` trực tiếp hoặc tự đo 30 frames sàn trống với điều kiện thích ứng thực tế (`stdDev <= 80mm`, $\ge 4$ zones hợp lệ).
3. **Mở rộng lọc `targetStatus` (Đặc biệt kháng hấp thụ tia IR của tóc người - Status 10)**:
   - Thay vì chỉ chấp nhận status 5 & 9, hệ thống mở rộng chấp nhận các mã phản xạ quang học hợp lệ: **5, 6, 9, 10, 12, 13** (đặc biệt mã **10 SNR Low** do tóc đen hấp thụ ánh sáng hồng ngoại). Loại bỏ nghiêm ngặt mã **7, 8** (Wrap-around) và **255** (No target).
4. **Bảng tra cứu $\cos\theta$ cố định & Hệ trục không gian ($x, y, z$)**:
   - Tính toán trước bảng `cosLookupTable[8][8]` và $\tan\theta_{x,y}$ giúp đổi tọa độ sang mm thực tế mà không gây tải CPU 15Hz trên Kiosk.
5. **Ổn định Chuỗi Thời Gian & Khóa Nhanh 0.5 Giây (Fast-Lock V6.3)**:
   - Sử dụng cửa sổ $\ge 1500\text{ms}$ theo `timestampMs`, yêu cầu giữ yên $\ge \mathbf{500\text{ms}}$ (0.5 giây), biên độ rung lắc $\text{Range} \le \mathbf{10\text{mm}}$, tối thiểu 4 mẫu hợp lệ, $|\text{Slope}| \le 8\text{mm/s}$ và chốt kết quả bằng Trimmed Mean 10%.
6. **Cơ chế Bắt tay Chống "Chốt Vội" Với Máy InBody**:
   - Khi máy InBody cân xong tải trọng (`STATUS 10`), FSM tuyệt đối không lấy số đo tức thời khi chưa khóa. FSM bắt buộc đợi ToF bắn sự kiện `TOF_LOCKED` (đã đứng yên đủ 0.5s và rung lắc $\le 10$mm) mới nạp chiều cao sang InBody. Có bộ đếm timeout 3.0s an toàn.
7. **Bộ Ghi Log Thao Trường Trực Tiếp (Direct JSONL Recording)**:
   - Ghi dữ liệu 64 zones + Target Status + Engine State vào tệp `.jsonl` cục bộ (`FileSystem.writeAsStringAsync` Append mode), tránh giật lag UI và phục vụ phân tích chuyên sâu qua ADB mà không cần mở modal chia sẻ.
8. **Log Frame Hoàn Chỉnh & Hướng Dẫn Giọng Nói Tiếng Việt**:
   - In log ma trận 8x8 ASCII hoàn chỉnh `=== [VL53L5CX FRAME #...] ===`. Tích hợp Voice Engine đọc chi tiết số đo (ví dụ: _"Một mét bảy mươi bảy phẩy chín cen-ti-mét"_).

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# 1. Kiểm tra TypeScript Strict Mode
npx tsc --noEmit

# 2. Kiểm tra ESLint
npm run lint

# 3. Chạy Integration Test Fixtures (21 tests PASS)
npx jest src/core/hardware/tof/__tests__/tof-fixture-suite.test.ts
```
