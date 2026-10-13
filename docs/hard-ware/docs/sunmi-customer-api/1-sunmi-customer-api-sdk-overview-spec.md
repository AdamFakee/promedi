# SUNMI Customer API SDK Specification & Overview

## Proposed Seam

- **TMSServiceConnection Seam (`ITMSApiBinder`)**: Seam nằm ở phần giao tiếp bất đồng bộ `sTmsApi.connect(context, TMSServiceConnection)`. Seam này bọc 11 Binder module quản lý thiết bị (DeviceInfo, SoftwareManager, NetworkManager, KioskManager...), cho phép giả lập dịch vụ TMS Service và mock IPC RemoteException / TmsServiceDisconnectedException trong unit test.

## Problem Statement

Các nhà phát triển phần mềm trên dòng máy tài chính (P Series) và phi tài chính (D, T, S, K, F Series) của SUNMI cần một bộ SDK chuẩn hóa để truy xuất các năng lực sâu của hệ điều hành SUNMI OS (như cài đặt/gỡ ứng dụng ngầm không hiển thị UI, quản lý kết nối mạng SIM/Wi-Fi, cấu hình Kiosk mode, tùy chỉnh phím phần cứng, đọc thông tin hệ thống) mà không phải tự viết các đoạn mã reflection phức tạp.

## Solution

Tích hợp thư viện `SUNMI_CUSTOMER_API_vx.x.x_release.aar` thông qua lớp `TMSApi` và kết nối tới `com.sunmi.tmservice`. Đặc tả cung cấp hướng dẫn khởi tạo, danh sách 11 module quản lý, mã nguồn mẫu cho việc cài đặt ứng dụng ngầm, quản lý file trên Android 10+ (`FileStorageUtil`), cũng như tra cứu mã lỗi (Error Codes) và Entity Classes.

## User Stories

1. As a Android Developer, I want to import `SUNMI_CUSTOMER_API` AAR dependency, so that I can call official system APIs on SUNMI hardware.
2. As a Systems Administrator, I want to silently install (`installAppV2`) and uninstall apps in the background with callback status listeners (`OnInstallAppListener`), so that field device apps update automatically.
3. As a Fleet Manager, I want to toggle SIM slot data connections (`enableMobileNetwork`), configure enterprise Wi-Fi (`WifiConfigurationInfo`), and read cellular metrics (`CellularNetworkInfo`), so that connectivity is maintained across stores.
4. As a Kiosk Developer on Android 10+, I want `FileStorageUtil` path helpers to copy APKs to app internal storage before silent installation, so that scoped storage restrictions do not block updates.

## Implementation Decisions

### 1. Tích hợp SDK Dependency (`build.gradle` & `AndroidManifest.xml`)

#### app/build.gradle:

```groovy
repositories {
    mavenCentral()
}

dependencies {
    // Import file AAR từ thư mục app/libs/
    implementation files('libs/SUNMI_CUSTOMER_API_v1.x.x_release.aar')
}
```

#### AndroidManifest.xml (Bắt buộc cho Android 11+ / API 30+):

```xml
<queries>
    <package android:name="com.sunmi.tmservice" />
</queries>
```

---

### 2. Khởi tạo và Kết nối SUNMI Customer Service (`TMSApi`)

#### Sample Code - Service Binding & Unbinding:

```java
package com.sm.sdk.demo;

import android.content.Context;
import com.sunmi.tms.TMSApi;
import com.sunmi.tms.TMSServiceConnection;

public class SunmiTmsManager {

    private static SunmiTmsManager instance;
    private final TMSApi sTmsApi;
    private boolean isConnected = false;

    private SunmiTmsManager() {
        sTmsApi = new TMSApi();
    }

    public static synchronized SunmiTmsManager getInstance() {
        if (instance == null) {
            instance = new SunmiTmsManager();
        }
        return instance;
    }

    public void connect(Context context) {
        sTmsApi.connect(context, new TMSServiceConnection() {
            @Override
            public void onServiceConnected() {
                isConnected = true;
            }

            @Override
            public void onServiceDisconnected() {
                isConnected = false;
            }
        });
    }

    public void disconnect() {
        if (sTmsApi != null) {
            sTmsApi.disconnect();
            isConnected = false;
        }
    }

    public TMSApi getTmsApi() {
        return sTmsApi;
    }

    public boolean isConnected() {
        return isConnected;
    }
}
```

---

### 3. Danh sách 11 Functional Module Binders (`TMSApi`)

| Interface Binder Method         | Tên Module                    | Chức năng chính                              |
| :------------------------------ | :---------------------------- | :------------------------------------------- |
| `getDeviceInfoBinder()`         | Device Information Module     | Lấy Model, SN, thông tin phần cứng           |
| `getDeviceManagerBinder()`      | Device Management Module      | Điều khiển khởi động lại, khóa máy           |
| `getSoftwareManagerBinder()`    | Software Management Module    | Cài đặt / Gỡ ứng dụng ngầm (Silent Install)  |
| `getSystemManagerBinder()`      | System Management Module      | Cập nhật hệ thống (OTA update), đổi timezone |
| `getSystemUIManagerBinder()`    | System UI Management Module   | Quản lý StatusBar, NavBar, Kiosk UI          |
| `getDeviceRunningInfoBinder()`  | Device Runtime Info Module    | Đọc mức sử dụng RAM, CPU, Pin                |
| `getNetworkManagerBinder()`     | Network Management Module     | Bật/tắt SIM Data, cấu hình APN, Wi-Fi        |
| `getAllPackageInfo()`           | Device Software Info Module   | Liệt kê các package ứng dụng đã cài          |
| `getKioskManagerBinder()`       | Kiosk Management Module       | Thiết lập chế độ Kiosk đơn/đa ứng dụng       |
| `getCertificateManagerBinder()` | Certificate Management Module | Quản lý chứng chỉ bảo mật hệ thống           |
| `getLogcatManagerBinder()`      | Logs Management Module        | Truy xuất logcat hệ thống để debug           |

---

### 4. Sample Code - Cài đặt Ứng dụng Ngầm (Silent App Installation)

```java
public void installAppSilently(String apkFilePath) {
    try {
        TMSApi tmsApi = SunmiTmsManager.getInstance().getTmsApi();
        tmsApi.getSoftwareManager().installAppV2(apkFilePath, true, new OnInstallAppListener.Stub() {
            @Override
            public void onInstallFinished() throws RemoteException {
                // Hoàn tất tiến trình cài đặt
            }

            @Override
            public void onInstallError(int errorId) throws RemoteException {
                // Xử lý khi gặp lỗi (Chi tiết trong Bảng Mã Lỗi 4.2)
            }

            @Override
            public void onInstallSuccess(String packagename) throws RemoteException {
                // Cài đặt thành công package
            }

            @Override
            public void onInstallFail(String packagename, int errorId) throws RemoteException {
                // Thất bại khi cài đặt package
            }
        });
    } catch (RemoteException | TmsServiceDisconnectedException e) {
        e.printStackTrace();
    }
}
```

---

### 5. Sample Code - FileStorageUtil (Xử lý đường dẫn File tương thích Android 10+)

```java
package com.sm.sdk.demo;

import android.content.Context;
import android.os.Build;
import android.os.Environment;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.channels.FileChannel;

public class FileStorageUtil {

    public static String getCompatibleExternalPath(Context context, String externalPath) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10 trở lên: Copy file vào bộ nhớ nội bộ của App
            return copyToAppInternalStorage(context, externalPath);
        } else {
            return externalPath;
        }
    }

    private static String copyToAppInternalStorage(Context context, String externalPath) {
        try {
            File sourceFile = new File(externalPath);
            if (!sourceFile.exists()) return null;

            File internalDir = new File(context.getFilesDir(), "external_copied");
            if (!internalDir.exists()) internalDir.mkdirs();

            File targetFile = new File(internalDir, sourceFile.getName());
            copyFile(externalPath, targetFile.getAbsolutePath());
            return targetFile.getAbsolutePath();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private static void copyFile(String sourcePath, String targetPath) throws IOException {
        try (FileInputStream fis = new FileInputStream(sourcePath);
             FileOutputStream fos = new FileOutputStream(targetPath);
             FileChannel sourceChannel = fis.getChannel();
             FileChannel targetChannel = fos.getChannel()) {
            targetChannel.transferFrom(sourceChannel, 0, sourceChannel.size());
        }
    }
}
```

---

### 6. Bảng Tra Cứu Mã Lỗi Phổ Biến (Error Codes Reference)

#### 6.1 Mã lỗi Cài đặt Ứng dụng Ngầm (Silent Installation Error Codes)

- `-1`: File APK đã tồn tại.
- `-2`: File APK không hợp lệ.
- `-4`: Không đủ dung lượng bộ nhớ thiết bị.
- `-7`: Bản cập nhật không tương thích (Mismatch Signature).
- `-13`: Xung đột Content Provider permission.
- `-16`: File `.so` Native Code không tương thích ABI chip của thiết bị.
- `-100`: Path không phải file hoặc không đúng đuôi `.apk`.
- `-103`: Không tìm thấy chứng chỉ Certificate trong APK.

#### 6.2 Mã lỗi Gỡ Ứng dụng Ngầm (Silent Uninstallation Error Codes)

- `-1`: Thất bại không xác định.
- `-2`: App đang là Active Device Policy Manager (Admin).
- `-4`: App được đánh dấu là không thể gỡ bởi Device Owner.
- `-201`: Package app muốn gỡ không tồn tại trên hệ thống.

#### 6.3 Mã lỗi Cập nhật Hệ thống OTA (UpdateSystem APIs)

- `1`: Xác minh thành công.
- `2`: File cập nhật lỗi (Thiếu `version.txt`).
- `3`: Gói cập nhật không đúng Model thiết bị.
- `4`: Phiên bản gói cập nhật thấp hơn phiên bản hệ thống hiện tại.
- `11`: Mức Pin quá thấp không đủ điều kiện nâng cấp.
- `13`: Không đủ dung lượng bộ nhớ.

---

### 7. Entity Classes Tra Cứu

#### 7.1 Custom Key Constants (`KeyConstants`)

```java
public class KeyConstants {
    public static final String VOLUME_1 = "volume_1";
    public static final String VOLUME_2 = "volume_2";
    public static final String ACTION_VOLUME_KEY = "com.sunmi.volume.key";
    public static final String ACTION_SCANNER_KEY = "com.sunmi.scanner.key";
    public static final String ACTION_LAUNCH_APP = "com.sunmi.launch_app";
}
```

#### 7.2 Danh sách Model Thiết bị Hỗ trợ (Appendix)

- **Non-Financial Support (D, T, S, K, F Series)**: D3 MINI, D3 PRO, T3 PRO, T3, V3 MIX, V3, K2, FLEX 3, L3, M3...
- **Financial Support (P Series)**: P3, P3H-A11, P3KH-A11...

## Testing Decisions

- **Tiêu chuẩn Test**: Mọi tương tác gọi qua `TMSApi` được kiểm thử với `TMSServiceConnection` giả lập.
- **Modules Kiểm thử**: `SunmiTmsManager`, `SilentAppInstaller`, `FileStorageUtil`.
- **Seam Strategy**: Giả lập hai trạng thái callback `onServiceConnected` và `onServiceDisconnected` để kiểm tra khả năng bắt ngoại lệ `TmsServiceDisconnectedException` của ứng dụng.

## Out of Scope

- Chạy SDK trên các thiết bị Android không thuộc thương hiệu SUNMI.
- Thay đổi trực tiếp daemon hệ thống `com.sunmi.tmservice` ngoài phạm vi API cung cấp.

## Further Notes

- Yêu cầu SDK hỗ trợ: Android API-19 (Android 4.4 trở lên). Thư viện tương thích với Android Studio & IntelliJ.
