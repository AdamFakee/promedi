# SUNMI Device Serial Number & Identifier Acquisition Specification

## Proposed Seam

- **DeviceInfoProvider Seam (`IDeviceInfoProvider`)**: Interface trừu tượng hóa việc lấy SN và các chỉ số nhận dạng phần cứng. Seam này che giấu sự khác biệt giữa Gen 2 (`SystemProperties` reflection / `Build.getSerial`) và Gen 3 (`SunmiCustomerAPI` / TMS SDK), cho phép mock thông tin thiết bị khi chạy unit/integration test.

## Problem Statement

Ứng dụng cần lấy số Serial Number (SN), tên thương hiệu, model thiết bị và phiên bản ROM để xác thực bản quyền, cấp phép phần mềm hoặc phân luồng chức năng. Tuy nhiên, SUNMI chia thiết bị thành hai thế hệ với cơ chế lấy dữ liệu hoàn toàn khác nhau (Gen 2 trên Android 12 trở xuống vs Gen 3 trên Android 13/16 với bảo mật Android nghiêm ngặt), gây khó khăn cho việc tương thích ngược nếu không có đặc tả kỹ thuật và mã nguồn chuẩn.

## Solution

Cung cấp đặc tả kỹ thuật và helper class chuẩn hóa cho việc truy xuất SN và Device Identifiers xuyên suốt Gen 2 và Gen 3. Tự động nhận biết phiên bản Android/Thế hệ phần cứng để kích hoạt phương thức phù hợp: truy xuất qua reflection `SystemProperties` (Gen 2) hoặc qua `SunmiCustomerAPI` (Gen 3), đồng thời lưu giữ mã nguồn mẫu chuẩn cho quá trình tra cứu phát triển.

## User Stories

1. As an Application Developer, I want a single function to query device SN, so that my app works seamlessly on both Gen 2 and Gen 3 SUNMI devices.
2. As a Security Engineer, I want Gen 3 devices to retrieve SN via SunmiCustomerAPI without requiring sensitive `READ_PHONE_STATE` permissions, so that the app complies with Android 13+ privacy rules.
3. As a System Integrator, I want to read device metadata (brand, model, ROM version name/code), so that I can apply device-specific configuration profiles (e.g. handheld vs landscape screen).
4. As a QA Engineer, I want to mock `IDeviceInfoProvider`, so that device SN and model can be injected dynamically in automated test suites.

## Implementation Decisions

### 1. Phân biệt thế hệ thiết bị (Generation Boundary)

- **Gen 2 (Android <= 12)**: V2, V2S, L2, M2... Yêu cầu quyền `READ_PHONE_STATE` trong `AndroidManifest.xml`.
- **Gen 3 (Android >= 13/16)**: T3 PRO, D3 PRO, V3, V3H, FLEX 3, M3, L3... Sử dụng `SunmiCustomerAPI` SDK (TMS API whitelist).

### 2. Sample Code - Khai báo Permission (`AndroidManifest.xml`)

```xml
<!-- Yêu cầu cấp quyền đọc trạng thái máy cho Gen 2 -->
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
```

### 3. Sample Code - Lấy Serial Number (Gen 2 & Gen 3)

#### Gen 2 SN Acquisition (`SystemProperties` Reflection):

```java
public static String getGen2SN() {
    String serial = null;
    try {
        Class<?> c = Class.forName("android.os.SystemProperties");
        Method get = c.getMethod("get", String.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // Android 11+
            serial = (String) get.invoke(c, "ro.sunmi.serial");
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) { // Android 8.0 - 10
            serial = Build.getSerial();
        } else { // Android 7.1 trở xuống (dùng ro.serialno)
            serial = (String) get.invoke(c, "ro.serialno");
        }
    } catch (Exception e) {
        e.printStackTrace();
    }
    return serial;
}
```

#### Gen 3 SN Acquisition (`SunmiCustomerAPI`):

```java
public static String getGen3SN() {
    try {
        // Gọi qua SunmiCustomerAPI (TMS SDK) - Không cần cấp quyền nhạy cảm
        return sTmsApi.getDeviceInfo().getSerialNo();
    } catch (Exception e) {
        e.printStackTrace();
        return null;
    }
}
```

### 4. Sample Code - Lấy Device Identifiers (Brand, Model, ROM Version)

```java
// 1. Thương hiệu thiết bị (Tất cả thiết bị SUNMI đều trả về "SUNMI")
String brand = SystemProperties.get("ro.product.brand");

// 2. Model thiết bị (Ví dụ: V1-B18, T3-PRO)
// Handheld (cầm tay): Tiền tố V, M, P, L | Landscape (màn hình ngang): Tiền tố T, D, S
String model = SystemProperties.get("ro.product.model");

// 3. Tên phiên bản ROM (Ví dụ: 1.1.0)
String versionName = SystemProperties.get("ro.version.sunmi_versionname");

// 4. Mã phiên bản ROM (Ví dụ: 128)
String versionCode = SystemProperties.get("ro.version.sunmi_versioncode");
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử logic tự động phân nhánh giữa Gen 2 và Gen 3 thông qua interface `IDeviceInfoProvider`.
- **Modules Kiểm thử**: `DeviceInfoProvider`, `SystemPropertiesResolver`, `SunmiCustomerApiWrapper`.
- **Seam Strategy**: Inject mock `IDeviceInfoProvider` để trả về chuỗi SN giả định (e.g. `"SUNMI_TEST_SN_9999"`) khi test trên Android Emulator hoặc CI/CD pipeline.

## Out of Scope

- Ghi đè hoặc sửa đổi chuỗi SN lưu trong phần cứng NVRAM / Motherboard.
- Đọc IMEI thiết bị qua SIM cellular driver.

## Further Notes

- Chi tiết API SunmiCustomerAPI cho Gen 3: https://developer.sunmi.com/docs/en-US/cdixeghjk491/xdqieghjk579
