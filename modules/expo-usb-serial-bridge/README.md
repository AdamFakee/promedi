# Expo USB Serial Bridge Native Module (`modules/expo-usb-serial-bridge`)

Native Module cho Expo (Kotlin / Android) bọc thư viện [`usb-serial-for-android`](https://github.com/mik3y/usb-serial-for-android) (v3.11.0).

---

## 🎯 Chức năng chính

- Quản lý và giao tiếp bất đồng bộ với các cáp USB-to-Serial (CH340, FTDI, CP210x...).
- Hỗ trợ đa cổng mở đồng thời (`inbody`, `bpbio`, `probe:inbody`, `probe:bpbio`).
- Xử lý quyền truy cập USB từ Android OS qua `requestPermission()` với lọc `EXTRA_DEVICE` chính xác.
- Luồng đọc ngầm không chặn qua `SerialInputOutputManager.start()`.

---

## 📡 API Methods & Events

### Methods (AsyncFunction)

- `listDevices()`: Trả danh sách các USB Candidates (`deviceKey`, `vendorId`, `productId`, `deviceName`).
- `requestPermission(deviceKey)`: Xin quyền truy cập thiết bị USB từ Android OS.
- `open(portId, deviceKey, baudRate)`: Mở cổng USB Serial và bắt đầu luồng đọc nền.
- `write(portId, bytes)`: Ghi mảng byte dữ liệu ra cổng Serial chỉ định.
- `close(portId)`: Đóng cổng Serial và ngắt luồng đọc.

### Events (EventEmitter)

- `onData`: Bắn byte thô đọc được `{ portId, bytes }`.
- `onDetached`: Báo khi cáp USB bị rút đột ngột `{ portId, message }`.
- `onError`: Báo lỗi phần cứng `{ portId, message }`.
