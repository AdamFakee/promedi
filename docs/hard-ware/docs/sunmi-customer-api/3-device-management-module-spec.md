# SUNMI Customer API - Device Management Module Specification

## Proposed Seam

- **DeviceManager Seam (`IDeviceManager`)**: Seam nằm ở interface `sTmsApi.getDeviceManager()`. Interface này bao bọc toàn bộ 54 API điều khiển và quản lý thiết bị (System Power, Time/Timezone, Screen Brightness, Device Owner, Physical Keys, RGB LED, Battery Cycles, USB Cable/Port Control, TTS Voice Packages). Seam cho phép mock mọi tương tác điều khiển phần cứng trong môi trường Unit Test mà không cần thiết bị vật lý.

## Problem Statement

Các ứng dụng thương mại Kiosk/POS và hệ thống quản trị thiết bị doanh nghiệp (MDM/TMS) cần điều khiển trực tiếp các tính năng phần cứng mức sâu—như hẹn giờ khởi động/tắt máy, thiết lập Device Owner chống gỡ app, tùy chỉnh độ sáng/màn hình chờ, bật/tắt Wi-Fi/NFC/Bluetooth/GPS, cấu hình đèn RGB LED, điều khiển nguồn cổng USB, cài đặt giọng nói TTS offline. Việc thiếu tài liệu tổng hợp đầy đủ mã nguồn mẫu cho 54 API của `Device Management Module` sẽ gây trở ngại lớn cho lập trình viên.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `Device Management Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 54 hàm API theo các nhóm chức năng, quy định chi tiết tham số, giá trị trả về, quy trình đăng ký `DeviceOwnerReceiver`, và toàn bộ mã nguồn mẫu Java trực quan cho từng trường hợp sử dụng.

## User Stories

1. As an MDM Administrator, I want to set my application as `DeviceOwner` (`setDeviceOwner`), so that field POS terminals cannot be tampered with or reset by unauthorized users.
2. As a Kiosk System Developer, I want to control screen brightness (`setScreenBrightness`), timeout (`setScreenTimeout`), and boot animation (`setBootAnimation`), so that the kiosk UI remains branded and energy-efficient.
3. As a POS Hardware Manager, I want to switch USB default modes (`setDefaultUsbMode`), manage USB port power states (`setUsbPortPowerState`), and detect dock connection status (`getDeviceDockStatus`), so that peripheral accessories function reliably.
4. As a Maintenance Engineer, I want to query and reset battery cycle counts (`resetBatteryCycleCount`, `getBatteryCycleCount`) and charge voltage (`getBatteryChargeVoltage`), so that battery degradation is tracked accurately.
5. As an Accessibility Developer, I want to install offline TTS voice packages (`installTTSVoicePackage`), so that voice prompts work without internet connectivity.

## Implementation Decisions

### 1. Phân nhóm 54 APIs thuộc `Device Management Module`

#### Group 1: Nguồn, Thời gian & Hệ thống (Power, Time & System)

- `setSystemTime()`, `setTimeZone()`, `enableAutoTime()`, `enableAutoTimeZone()`, `set24Hour()`: Quản lý thời gian và múi giờ.
- `powerReboot()`, `shutdown()`, `toSleep()`, `toWakeUp()`: Điều khiển trạng thái nguồn và ngủ đông.
- `factoryReset()`: Khôi phục cài đặt gốc.
- `setPowerButtonEnabled()`, `isPowerButtonEnabled()`: Khóa/Mở phím Nguồn cứng khi màn hình sáng.

#### Group 2: Quản trị Thiết bị & Bảo mật (Device Owner & Key Customization)

- `setDeviceOwner()`, `clearDeviceOwner()`: Cấu hình ứng dụng thành Device Owner (Yêu cầu `DeviceAdminReceiver`).
- `setCustomKeyFunction()`: Gán tính năng tùy chỉnh cho phím cứng (`KeyConstants`).
- `setPhysicKeyEnabled()`, `getPhysicKeyEnabled()`: Bật/Tắt phím cứng vật lý (FN, \*) trên máy P3K/P3KH.

#### Group 3: Màn hình, Hiển thị & Giao diện (Screen, Brightness & UI)

- `setScreenBrightness()`, `getScreenBrightness()`, `setBrightnessMode()`, `getMinimumScreenBrightnessSetting()`, `getMaximumScreenBrightnessSetting()`: Điều khiển độ sáng màn hình.
- `setScreenTimeout()`: Thiết lập thời gian chờ màn hình (15s đến Never / 1 Tuần).
- `setBootAnimation()`: Cấu hình Boot Animation khởi động máy.
- `setWallpaper()`: Cài đặt ảnh hình nền.
- `enableShowVirtualKeyboard()`, `isShowVirtualKeyboardEnabled()`: Bật/Tắt bàn phím ảo trên máy có bàn phím cứng (P2 SmartPad).

#### Group 4: Mạng & Kết nối Ngoại vi (Networks, Wireless & Ports)

- `enableWIFI()`, `enableBluetooth()`, `switchBTModuleEnable()`, `isBTModuleEnabled()`, `enableNFC()`, `enableGPS()`, `enableLocation()`, `setAirplaneMode()`: Bật/Tắt các kết nối không dây.
- `setNfcReaderCardemulationStatus()`, `getNfcReaderCardemulationStatus()`: Cấu hình chế độ đọc thẻ/giả lập thẻ NFC (L3-A14).
- `setCableType()`, `getCableType()`: Thiết lập loại cáp USB Y-cable hay Standard (P3KH).
- `setDefaultUsbMode()`, `getDefaultUsbMode()`: Cấu hình chế độ USB mặc định (MTP, PTP, Charging, Tethering trên L2sPro).
- `setUsbPortPowerState()`, `getUsbPortPowerState()`: Bật/Tắt nguồn cấp điện cổng USB (CPad-A14).
- `disableInsertSdcard()`, `getInsertSdcardDisabled()`: Bật/Tắt khe cắm thẻ nhớ SD (P2-SE).
- `getDeviceDockStatus()`: Đọc trạng thái kết nối chân đế Dock (P3_MIX).

#### Group 5: Các API Chuyên dụng (Battery, RGB LED & TTS Voice)

- `resetBatteryCycleCount()`, `getBatteryCycleCount()`, `getBatteryChargeVoltage()`: Quản lý chu kỳ và điện áp sạc Pin.
- `isSupportRgbLed()`, `openRgbLed()`, `closeRgbLed()`: Đèn báo RGB LED (CPad Android 14).
- `installTTSVoicePackage()`, `deleteTTSVoicePackageCache()`: Cài đặt và quản lý gói giọng nói TTS offline (P3).

---

### 2. Sample Code - Mã nguồn mẫu cho từng tính năng cốt lõi

#### 2.1 Đặt thời gian & Múi giờ hệ thống

```java
try {
    // Đặt thời gian: 07:05:01 ngày 03/02/2026
    sTmsApi.getDeviceManager().setSystemTime(1, 5, 7, 3, 2, 2026);

    // Thiết lập múi giờ
    sTmsApi.getDeviceManager().setTimeZone("Asia/Ho_Chi_Minh");

    // Tắt tự động lấy giờ
    sTmsApi.getDeviceManager().enableAutoTime(false);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.2 Đặt ứng dụng làm Device Owner (Cấu hình Chi tiết)

Để gọi `setDeviceOwner("com.xxx.xxx", "com.xxx.xxx.OwnerReceiver")` thành công, cần các bước sau:

**Bước 1**: Tạo `OwnerReceiver` kế thừa `DeviceAdminReceiver`:

```java
package com.xxx.xxx;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

public class OwnerReceiver extends DeviceAdminReceiver {
    @Override
    public void onEnabled(Context context, Intent intent) {}
    @Override
    public void onDisabled(Context context, Intent intent) {}
}
```

**Bước 2**: Khai báo `OwnerReceiver` trong `AndroidManifest.xml`:

```xml
<receiver
    android:name=".OwnerReceiver"
    android:label="Device Owner Receiver"
    android:permission="android.permission.BIND_DEVICE_ADMIN">

    <meta-data
        android:name="android.app.device_admin"
        android:resource="@xml/device_owner" />

    <intent-filter>
        <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
    </intent-filter>
</receiver>
```

**Bước 3**: Tạo file `res/xml/device_owner.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <limit-password />
        <watch-login />
        <reset-password />
        <force-lock />
        <wipe-data />
        <expire-password />
        <encrypted-storage />
        <disable-camera />
    </uses-policies>
</device-admin>
```

**Bước 4**: Thực thi mã Java gọi API:

```java
try {
    boolean success = sTmsApi.getDeviceManager().setDeviceOwner("com.xxx.xxx", "com.xxx.xxx.OwnerReceiver");
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.3 Cấu hình độ sáng & Thời gian chờ màn hình (Screen Timeout)

```java
try {
    // 1. Đặt độ sáng màn hình ở mức 50
    sTmsApi.getDeviceManager().setScreenBrightness(50);

    // 2. Thiết lập thời gian chờ màn hình là 30 giây (30000 ms)
    // Các giá trị hợp lệ: 15000 (15s), 30000 (30s), 60000 (1m), 300000 (5m), 2147483647 (Never)
    sTmsApi.getDeviceManager().setScreenTimeout(30000);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.4 Điều khiển đèn RGB LED (CPad Android 14)

```java
try {
    if (sTmsApi.getDeviceManager().isSupportRgbLed() == 0) {
        // Mở đèn LED màu Xanh lá (rbg=2), nhấp nháy 3s sáng / 2s tắt (lightMode=1), tự tắt sau 10s (timeoutMs=10000)
        // Mã rbg: 1: Đỏ, 2: Xanh lá, 3: Xanh dương, 4: Vàng, 5: Xanh lam, 6: Tím, 7: Trắng
        sTmsApi.getDeviceManager().openRgbLed(2, 3000, 2000, 1, 10000);

        // Tắt đèn LED
        // sTmsApi.getDeviceManager().closeRgbLed();
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.5 Điều khiển nguồn cổng USB & Chế độ mặc định (USB Power & Default Mode)

```java
try {
    // 1. Đặt chế độ USB mặc định là Chống truyền dữ liệu / Chỉ sạc (type = 0)
    // 0: Charge Only, 1: MTP (File), 2: PTP (Image), 4: USB Tethering
    sTmsApi.getDeviceManager().setDefaultUsbMode(0);

    // 2. Bật/Tắt nguồn cấp điện cổng USB ngắn (portType=0, powerState=0: Power On, 1: Power Off)
    sTmsApi.getDeviceManager().setUsbPortPowerState(0, 0);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.6 Nạp gói giọng nói TTS Offline (Install TTS Voice Package)

```java
try {
    // type: 1 (Merge & Append), 2 (Full overwrite)
    String voiceZipPath = "/sdcard/Download/voice.zip";

    sTmsApi.getDeviceManager().installTTSVoicePackage(1, voiceZipPath, new IResultCallback.Stub() {
        @Override
        public void onCall(Bundle bundle) throws RemoteException {
            if (bundle != null) {
                int resultCode = bundle.getInt("resultCode");
                if (resultCode == 0) {
                    // Cài đặt giọng nói TTS offline thành công
                }
            }
        }
    });
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Mọi hàm điều khiển của `IDeviceManager` đều được kiểm định kết quả trả về (`true`/`false` hoặc return code `0`).
- **Modules Kiểm thử**: `DevicePowerController`, `DeviceOwnerManager`, `ScreenBrightnessController`, `TtsVoiceInstaller`.
- **Seam Strategy**: Sử dụng mock `IDeviceManager` để kiểm thử logic xử lý khi các hàm trả về lỗi `-40` (API không hỗ trợ trên ROM hiện tại) hoặc `-41` (Không tìm thấy dịch vụ hệ thống).

## Out of Scope

- Sửa đổi trực tiếp mã nguồn ứng dụng Cài đặt (Settings.apk) của SUNMI OS.
- Bỏ qua các ràng buộc an ninh PCI trên các thiết bị thanh toán chuyên dụng P-series.

## Further Notes

- Cấu hình **Screen Timeout một tuần** hoặc **Never (2147483647)** chỉ hỗ trợ trên một số dòng máy Kiosk/POS cố định (P3_MIX, SP03, SP06).
