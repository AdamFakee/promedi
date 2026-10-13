# SUNMI Customer API - Device Information Module Specification

## Proposed Seam

- **DeviceInfo Seam (`IDeviceInfo`)**: Seam nằm ở interface `sTmsApi.getDeviceInfo()`. Interface này bao bọc toàn bộ 32 API truy xuất thông tin thiết bị (SN, Model, Firmware, BatteryInfo, SIM IMSI/IMEI/ICCID, CRP Resource Package, Hardware capabilities). Seam cho phép mock dữ liệu phần cứng trong môi trường Unit Test mà không cần thiết bị SUNMI thực tế.

## Problem Statement

Các ứng dụng POS/Kiosk cần truy vấn các thông tin định danh và phần cứng phần mềm của máy (như SN, Model, Phiên bản ROM, Tỷ lệ Pin, địa chỉ MAC, thông tin thẻ SIM theo khe slot, kiểm tra máy có máy in/máy quét tích hợp không) để phân luồng tính năng và kiểm soát giấy phép. Việc thiếu tài liệu tổng hợp code mẫu và đặc tả đầy đủ cho 32 API của `Device Information Module` sẽ gây khó khăn cho lập trình viên.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `Device Information Module` thuộc SUNMI Customer API SDK. Tài liệu tổng hợp 32 hàm API, bảng tra cứu danh mục, thông số đầu vào/đầu ra, phạm vi ứng dụng (Financial vs Non-Financial), cùng toàn bộ mã nguồn mẫu Java để tra cứu và tích hợp nhanh chóng.

## User Stories

1. As an Application Developer, I want to query device serial number (`getSerialNo`), model (`getModel`), and brand (`getBrand`), so that I can register the device to my POS cloud backend.
2. As a Hardware Diagnostics Engineer, I want to check whether the device has a built-in printer (`isInnerPrinterSupported`) or scanner (`isInnerScannerSupported`), so that peripheral drivers are initialized dynamically.
3. As a Fleet Manager, I want to read dual SIM slot IMSI, IMEI, and full ICCID (`getFullICCID`), so that cellular data subscriptions can be audited across store fleets.
4. As a Battery Monitoring Service, I want to retrieve detailed battery health and capacity metrics (`getBatteryInfo`), so that low battery or degraded battery warnings are dispatched to store managers.
5. As an OTA Update Manager, I want to verify and install resource packages (`verifyCrp`, `installCrp`), so that UI assets and language bundles update safely in background threads.

## Implementation Decisions

### 1. Phân nhóm 32 APIs thuộc `Device Information Module`

#### Group 1: Thông tin Định danh & Hệ thống (System & Identity)

- `getSerialNo()`: Lấy số Serial Number thiết bị.
- `getManufacture()`: Lấy nhà sản xuất (Mặc định "SUNMI").
- `getModel()`: Lấy Model thiết bị (Ví dụ: "V3_PLUS", "T3_PRO").
- `getBrand()`: Lấy thương hiệu ("SUNMI").
- `getAndroidOSVersion()`: Lấy phiên bản Android OS (Ví dụ: "11").
- `getAndroidKernelVersion()`: Lấy phiên bản Kernel Android.
- `getROMVersion()`: Lấy phiên bản ROM.
- `getFirmwareVersion()`: Lấy phiên bản Firmware.
- `getHardwareVersion()`: Lấy phiên bản phần cứng.
- `getSDKVersion()`: Lấy phiên bản Android SDK (Ví dụ: "30").
- `getSunmiOsVersion()`: Lấy phiên bản SUNMI OS (Ví dụ: "2.0.0").
- `getSystemBuildDisplayId()`: Lấy DisplayId trong `build.prop`.
- `getPciHardwareVersion()`: Lấy phiên bản phần cứng PCI Terminal (P3, P2SE).
- `getSystemProperty(String key)`: Lấy thuộc tính hệ thống Android (Không áp dụng cho `persist.sys`).
- `getMemoryOccupation()`: Lấy dung lượng RAM hệ thống đang sử dụng (Bytes).
- `isFinancialDevice()`: Kiểm tra thiết bị có phải dòng tài chính (Financial P-Series) không.
- `getGmsFlag()`: Kiểm tra cờ GMS (0: Non-GMS, 1: Standard GMS, 2: Sunmi non-standard GMS).

#### Group 2: Mạng & Kết nối (Network & Connectivity)

- `getMac()`: Lấy địa chỉ Wi-Fi MAC (Yêu cầu bật Wi-Fi).
- `getDeviceBluetoothMacAddress()`: Lấy địa chỉ Bluetooth MAC (Yêu cầu bật và kết nối Bluetooth).
- `getIpAddresses()`: Lấy địa chỉ IP mạng hiện tại (Wi-Fi / Ethernet / Cellular).
- `getIMSI()` & `getIMSIBySlotIndex(int slotIndex)`: Lấy IMSI của SIM slot 0 (Slot 1) hoặc slot 1 (Slot 2).
- `getIMEI()` & `getIMEIBySlotIndex(int slotIndex)`: Lấy IMEI của khe SIM tương ứng.
- `getFullICCID(int slotIndex)`: Lấy mã ICCID đầy đủ (Bao gồm chữ cái tiếng Anh không bị Google API cắt bớt).

#### Group 3: Khả năng Phần cứng & Gói Tài nguyên (Capabilities & Resource Packages CRP)

- `isInnerScannerSupported()`: Kiểm tra có máy quét mã vạch tích hợp không.
- `isInnerPrinterSupported()`: Kiểm tra có máy in nhiệt tích hợp không.
- `verifyCrp(String filePath)`: Xác minh tính hợp lệ của gói CRP (Chạy trên Background Thread).
- `installCrp(String filePath)`: Cài đặt gói CRP (Chạy trên Background Thread).
- `getCrpType(String filePath)`: Lấy loại CRP (0: Custom, 1: General).
- `getCrpVersion(int crpType)`: Lấy phiên bản CRP đã cài đặt.
- `getBatteryInfo()`: Lấy đối tượng `BatteryInfo` chứa 18 chỉ số trạng thái pin.

---

### 2. Sample Code - Mã nguồn mẫu cho từng API

#### 2.1 Lấy thông tin cơ bản thiết bị (SN, Model, OS Version, Brand)

```java
try {
    String sn = sTmsApi.getDeviceInfo().getSerialNo();           // e.g. "VB01234TT0011"
    String model = sTmsApi.getDeviceInfo().getModel();          // e.g. "V3_PLUS"
    String brand = sTmsApi.getDeviceInfo().getBrand();          // e.g. "SUNMI"
    String osVersion = sTmsApi.getDeviceInfo().getAndroidOSVersion(); // e.g. "11"
    String sunmiOs = sTmsApi.getDeviceInfo().getSunmiOsVersion();     // e.g. "2.0.0"
    boolean isFinancial = sTmsApi.getDeviceInfo().isFinancialDevice();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.2 Kiểm tra tính năng phần cứng tích hợp (Máy in & Máy quét)

```java
try {
    boolean hasPrinter = sTmsApi.getDeviceInfo().isInnerPrinterSupported();
    boolean hasScanner = sTmsApi.getDeviceInfo().isInnerScannerSupported();

    if (hasPrinter) {
        // Khởi tạo tiến trình in ấn
    }
    if (hasScanner) {
        // Khởi tạo tiến trình đọc mã vạch
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.3 Lấy thông tin SIM Card & Mã định danh mạng (IMSI, IMEI, Full ICCID)

```java
try {
    // Lấy IMEI và Full ICCID của khe SIM 1 (Index 0)
    String imeiSlot1 = sTmsApi.getDeviceInfo().getIMEIBySlotIndex(0);
    String iccidSlot1 = sTmsApi.getDeviceInfo().getFullICCID(0); // Trả về đủ ký tự mã hóa
    String imsiSlot1 = sTmsApi.getDeviceInfo().getIMSIBySlotIndex(0);

    // Lấy IP & Wi-Fi MAC
    String ipAddress = sTmsApi.getDeviceInfo().getIpAddresses();
    String wifiMac = sTmsApi.getDeviceInfo().getMac();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.4 Quản lý Gói Tài nguyên CRP (Resource Package Verification & Install)

```java
// Bắt buộc thực thi trên Background Thread (Worker Thread)
new Thread(() -> {
    try {
        String crpPath = "/sdcard/Download/SunmiCrp_Eu_common.crp";

        // 1. Xác minh file CRP
        int verifyResult = sTmsApi.getDeviceInfo().verifyCrp(crpPath);
        if (verifyResult == 0) {
            // 2. Cài đặt file CRP
            int installResult = sTmsApi.getDeviceInfo().installCrp(crpPath);
            if (installResult == 0) {
                // Đã cập nhật gói tài nguyên thành công
            }
        }
    } catch (Exception e) {
        e.printStackTrace();
    }
}).start();
```

#### 2.5 Đọc thông số chi tiết Pin (`BatteryInfo`)

```java
try {
    BatteryInfo batteryInfo = sTmsApi.getDeviceInfo().getBatteryInfo();
    if (batteryInfo != null) {
        int level = batteryInfo.batteryLevel;                   // Tỷ lệ % Pin
        int status = batteryInfo.batteryStatus;                 // 0: Không sạc, 1: Đang sạc
        int health = batteryInfo.batteryHealth;                 // Trạng thái sức khỏe pin
        long maxCapacity = batteryInfo.batteryMaxCapacity;       // Dung lượng tối đa (mAh)
        long currentCapacity = batteryInfo.batteryCurrentCapacity; // Dung lượng hiện tại
        int cycleCount = batteryInfo.batteryCycleCount;          // Số chu kỳ sạc
        String temperature = batteryInfo.batteryTemperature;     // Nhiệt độ Pin (độ C)
        String sn = batteryInfo.batterySn;                       // Serial number của Pin
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Đảm bảo tất cả 32 hàm của `IDeviceInfo` trả về giá trị mock hợp lệ không ném ra exception ngoài `RemoteException`.
- **Modules Kiểm thử**: `SunmiDeviceInfoProvider`, `BatteryInfoDiagnosticsService`, `SimCardInfoResolver`.
- **Seam Strategy**: Sử dụng mock `IDeviceInfo` để giả lập các kết quả (như `isInnerPrinterSupported = true`, `batteryLevel = 15%`) để kiểm thử phản ứng UI khi pin yếu hoặc không có máy in.

## Out of Scope

- Thay đổi trực tiếp các thông số phần cứng gốc như ghi đè MAC Address Wi-Fi hoặc sửa đổi IMEI phần cứng.
- Đọc dữ liệu cảm biến vân tay hoặc đầu đọc POS mã hóa tài chính chuyên dụng ngoài API cấp.

## Further Notes

- **Lưu ý quan trọng**: Các API `verifyCrp()` và `installCrp()` là các tác vụ tốn thời gian (blocking I/O operations), **tuyệt đối không được gọi trên Main UI Thread**.
