# Mô-đun Cảm Biến Khoảng Cách ToF VL53L5CX/L8CX (`src/core/hardware/tof/`)

> **Mô tả ngắn**: Mô-đun phần cứng React Native quản lý và giải mã luồng dữ liệu 64 vùng đo nhị phân (204 Bytes @ 15Hz) từ cảm biến trần Kiosk STMicroelectronics VL53L5CX / VL53L8CX, tự động bù góc quang học $\cos\theta$ và chốt chiều cao cơ thể người.

---

## ⚠️ Đoạn Cảnh báo & Phân biệt Trách nhiệm

- **Giao tiếp phần cứng & Giải mã nhị phân**: Mô-đun này chịu trách nhiệm nhận luồng byte từ USB Serial (`UsbSerialTransport`), giải mã 204 bytes nhị phân, kiểm tra mã lỗi CRC16 Modbus, tự động bù góc $\cos\theta$ và lọc cử chỉ giơ tay.
- **Phân biệt với InBody và Máy đo huyết áp**: Cảm biến ToF hoạt động qua luồng Stream liên tục 15Hz (66ms/frame) thay vì polling trạng thái đơn lẻ.
- **Chế độ Mock Data**: Tích hợp sẵn `startMockStream()` cho phép chạy giả lập 115 frames nhị phân từ file fixture hoặc sinh ma trận 8x8 mà KHÔNG cần cắm thiết bị thật.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- 🏛️ **[Tài liệu Đặc tả Kiến trúc & ADR V5.1 (Tier 3 Spec)](file:///d:/promedi/docs/specs/tof-height-architecture-spec.md)**
- 📋 **[Runbook Triển khai & Nghiệm thu Phần cứng (Tier 2 Plan)](file:///d:/promedi/docs/plans/tof-height-measurement-runbook.md)**
- 📄 **[Tài liệu Kỹ thuật Cảm biến VL53L5CX (Hardware Spec)](file:///d:/promedi/docs/hard-ware/vl53l5cx-distance-sensor-spec.md)**
- 📄 **[Firmware C++ ESP32 Driver Source](file:///d:/promedi/firmware/esp32-vl53l5cx-driver/README.md)**
- 📄 **[Hệ thống Hardware HAL ProMedi](file:///d:/promedi/src/core/hardware/README.md)**

---

## 1. Đang có gì (Bảng danh mục tệp & Trách nhiệm)

| Tệp                                                                                                                   | Trách nhiệm                                                                                               |    Chạm Vào/Ra (I/O)     |
| :-------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :----------------------: |
| [`types/tof.types.ts`](file:///d:/promedi/src/core/hardware/tof/types/tof.types.ts)                                   | Định nghĩa TypeScript Interfaces: `VL53L5CXFramePayload`, `HeightCalculationResult`, `IToFDistanceDevice` |       ❌ Zero I/O        |
| [`protocol/tof-frame-codec.ts`](file:///d:/promedi/src/core/hardware/tof/protocol/tof-frame-codec.ts)                 | Decode 204 bytes nhị phân, kiểm tra CRC16 Modbus, Framer cắt chuỗi chunk USB Serial & lật thấu kính Rx    |       ❌ Zero I/O        |
| [`engine/height-measurement.engine.ts`](file:///d:/promedi/src/core/hardware/tof/engine/height-measurement.engine.ts) | Bảng tra cứu $\cos\theta$, tính độ sâu $z$, tìm cụm đỉnh đầu, lọc giơ tay và chốt chiều cao final (cm)    |       ❌ Zero I/O        |
| [`client/tof-client.ts`](file:///d:/promedi/src/core/hardware/tof/client/tof-client.ts)                               | Client API quản lý Stream, đăng ký callback `onFrame`/`onHeightResult` & phát Mock Data 15Hz              |       ❌ Zero I/O        |
| [`device/tof.device.ts`](file:///d:/promedi/src/core/hardware/tof/device/tof.device.ts)                               | Device Adapter `ToFDistanceDevice` kết nối `UsbSerialTransport` (460800 baud) hoặc fallback Mock Stream   | ⚠️ **I/O Native Serial** |
| [`index.ts`](file:///d:/promedi/src/core/hardware/tof/index.ts)                                                       | Barrel file gom và re-export toàn bộ module ToF                                                           |       ❌ Zero I/O        |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Bảng tra cứu $\cos\theta$ cố định (Pre-calculated Cosine Lookup Table)**:
   - Thay vì gọi `Math.cos()` và `Math.atan()` liên tục 64 lần cho mỗi frame 66ms (gây tải CPU và ép Garbage Collector trên Kiosk), Engine tính sẵn bảng `cosLookupTable[8][8]` khi khởi tạo.
2. **Cơ chế Lọc cử chỉ Giơ tay (Hand Gesture Filter)**:
   - Nếu đỉnh đầu cao nhất (`peakHeight`) cách cụm vùng đo kế tiếp (`p90Height`) $\ge 50\text{mm}$, Engine tự nhận biết đó là bàn tay giơ lên và loại bỏ để chốt chiều cao đúng theo `p90Height`.
3. **Cơ chế Thường trực Stream Framer (ToFStreamFramer)**:
   - Khi nhận dữ liệu phân mảnh từ Android USB Serial, `ToFStreamFramer` tự cộng dồn buffer, tìm Header `0xAA 0x55` và cắt gói đúng 204 bytes trước khi giải mã.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# 1. Kiểm tra TypeScript Strict Mode
npx tsc --noEmit

# 2. Kiểm tra ESLint
npm run lint

# 3. Chạy Unit Test
npx jest src/core/hardware/tof
```
