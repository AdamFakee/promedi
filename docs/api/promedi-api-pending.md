# API Đang Chờ (Pending & WIP)

Tệp này chứa các API đang ở trạng thái: **Đề xuất**, **Đã chốt**, **BE đang làm**, hoặc **Có trên dev (chờ FE test)**.

> **⚠️ CẢNH BÁO CHO AGENT**: Bắt buộc phải **HỎI VÀ CHỜ DEV XÁC NHẬN** trước khi di chuyển (move) bất kỳ API nào từ đây sang `api-completed.md`.
> **⚠️ QUY TẮC CHUNG:**
>
> 1. Trừ 2 API khởi tạo (`/kiosk/devices/check` và `/kiosk/devices/activate`), tất cả API còn lại đều **BẮT BUỘC** đính kèm Header: `Authorization: Bearer <accessToken>`.
> 2. Các Header yêu cầu khác (theo chuẩn): `X-Device-Id`, `X-App-Version`, `X-Request-Id`.
> 3. Response chuẩn hóa luôn có cấu trúc: `{ success: boolean, data: { ... }, requestId: "..." }`.

---

## 1. Xác thực thiết bị Kiosk (Device Auth)

### 1.1 `[POST] /kiosk/devices/check`

- **Mục đích**: Tự động check Serial khi cài app mới để khôi phục phiên bản nếu đã từng kích hoạt.
- **Request**:
  ```json
  { "deviceSerial": "SUNMI-K2-9999" }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "isRegistered": true,
      "isActive": true,
      "accessToken": "ey...",
      "refreshToken": "ey...",
      "device": {
        "id": "dev_123456",
        "deviceSerial": "SUNMI-K2-9999",
        "deviceName": "Kiosk Tầng 1 - Sảnh A",
        "deviceModel": "Sunmi K2 mini",
        "location": "Sảnh A",
        "isActive": true,
        "facility": { "id": "fac_001", "name": "Phòng Khám Đa Khoa A", "address": "123 Đường B" },
        "config": {
          "configVersion": 12,
          "voiceGuidanceEnabled": true,
          "printerEnabled": true,
          "timeouts": {
            "measureInbodySeconds": 120,
            "measureBpSeconds": 120,
            "summarySeconds": 60
          },
          "retries": { "measureInbodyMax": 3, "measureBpMax": 3 },
          "monitoring": { "heartbeatIntervalSeconds": 60 }
        }
      }
    },
    "requestId": "req_123"
  }
  ```

### 1.2 `[POST] /kiosk/devices/activate`

- **Mục đích**: Kích hoạt thiết bị bằng code do Admin cấp.
- **Request**:
  ```json
  { "activationCode": "847291", "deviceSerial": "SUNMI-K2-9999" }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "ey...",
      "refreshToken": "ey...",
      "device": {
        "id": "dev_123456",
        "deviceSerial": "SUNMI-K2-9999",
        "deviceName": "Kiosk Tầng 1 - Sảnh A",
        "deviceModel": "Sunmi K2 mini",
        "location": "Sảnh A",
        "isActive": true,
        "facility": { "id": "fac_001", "name": "Phòng Khám Đa Khoa A", "address": "123 Đường B" },
        "config": {
          "configVersion": 12,
          "voiceGuidanceEnabled": true,
          "printerEnabled": true,
          "timeouts": {
            "measureInbodySeconds": 120,
            "measureBpSeconds": 120,
            "summarySeconds": 60
          },
          "retries": { "measureInbodyMax": 3, "measureBpMax": 3 },
          "monitoring": { "heartbeatIntervalSeconds": 60 }
        }
      }
    },
    "requestId": "req_123"
  }
  ```

### 1.3 `[POST] /kiosk/devices/refresh`

- **Mục đích**: Làm mới accessToken khi token hiện tại hết hạn.
- **Auth**: `Authorization: Bearer <accessToken>`
- **Request**:
  ```json
  { "refreshToken": "ey..." }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "ey...",
      "refreshToken": "ey..."
    },
    "requestId": "req_123"
  }
  ```

### 1.4 `[GET] /kiosk/devices/me`

- **Mục đích**: Verify accessToken & lấy lại cấu hình khi Kiosk khởi động.
- **Auth**: `Authorization: Bearer <accessToken>`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "device": {
        "id": "dev_123456",
        "deviceSerial": "SUNMI-K2-9999",
        "deviceName": "Kiosk Tầng 1 - Sảnh A",
        "deviceModel": "Sunmi K2 mini",
        "location": "Sảnh A",
        "isActive": true,
        "facility": { "id": "fac_001", "name": "Phòng Khám Đa Khoa A", "address": "123 Đường B" },
        "config": {
          "configVersion": 12,
          "voiceGuidanceEnabled": true,
          "printerEnabled": true,
          "timeouts": {
            "measureInbodySeconds": 120,
            "measureBpSeconds": 120,
            "summarySeconds": 60
          },
          "retries": { "measureInbodyMax": 3, "measureBpMax": 3 },
          "monitoring": { "heartbeatIntervalSeconds": 60 }
        }
      }
    },
    "requestId": "req_123"
  }
  ```

### 1.5 `[GET] /kiosk/devices/me/config`

- **Mục đích**: Lấy cấu hình mới nhất khi `configVersion` thay đổi.
- **Auth**: `Authorization: Bearer <accessToken>`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "config": {
        "configVersion": 12,
        "voiceGuidanceEnabled": true,
        "printerEnabled": true,
        "timeouts": {
          "measureInbodySeconds": 120,
          "measureBpSeconds": 120,
          "summarySeconds": 60
        },
        "retries": {
          "measureInbodyMax": 3,
          "measureBpMax": 3
        },
        "monitoring": {
          "heartbeatIntervalSeconds": 60
        }
      }
    },
    "requestId": "req_123"
  }
  ```

---

## 2. Quản lý Phiên và Người dùng (Session Auth)

### 2.1 `[POST] /kiosk/sessions`

- **Mục đích**: Tạo phiên từ form nhập tay / đọc CCCD (chiều cao không còn nhập tay ở bước này mà tự động đo bằng cảm biến ToF ở Màn InBody).
- **Auth**: `Authorization: Bearer <accessToken>`
- **Header**: Yêu cầu `X-Idempotency-Key`
- **Request**:
  ```json
  {
    "fullName": "Nguyễn Văn A",
    "cccd": "012345678912",
    "gender": "MALE",
    "age": 30
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "ses_987654321",
      "customer": {
        "id": "cus_112233",
        "fullName": "Nguyễn Văn A",
        "cccd": "012345678912",
        "gender": "MALE",
        "age": 30,
        "isNew": true
      }
    },
    "requestId": "req_123"
  }
  ```

### 2.2 `[POST] /kiosk/sessions/qr`

- **Mục đích**: Tạo phiên từ quét QR (app MediPay/Zalo).
- **Auth**: `Authorization: Bearer <accessToken>`
- **Header**: Yêu cầu `X-Idempotency-Key`
- **Request**:
  ```json
  {
    "qrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "ses_987654321",
      "customer": {
        "id": "cus_112233",
        "fullName": "Nguyễn Văn A",
        "cccd": "012345678912",
        "gender": "MALE",
        "age": 30,
        "isNew": true
      }
    },
    "requestId": "req_123"
  }
  ```

### 2.3 `[POST] /kiosk/sessions/{id}/results`

- **Mục đích**: Gửi kết quả đo lên server. Tự động đánh dấu phiên là `COMPLETED`.
- **Auth**: `Authorization: Bearer <accessToken>`
- **Request**:
  ```json
  {
    "inBody": {
      "height": 173.5,
      "weight": 65.5,
      "protein": 11.2,
      "minerals": 3.4,
      "bfm": 15.1,
      "tbw": 38.5,
      "ffm": 50.4,
      "smm": 30.2,
      "bmi": 22.5,
      "pbf": 23.0,
      "whr": 0.85,
      "bmr": 1500,
      "vfl": 5,
      "inBodyScore": 75,
      "smi": 7.5,
      "segmental": {
        "ffmRightArm": 3.1,
        "ffmLeftArm": 3.1,
        "ffmTrunk": 24.5,
        "ffmRightLeg": 8.5,
        "ffmLeftLeg": 8.5,
        "bfmRightArm": 0.8,
        "bfmLeftArm": 0.8,
        "bfmTrunk": 6.5,
        "bfmRightLeg": 2.2,
        "bfmLeftLeg": 2.2
      },
      "control": {
        "targetWeight": 65.0,
        "weightControl": -0.5,
        "bfmControl": -1.5,
        "ffmControl": 1.0
      },
      "normalRanges": {
        "upperLimitWeight": 70.5,
        "lowerLimitWeight": 50.0,
        "upperLimitBmi": 23.0,
        "lowerLimitBmi": 18.5
      },
      "evaluations": {
        "evaluationProtein": 1,
        "obesityEvaluationBmi": 1
      },
      "segmentalEvals": {
        "leanMassEvaluationLeftArm": 1,
        "bodyFatMassEvaluationLeftArm": 1
      },
      "raw": ["02", "61", "12", "..."]
    },
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80,
      "pulseRate": 75,
      "pulsePressure": 40,
      "meanArterialPressure": 93,
      "armSide": "RIGHT",
      "measuredAt": "2026-10-01T11:45:00Z"
    }
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "recordId": "rec_abc123",
      "resultUrl": "https://promedi.vn/results/rec_abc123?token=xyz123"
    },
    "requestId": "req_123"
  }
  ```

### 2.4 `[POST] /kiosk/sessions/{id}/cancel`

- **Mục đích**: Hủy phiên khi khách bỏ dở hoặc lỗi phần cứng.
- **Auth**: `Authorization: Bearer <accessToken>`
- **Request**:
  ```json
  {
    "reason": "TIMEOUT"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {},
    "requestId": "req_123"
  }
  ```

---

## 3. Giám sát & Báo lỗi Kiosk (Device Monitoring)

### 3.1 `[POST] /kiosk/devices/heartbeat`

- **Mục đích**: Kiosk gửi định kỳ để báo "còn sống".
- **Auth**: `Authorization: Bearer <accessToken>`
- **Request**:
  ```json
  {
    "status": "IDLE",
    "activeSessionId": null,
    "uptime": 86400,
    "appVersion": "1.2.0",
    "peripherals": {
      "bpDevice": "CONNECTED",
      "inBodyDevice": "CONNECTED",
      "tofDevice": "CONNECTED",
      "network": "ONLINE"
    }
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "serverTime": "2026-10-01T12:00:00Z",
      "configVersion": 12
    },
    "requestId": "req_123"
  }
  ```

### 3.2 `[POST] /kiosk/devices/incidents`

- **Mục đích**: Báo cáo sự cố (hỗ trợ batch gửi nhiều lỗi một lúc).
- **Auth**: `Authorization: Bearer <accessToken>`
- **Request**:
  ```json
  {
    "deviceSerial": "SUNMI-K2-9999",
    "incidents": [
      {
        "localId": "inc_local_001",
        "type": "HARDWARE_DISCONNECTED",
        "severity": "CRITICAL",
        "occurredAt": "2026-10-01T04:45:30Z",
        "sessionId": "ses_987654321",
        "metadata": {
          "deviceType": "BPBIO_750",
          "usbDevice": "/dev/bus/usb/001/002",
          "errorMessage": "USB device timeout after 5000ms"
        }
      }
    ]
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "received": 1
    },
    "requestId": "req_123"
  }
  ```

### 3.3 Bảng Danh mục Loại Sự cố (Incident Type Catalog)

#### 🌐 Mạng (Network)

| `type`             |  Severity  | Khi nào phát sinh            | `metadata` chính             |
| :----------------- | :--------: | :--------------------------- | :--------------------------- |
| `NETWORK_LOST`     | `CRITICAL` | `NetInfo` detect mất kết nối | `{ lastOnlineAt }`           |
| `NETWORK_RESTORED` |   `INFO`   | Khôi phục mạng thành công    | `{ offlineDurationSeconds }` |

#### 🏥 Thiết bị Y tế (Medical Hardware)

> **`deviceType` hỗ trợ**: `'BPBIO_750'`, `'INBODY_260S'`, `'TOF_VL53L5CX'`.

| `type`                   |  Severity  | Khi nào phát sinh                                                     | `metadata` chính                                                       |
| :----------------------- | :--------: | :-------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `HARDWARE_DISCONNECTED`  | `CRITICAL` | Adapter gọi device mà không thể kết nối USB/Serial/BLE                | `{ deviceType, usbDevice, errorMessage }`                              |
| `HARDWARE_RECONNECTED`   |   `INFO`   | Device adapter kết nối lại thành công                                 | `{ deviceType, usbDevice, disconnectedDurationSeconds }`               |
| `HARDWARE_TIMEOUT`       | `WARNING`  | Device connected nhưng không phản hồi trong thời gian chờ             | `{ deviceType, timeoutMs, command }`                                   |
| `HEIGHT_MEASURE_TIMEOUT` | `WARNING`  | Quá thời gian 15s cảm biến ToF không thể khóa chiều cao do lắc lư/lỗi | `{ deviceType: 'TOF_VL53L5CX', timeoutMs: 15000, lastDetectedHeight }` |

#### 🖨️ Ngoại vi Kiosk (Kiosk Peripherals)

| `type`              | Severity  | Khi nào phát sinh                                    | `metadata` chính                |
| :------------------ | :-------: | :--------------------------------------------------- | :------------------------------ |
| `PRINTER_ERROR`     | `WARNING` | Máy in Sunmi báo lỗi (hết giấy, kẹt giấy, quá nhiệt) | `{ printerStatus, errorCode }`  |
| `PRINTER_RECOVERED` |  `INFO`   | Máy in hoạt động lại bình thường                     | `{ previousError }`             |
| `QR_SCANNER_ERROR`  | `WARNING` | Đầu đọc QR/CCCD không phản hồi                       | `{ scannerType, errorMessage }` |
| `SPEAKER_ERROR`     | `WARNING` | Voice Engine không thể phát âm thanh                 | `{ audioFile, errorMessage }`   |

#### 📱 Vòng đời App (App Lifecycle)

| `type`                          |  Severity  | Khi nào phát sinh                                     | `metadata` chính                                               |
| :------------------------------ | :--------: | :---------------------------------------------------- | :------------------------------------------------------------- |
| `APP_BOOT`                      |   `INFO`   | Kiosk khởi động / app mở lên                          | `{ appVersion, bootReason: "COLD_START" \| "CRASH_RECOVERY" }` |
| `APP_CRASH_RECOVERED`           | `CRITICAL` | App phát hiện lần chạy trước bị crash (flag kiểm tra) | `{ crashTimestamp, lastScreen }`                               |
| `APP_OPERATING_HOURS_VIOLATION` | `WARNING`  | Kiosk tắt/restart trong khung giờ hoạt động cấu hình  | `{ configuredHours, actualBootAt }`                            |

#### 📊 Lỗi Đo lường (Measurement Errors)

| `type`                          | Severity  | Khi nào phát sinh                                              | `metadata` chính                                                       |
| :------------------------------ | :-------: | :------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `MEASUREMENT_RETRIES_EXHAUSTED` | `WARNING` | Đo fail liên tiếp hết số lần retry cho phép                    | `{ deviceType, maxRetries, errors[] }`                                 |
| `MEASUREMENT_SENSOR_WARNING`    |  `INFO`   | Cảnh báo cảm biến (cùi chỏ rời, contact chưa đủ) — từng lần lẻ | `{ deviceType, sensorCode: "BP_ELBOW_OFF" \| "INBODY_CONTACT_ERROR" }` |

---

## 4. Phụ lục: Các Data Models (Interfaces)

### 4.1 `DeviceConfig`

Bảng cấu hình linh hoạt của Kiosk, được đồng bộ từ Admin Portal.

| Field                                 | Type      | Bắt buộc | Ý nghĩa                                                                  |
| :------------------------------------ | :-------- | :------: | :----------------------------------------------------------------------- |
| `configVersion`                       | `number`  |    ✅    | Phiên bản cấu hình hiện tại. Dùng để so sánh khi lấy config mới.         |
| `voiceGuidanceEnabled`                | `boolean` |    ✅    | Cho phép phát âm thanh hướng dẫn (Voice Engine) ở màn hình 3, 4, 5, 6.   |
| `printerEnabled`                      | `boolean` |    ✅    | Cho phép in phiếu kết quả ra máy in nhiệt Sunmi K2.                      |
| `timeouts.measureInbodySeconds`       | `number`  |    ✅    | Đếm ngược tự động hủy phiên (Timeout) ở màn hình đo InBody (giây).       |
| `timeouts.measureBpSeconds`           | `number`  |    ✅    | Đếm ngược tự động hủy phiên ở màn hình đo Huyết áp (giây).               |
| `timeouts.summarySeconds`             | `number`  |    ✅    | Đếm ngược tự động đóng phiên khám ở màn hình Kết quả (giây).             |
| `retries.measureInbodyMax`            | `number`  |    ✅    | Số lần tối đa cho phép đo lại InBody nếu gặp lỗi cảm biến (tối thiểu 1). |
| `retries.measureBpMax`                | `number`  |    ✅    | Số lần tối đa cho phép đo lại Huyết áp nếu lỗi cử động (tối thiểu 1).    |
| `monitoring.heartbeatIntervalSeconds` | `number`  |    ✅    | Tần suất gửi API `/kiosk/devices/heartbeat` (giây).                      |

### 4.2 `DeviceInfo`

Thông định danh Kiosk và cấu hình tương ứng.

| Field          | Type           | Bắt buộc | Ý nghĩa                                                |
| :------------- | :------------- | :------: | :----------------------------------------------------- |
| `id`           | `string`       |    ✅    | UUID định danh Kiosk trên hệ thống.                    |
| `deviceSerial` | `string`       |    ✅    | Số Serial vật lý của Kiosk (ví dụ: SUNMI-K2-9999).     |
| `deviceName`   | `string`       |    ✅    | Tên gọi Kiosk để hiển thị (do Admin đặt).              |
| `deviceModel`  | `string`       |    ✅    | Model phần cứng (vd: Sunmi K2 mini).                   |
| `location`     | `string`       |    ✅    | Vị trí đặt máy cụ thể.                                 |
| `isActive`     | `boolean`      |    ✅    | Trạng thái hoạt động. Nếu `false`, Kiosk phải tự khóa. |
| `facility`     | `object`       |    ✅    | Thông tin cơ sở y tế `{ id, name, address }`.          |
| `config`       | `DeviceConfig` |    ✅    | Cấu hình vận hành Kiosk (xem 4.1).                     |

### 4.3 `CustomerSession`

Thông tin khách hàng gắn với phiên khám hiện tại.

| Field      | Type      | Bắt buộc | Ý nghĩa                                                   |
| :--------- | :-------- | :------: | :-------------------------------------------------------- |
| `id`       | `string`  |    ✅    | UUID định danh khách hàng trên DB.                        |
| `fullName` | `string`  |    ✅    | Họ và tên.                                                |
| `cccd`     | `string`  |    ✅    | Số Căn cước công dân (12 chữ số).                         |
| `height`   | `number`  |    ✅    | Chiều cao (cm). Bắt buộc để máy InBody có thể đo.         |
| `gender`   | `enum`    |    ✅    | Giới tính (`MALE`, `FEMALE`).                             |
| `age`      | `number`  |    ✅    | Tuổi. Bắt buộc để InBody phân tích dữ liệu.               |
| `isNew`    | `boolean` |    ✅    | `true` nếu là khách mới, `false` nếu match được hồ sơ cũ. |

### 4.4 `InBodyMetrics`

Toàn bộ các chỉ số đo được từ máy InBody 260S (map 1-1 với phần cứng).

| Field               | Type       | Ý nghĩa                                                                      |
| :------------------ | :--------- | :--------------------------------------------------------------------------- |
| `weight`            | `number`   | Trọng lượng cơ thể (kg)                                                      |
| `protein`           | `number`   | Khối lượng Protein (kg)                                                      |
| `minerals`          | `number`   | Khối lượng Khoáng chất (kg)                                                  |
| `bfm`               | `number`   | Body Fat Mass - Khối lượng mỡ cơ thể (kg)                                    |
| `tbw`               | `number`   | Total Body Water - Tổng lượng nước cơ thể (L)                                |
| `ffm`               | `number`   | Fat Free Mass - Khối lượng nạc (kg)                                          |
| `smm`               | `number`   | Skeletal Muscle Mass - Khối lượng cơ xương (kg)                              |
| `bmi`               | `number`   | Chỉ số khối cơ thể (kg/m²)                                                   |
| `pbf`               | `number`   | Percent Body Fat - Tỷ lệ phần trăm mỡ (%)                                    |
| `whr`               | `number`   | Waist-Hip Ratio - Tỷ lệ eo/hông                                              |
| `bmr`               | `number`   | Basal Metabolic Rate - Tỷ lệ trao đổi chất cơ bản (kcal)                     |
| `vfl`               | `number`   | Visceral Fat Level - Cấp độ mỡ nội tạng (1~20)                               |
| `inBodyScore`       | `number`   | Điểm số InBody (Thang điểm 100)                                              |
| `smi`               | `number`   | Skeletal Muscle Index (kg/m²)                                                |
| `mobileNumber`      | `string`   | Số điện thoại khách hàng nhập trên cân                                       |
| `obesityDegree`     | `number`   | Mức độ béo phì                                                               |
| `growthScore`       | `number`   | Điểm tăng trưởng - Dành cho trẻ em                                           |
| `recommendedEnergy` | `number`   | Kcal khuyến nghị                                                             |
| `impedanceCheck`    | `string`   | Mã kiểm tra lỗi trở kháng                                                    |
| `segmental`         | `object`   | Phân bổ khối lượng cơ (ffm...) & mỡ (bfm...) 5 vùng cơ thể                   |
| `control`           | `object`   | Khuyến nghị điều chỉnh (targetWeight, weightControl, bfmControl, ffmControl) |
| `normalRanges`      | `object`   | Giới hạn tiêu chuẩn (upperLimit..., lowerLimit...) của Protein, Minerals...  |
| `evaluations`       | `object`   | Đánh giá tổng quan (evaluationProtein, obesityEvaluationBmi...)              |
| `segmentalEvals`    | `object`   | Đánh giá từng chi (leanMassEvaluation..., bodyFatMassEvaluation...)          |
| `raw`               | `string[]` | Mảng dữ liệu thô (Raw fields 0..763) để audit/debug                          |

### 4.5 `BloodPressureMetrics`

Các chỉ số đo được từ máy huyết áp (BPBIO 750).

| Field                  | Type     | Ý nghĩa                       |
| :--------------------- | :------- | :---------------------------- |
| `systolic`             | `number` | Huyết áp tâm thu (mmHg)       |
| `diastolic`            | `number` | Huyết áp tâm trương (mmHg)    |
| `pulseRate`            | `number` | Nhịp tim (BPM)                |
| `pulsePressure`        | `number` | Áp lực mạch (Pulse Pressure)  |
| `meanArterialPressure` | `number` | Huyết áp trung bình (MAP)     |
| `armSide`              | `enum`   | Tay đo (`LEFT`, `RIGHT`)      |
| `measuredAt`           | `string` | Thời điểm đo (`ISO 8601 UTC`) |

### 4.6 `Incident`

Đại diện cho một sự cố phần mềm/phần cứng xảy ra tại Kiosk.

| Field        | Type     | Bắt buộc | Ý nghĩa                                                  |
| :----------- | :------- | :------: | :------------------------------------------------------- |
| `localId`    | `string` |    ✅    | UUID sinh tại Kiosk (idempotency key chống duplicate).   |
| `type`       | `string` |    ✅    | Mã loại sự cố (xem Bảng 3.3).                            |
| `severity`   | `enum`   |    ✅    | Mức độ nghiêm trọng (`INFO`, `WARNING`, `CRITICAL`).     |
| `occurredAt` | `string` |    ✅    | Thời điểm xảy ra sự cố tại Kiosk (`ISO 8601 UTC`).       |
| `sessionId`  | `string` |    ❌    | ID phiên khám đang diễn ra lúc có sự cố (null nếu rảnh). |
| `metadata`   | `object` |    ✅    | Dữ liệu bổ sung tùy theo `type` (xem Bảng 3.3).          |
