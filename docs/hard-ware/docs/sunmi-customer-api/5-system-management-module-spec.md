# SUNMI Customer API - System Management Module Specification

## Proposed Seam

- **SystemManager Seam (`ISystemManager`)**: Seam nằm ở interface `sTmsApi.getSystemManager()`. Interface này bao bọc 13 API quản lý hệ thống (OTA Update, Default Launcher, Screenshot, System Language, PCI 24h Reboot, Security Center Password, ADB Toggle, Query App Usage Stats). Seam cho phép giả lập các thao tác cấp hệ thống trong unit test mà không phải can thiệp ROM thật.

## Problem Statement

Các ứng dụng Kiosk/POS thương mại trên thiết bị SUNMI cần thực hiện cập nhật ROM hệ thống từ xa (OTA System Update), tự đặt ứng dụng làm Launcher mặc định (`HOME` category), chụp ảnh màn hình hệ thống (`doScreenshot`), thiết lập ngôn ngữ máy (`setSystemLanguage`), quản lý chu kỳ tự khởi động lại PCI 24h đối với dòng máy tài chính P-series, bật/tắt ADB debug, và thống kê thời lượng sử dụng ứng dụng. Việc thiếu tài liệu đặc tả và mã nguồn mẫu chuẩn gây mất nhiều thời gian tích hợp.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `System Management Module` thuộc SUNMI Customer API SDK. Tài liệu tổng hợp 13 hàm API, quy định cấu hình `AndroidManifest.xml` bắt buộc cho Default Launcher, quản lý tài nguyên `ParcelFileDescriptor` khi chụp màn hình chống rò rỉ bộ nhớ (Memory Leak), cùng toàn bộ mã nguồn mẫu Java cho từng trường hợp sử dụng.

## User Stories

1. As an MDM System Administrator, I want to perform background OTA system updates (`updateSystem`) with progress callbacks, so that device OS builds are updated securely across store fleets.
2. As a Kiosk Developer, I want to programmatically set my application as the default launcher (`setDefaultLauncher`), so that users cannot escape to the standard Android home screen.
3. As a Remote Diagnostics Specialist, I want to capture device screenshots (`doScreenshot`), so that technical support can inspect UI issues remotely.
4. As a PCI Compliance Officer, I want to configure the 24-hour scheduled reboot cycle (`set24HourRebootRegular`) and Security Center passwords on financial devices, so that PCI-DSS security standards are met.
5. As an Enterprise Support Engineer, I want to query app usage statistics (`queryAppUsageState`) and toggle ADB debug access (`enableAdbWithResult`), so that device performance can be monitored and debugged.

## Implementation Decisions

### 1. Phân nhóm 13 APIs thuộc `System Management Module`

#### Group 1: Cập nhật Hệ thống & Launcher Mặc định (OTA & Home Launcher)

- `updateSystem(systemPath, listener)`: Cập nhật OTA hệ thống ngầm qua file ZIP.
- `setDefaultLauncher(packageName)`: Đặt ứng dụng làm Launcher màn hình chính mặc định.

#### Group 2: Chụp ảnh Màn hình & Quản lý Tài nguyên (Screenshot & FD Resources)

- `doScreenshot()`: Chụp màn hình thiết bị và trả về `ParcelFileDescriptor` (Bắt buộc phải close FD để tránh leak).

#### Group 3: Ngôn ngữ & Bảo mật Ổn định Hệ thống (Language, App Lock & PCI Reboot)

- `setSystemLanguage(language)`: Đổi ngôn ngữ hệ thống (Ví dụ: `en-US`, `zh-Hans-CN`, `vi-VN`).
- `enableCommonAppLock(enable)`, `isCommonAppLockEnabled()`: Bật/Tắt tính năng Khóa App chung.
- `disableSecurityPCI24HoursReboot(disable)`: Bật/Tắt chu kỳ tự khởi động 24h trên dòng máy tài chính (P-Series).
- `set24HourRebootRegular(type, hour, minute, second)`: Đặt giờ tự khởi động lại PCI 24h (Mode 1: Nhắc nhở mặc định, Mode 2: Hẹn giờ chính xác).
- `setSecurityCenterPwd(pwd)`: Đặt mật khẩu trung tâm bảo mật Security Center (6-16 ký tự).

#### Group 4: Debugging & Thống kê Hệ thống (ADB & App Usage Stats)

- `enableAdbWithResult(enable)`, `isAdbEnabled()`: Bật/Tắt tính năng ADB Debug qua USB.
- `queryAppUsageState(intervalType, beginTime, endTime)`: Truy vấn thời lượng sử dụng các app.
- `getSystemPackageList()`: Lấy danh sách các app hệ thống có icon.

---

### 2. Sample Code - Mã nguồn mẫu cho từng API

#### 2.1 Cập nhật OTA Hệ thống (`updateSystem`)

```java
try {
    String otaZipPath = "/sdcard/Download/P3_user_9.9.9_698_20251008_ota.zip";

    sTmsApi.getSystemManager().updateSystem(otaZipPath, new OnSystemUpdateListener.Stub() {
        @Override
        public void progress(int progress) throws RemoteException {
            // Tiến trình nạp OTA (%)
        }

        @Override
        public void verifyPackageFail(String info) throws RemoteException {
            // Lỗi xác minh gói OTA (Mã lỗi trong Bảng 4.5)
        }

        @Override
        public void updateSystemFail(String info) throws RemoteException {
            // Cập nhật OTA thất bại
        }
    });
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.2 Đặt ứng dụng làm Default Launcher (`setDefaultLauncher`)

**Bước 1**: Khai báo Intent Filter trong `AndroidManifest.xml` của Activity làm Launcher:

```xml
<activity
    android:name=".ui.MainActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />

        <!-- 2 Thẻ bắt buộc để được chấp nhận làm Launcher -->
        <category android:name="android.intent.category.HOME" />
        <category android:name="android.intent.category.DEFAULT" />

        <category android:name="android.intent.category.MONKEY" />
    </intent-filter>
</activity>
```

**Bước 2**: Thực thi gọi API Java:

```java
try {
    boolean isSetSuccess = sTmsApi.getSystemManager().setDefaultLauncher("com.example.kiosk");
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.3 Chụp ảnh màn hình thiết bị (`doScreenshot` với Quản lý FileDescriptor an toàn)

```java
ParcelFileDescriptor pfd = null;
try {
    pfd = sTmsApi.getSystemManager().doScreenshot();
    if (pfd != null) {
        // Decode file descriptor thành Bitmap
        Bitmap bitmap = BitmapFactory.decodeFileDescriptor(pfd.getFileDescriptor());
        // Xử lý Bitmap (Lưu file hoặc gửi về server)
    }
} catch (Exception e) {
    e.printStackTrace();
} finally {
    // BẮT BUỘC: Đóng ParcelFileDescriptor để tránh rò rỉ tài nguyên (Too many open files error)
    if (pfd != null) {
        try {
            pfd.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

#### 2.4 Cấu hình Khởi động lại 24h chuẩn PCI cho Máy Tài chính (`set24HourRebootRegular`)

```java
try {
    // Mode 1: Nhắc nhở tự khởi động lại mặc định sau 23 tiếng
    sTmsApi.getSystemManager().set24HourRebootRegular(1, 0, 0, 0);

    // Mode 2: Hẹn giờ khởi động lại cố định lúc 03:30:00 sáng
    // (Chỉ có hiệu lực ở lần cài đặt đầu tiên sau khi khởi động máy)
    sTmsApi.getSystemManager().set24HourRebootRegular(2, 3, 30, 0);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.5 Thiết lập Ngôn ngữ Hệ thống & Bật ADB Debug

```java
try {
    // Đổi ngôn ngữ hệ thống sang Tiếng Anh Mỹ ("en-US") hoặc Tiếng Việt ("vi-VN")
    boolean langSet = sTmsApi.getSystemManager().setSystemLanguage("en-US");

    // Bật ADB Debug qua cổng USB
    boolean adbEnabled = sTmsApi.getSystemManager().enableAdbWithResult(true);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.6 Truy vấn Thống kê Thời lượng Sử dụng App (`queryAppUsageState`)

```java
try {
    long endTime = System.currentTimeMillis();
    long beginTime = endTime - (24 * 60 * 60 * 1000); // 24 giờ gần nhất

    // intervalType: 0 (Daily), 1 (Weekly), 2 (Monthly), 3 (Yearly)
    List<AppUsageState> usageStats = sTmsApi.getSystemManager().queryAppUsageState(0, beginTime, endTime);
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `doScreenshot` luôn thực thi đóng `ParcelFileDescriptor` trong khối `finally`.
- **Modules Kiểm thử**: `SystemOtaUpdater`, `DefaultLauncherManager`, `ScreenshotHelper`, `PciRebootConfigurator`.
- **Seam Strategy**: Sử dụng `ISystemManager` mock để giả lập tiến trình `updateSystem` trả về các sự kiện `verifyPackageFail` hoặc `updateSystemFail` trong Unit Test.

## Out of Scope

- Sửa đổi trực tiếp dữ liệu gói zip OTA mà không qua chứng thực chữ ký của SUNMI.
- Bỏ qua các ràng buộc an ninh PCI khi thay đổi mật khẩu Security Center trên máy P-series không qua Reset Factory.

## Further Notes

- `setSecurityCenterPwd()` chỉ có thể sử dụng sau khi khôi phục cài đặt gốc (Factory Reset) và phải được nhà cung cấp thiết bị SUNMI cấp quyền.
