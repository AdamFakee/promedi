# SUNMI Customer API - Software Management Module Specification

## Proposed Seam

- **SoftwareManager Seam (`ISoftwareManager`)**: Seam nằm ở interface `sTmsApi.getSoftwareManager()`. Interface này bọc 26 API quản lý vòng đời phần mềm (Silent Install/Uninstall, Grant Permissions, Auto-Start App, App Lock, Prohibit Uninstall, Clear Data/Cache, Foreground Check, Remove Recent Tasks). Seam hỗ trợ mock việc cài đặt/gỡ ứng dụng và phân quyền trong unit test mà không làm thay đổi hệ điều hành thật.

## Problem Statement

Các hệ thống quản trị Kiosk/POS và giải pháp MDM doanh nghiệp trên máy SUNMI đòi hỏi khả năng cập nhật ứng dụng ngầm không thông qua giao diện người dùng (Silent Install/Uninstall), tự động cấp quyền nhạy cảm (Camera, Alert Floating Window), cấu hình app tự khởi động (Auto-start App), ngăn người dùng gỡ app trái phép (Prohibit Uninstall), đặt khóa ứng dụng (Common App Lock), và xóa cache/data từ xa. Việc thiếu tài liệu đặc tả tập trung kèm code mẫu cho 26 API của `Software Management Module` gây khó khăn cho việc phát triển.

## Solution

Cung cấp đặc tả kỹ thuật toàn diện cho `Software Management Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 26 APIs, quy định rõ quy trình xử lý callback bất đồng bộ (`OnInstallAppListener`, `OnUninstallAppListener`, `IUnifiedCallback`), lưu ý tương thích Android (Scoped storage, Permission model), và cung cấp mã nguồn mẫu Java cho toàn bộ các hàm.

## User Stories

1. As an MDM Administrator, I want to silently install (`installAppV2`) and uninstall (`uninstallApp`) enterprise apps in the background, so that devices stay updated without cashier intervention.
2. As a POS Developer, I want to grant dynamic permissions (`grantAppPermissions`) and alert window overlay permissions (`allowAlertWindowPermission`) automatically via API, so that first-time setup requires zero manual taps.
3. As a Kiosk Manager, I want to set a dedicated launcher application as the auto-start app (`setAutoStartApp`) and prevent its uninstallation (`prohibitUninstall`), so that the device stays locked to the commercial kiosk UI.
4. As a Store Admin, I want to lock sensitive system or settings apps with a password (`addAppToCommonAppLockList`), so that cashiers cannot access restricted configuration menus.
5. As a Remote Support Specialist, I want to clear app user data (`clearApplicationUserDataWithResult`) or cache (`deleteApplicationCacheFiles`) via API callbacks, so that corrupted app states can be repaired remotely.

## Implementation Decisions

### 1. Phân nhóm 26 APIs thuộc `Software Management Module`

#### Group 1: Cài đặt & Gỡ ứng dụng ngầm (Silent Installation & Uninstallation)

- `installAppV2(appFilePath, autoStart, listener)`: Cài đặt ngầm (Tùy chọn tự động chạy app sau khi cài).
- `installApp(appFilePath, listener)`: Cài đặt ngầm (Non-financial devices).
- `uninstallApp(packageName, listener)`: Gỡ ứng dụng ngầm.
- `prohibitUninstall(packageName, allowUninstall)`, `getProhibitUninstallList()`: Cấm/Cho phép gỡ ứng dụng.

#### Group 2: Quản lý Quyền ứng dụng & Cửa sổ nổi (Permissions & Floating Windows)

- `grantAppPermissions(packageName, permissions)`: Tự động cấp quyền động (Camera, Location...).
- `revokeAppPermission(packageName, permissions)`: Thu hồi quyền động.
- `allowAlertWindowPermission(packageName)`: Cấp quyền hiển thị cửa sổ nổi (`SYSTEM_ALERT_WINDOW`).
- `getRequestPermissions(packageName)`: Đọc danh sách quyền ứng dụng yêu cầu trong Manifest.
- `setNotificationsEnabledForPackage(packageName, enabled)`: Bật/tắt thông báo của app.

#### Group 3: Cấu hình App Tự khởi động (Auto-Start Application)

- `enableAutoStartApp(enable)`, `isAutoStartAppEnabled()`: Bật/tắt tính năng tự khởi động.
- `setAutoStartApp(packageName)`, `getAutoStartApp()`, `clearAutoStartApp()`: Thiết lập, truy vấn hoặc xóa App tự khởi động.

#### Group 4: Khóa Ứng dụng & Bảo vệ Bộ nhớ (App Lock & Data Management)

- `addAppToCommonAppLockList(packageNames, type, password)`: Thêm danh sách app vào Khóa chung (Mật khẩu MD5 hoặc Plaintext).
- `removeAppFromCommonAppLockList(packageNames)`, `getCommonAppLockList()`, `isCommonAppLock()`: Gỡ bỏ, truy vấn danh sách app bị khóa.
- `clearApplicationUserDataWithResult(packageName, callback)`: Xóa sạch dữ liệu và cache của app (Clear Storage).
- `deleteApplicationCacheFiles(packageName, callback)`: Xóa bộ nhớ đệm cache của app (Clear Cache).
- `setBatteryOptimizationWhitelist(whitelist)`: Thêm app vào Whitelist bỏ qua tối ưu hóa Pin.

#### Group 5: Vòng đời & Tiến trình Ứng dụng (App Lifecycle & Execution)

- `killApp(packageName)`: Ép dừng ứng dụng (Force Stop).
- `restartApp(packageName)`: Khởi động lại ứng dụng.
- `isForeground(packageName)`: Kiểm tra ứng dụng có đang chạy trên Foreground không.
- `setAppEnabled(packageName, enabled)`: Bật/Tắt (Enable/Disable) ứng dụng (Không áp dụng cho system apps gốc).
- `removeAllRecentTasks()`: Xóa danh sách các ứng dụng gần đây (Recent Tasks list trên V3).

---

### 2. Sample Code - Mã nguồn mẫu chi tiết

#### 2.1 Cài đặt & Gỡ ứng dụng ngầm (`installAppV2` & `uninstallApp`)

```java
// 1. Cài đặt ngầm file APK và tự khởi chạy sau khi cài (autoStart = true)
try {
    String apkPath = "/sdcard/Download/pos_release.apk";
    sTmsApi.getSoftwareManager().installAppV2(apkPath, true, new OnInstallAppListener.Stub() {
        @Override
        public void onInstallFinished() throws RemoteException {
            // Cài đặt hoàn tất
        }
        @Override
        public void onInstallError(int errorId) throws RemoteException {
            // Xử lý mã lỗi (e.g. -2: Invalid APK, -4: Insufficient Storage)
        }
        @Override
        public void onInstallSuccess(String packagename) throws RemoteException {
            // Cài đặt thành công package
        }
        @Override
        public void onInstallFail(String packagename, int errorId) throws RemoteException {
            // Thất bại
        }
    });
} catch (Exception e) {
    e.printStackTrace();
}

// 2. Gỡ ứng dụng ngầm
try {
    sTmsApi.getSoftwareManager().uninstallApp("com.example.oldpos", new OnInstallAppListener.Stub() {
        @Override public void onUnInstallFinished() throws RemoteException {}
        @Override public void onUnInstallError(int errorId) throws RemoteException {}
        @Override public void onUnInstallSuccess(String packagename) throws RemoteException {}
        @Override public void onUnInstallFail(String packagename, int errorId) throws RemoteException {}
    });
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.2 Tự động Cấp Quyền Động & Cửa sổ nổi Overlay (Floating Window)

```java
try {
    String pkgName = "com.example.kiosk";

    // 1. Cấp quyền Camera động mà không hiện Popup hỏi người dùng
    boolean permGranted = sTmsApi.getSoftwareManager().grantAppPermissions(pkgName, "android.permission.CAMERA");

    // 2. Cấp quyền Cửa sổ nổi SYSTEM_ALERT_WINDOW (Yêu cầu có khai báo trong Manifest)
    boolean alertGranted = sTmsApi.getSoftwareManager().allowAlertWindowPermission(pkgName);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.3 Cấu hình App Tự Khởi Động & Chống Gỡ Ứng dụng (Auto-Start & Prohibit Uninstall)

```java
try {
    String pkgName = "com.example.kiosk";

    // 1. Bật tính năng Auto-Start và chỉ định package tự khởi động khi bật máy
    sTmsApi.getSoftwareManager().enableAutoStartApp(true);
    sTmsApi.getSoftwareManager().setAutoStartApp(pkgName);

    // 2. Cấm người dùng gỡ ứng dụng Kiosk trong Cài đặt hệ thống
    sTmsApi.getSoftwareManager().prohibitUninstall(pkgName, false); // allowUninstall = false
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.4 Đặt Khóa Mật khẩu Ứng dụng (Common App Lock)

```java
try {
    List<String> lockList = new ArrayList<>();
    lockList.add("com.android.settings"); // Khóa ứng dụng Settings hệ thống

    // type = -1: Plaintext password (tối đa 8 ký tự), type = 0: 4-digit PIN (MD5), type = 1: Mixed (MD5)
    boolean lockSuccess = sTmsApi.getSoftwareManager().addAppToCommonAppLockList(lockList, -1, "12345678");
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.5 Xóa Data / Cache từ xa qua Callback (`IUnifiedCallback`)

```java
try {
    // Xóa toàn bộ Data & Cache của app
    sTmsApi.getSoftwareManager().clearApplicationUserDataWithResult("com.example.kiosk", new IUnifiedCallback.Stub() {
        @Override
        public void onCall(String result) throws RemoteException {
            try {
                JSONObject json = new JSONObject(result);
                int resultCode = json.getInt("resultCode"); // 0: Success, -1: Fail
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }
    });
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Đảm bảo tất cả các hàm async callback (`OnInstallAppListener`, `IUnifiedCallback`) được mock đúng định dạng kết quả trong Unit Test.
- **Modules Kiểm thử**: `AppInstallerManager`, `PermissionGrantor`, `AutoStartConfigurator`, `AppLockController`.
- **Seam Strategy**: Giả lập `ISoftwareManager` để kiểm thử trường hợp cài đặt bị lỗi mã `-7` (Signature Mismatch) hoặc `-16` (Incompatible ABI) mà không phải build file APK lỗi thật.

## Out of Scope

- Gỡ các ứng dụng hệ thống cốt lõi của SUNMI OS (Package bắt đầu bằng `com.sunmi.pay`, `com.sunmi.tmservice`).
- Bypass cơ chế mã hóa mật khẩu APK của Android OS gốc.

## Further Notes

- **Lưu ý File Path khi Cài ngầm**: File APK cần cài phải nằm trong bộ nhớ dùng chung `/sdcard/` hoặc bộ nhớ nội bộ của app (Sử dụng lớp `FileStorageUtil` đã mô tả tại Spec 1 để tương thích Android 10+).
