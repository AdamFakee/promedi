# SUNMI Volume Keys Shortcut Customization Specification

## Proposed Seam

- **VolumeKeyShortcutHandler Seam (`IVolumeKeyShortcutHandler`)**: Interface quản lý việc tiếp nhận và định tuyến các phím tắt từ nút Volume Up / Volume Down phần cứng. Seam này giúp bọc Intent kích hoạt từ SUNMI OS, cho phép giả lập việc bấm nút Volume để mở màn hình Quét mã vạch hoặc Hiển thị QR trong môi trường unit test.

## Problem Statement

Thu ngân hoặc nhân viên kiểm kho cần các thao tác phím tắt phần cứng tức thì (như bấm nút Tăng/Giảm âm lượng) để mở nhanh giao diện Quét mã vạch hoặc màn hình Mã QR thanh toán mà không cần thao tác bấm trên màn hình cảm ứng. Nếu ứng dụng không đăng ký đúng Intent Filter theo quy chuẩn của SUNMI OS (từ phiên bản 2.1.0 trở lên), Cài đặt hệ thống sẽ không thể nhận diện được các tính năng này của ứng dụng.

## Solution

Cấu hình Activity trong `AndroidManifest.xml` theo chuẩn SUNMI OS: thiết lập `android:launchMode="singleInstance"`, đăng ký `<category android:name="android.intent.category.DEFAULT" />`, và định nghĩa Action Name theo quy tắc `[Package_Name].[Function_Suffix]` (ví dụ: `com.example.test.scan` cho tính năng Quét mã).

## User Stories

1. As a Store Cashier, I want to single-press the Volume Up key on my SUNMI device to immediately open the barcode scanner, so that I can scan products without clicking through app menus.
2. As a Customer, I want the cashier to press the Volume Down key to bring up my payment QR code screen instantly, so that my checkout time is minimized.
3. As an Application Developer, I want to declare volume key actions in `AndroidManifest.xml`, so that users can map these shortcuts directly in SUNMI OS System Settings.

## Implementation Decisions

### 1. Quy tắc đặt tên Action Intent (Action Naming Convention)

Cấu trúc Action: `[Package_Name].[Function_Suffix]`

| Tính năng trong SUNMI System Settings | Hậu tố Function Suffix | Ví dụ Action Complete (`com.example.test`) |
| :------------------------------------ | :--------------------- | :----------------------------------------- |
| **Mở ứng dụng (Open App)**            | Mặc định hệ thống      | `android.intent.action.MAIN`               |
| **Quét mã vạch (Code Scanning)**      | `.scan`                | `com.example.test.scan`                    |
| **Hiển thị mã QR (Display QR Code)**  | `.qrcode`              | `com.example.test.qrcode`                  |

### 2. Cấu hình Manifest cho Activity Quét mã vạch (Code Scanning)

#### Sample Code - `AndroidManifest.xml` (Ví dụ Package `com.example.test`):

```xml
<activity
    android:name=".ScanActivity"
    android:launchMode="singleInstance"
    android:exported="true">

    <intent-filter>
        <!-- Action quy định theo SUNMI Rule: Package + .scan -->
        <action android:name="com.example.test.scan" />

        <!-- Category bắt buộc phải là DEFAULT -->
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>

</activity>
```

### 3. Cấu hình Manifest cho Activity Hiển thị Mã QR (Display QR Code)

#### Sample Code - `AndroidManifest.xml`:

```xml
<activity
    android:name=".QRCodeActivity"
    android:launchMode="singleInstance"
    android:exported="true">

    <intent-filter>
        <!-- Action quy định theo SUNMI Rule: Package + .qrcode -->
        <action android:name="com.example.test.qrcode" />

        <!-- Category bắt buộc phải là DEFAULT -->
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>

</activity>
```

### 4. Xử lý nhận Intent trong Activity (`ScanActivity.java`)

```java
package com.example.test;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class ScanActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan);

        handleShortcutIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShortcutIntent(intent);
    }

    private void handleShortcutIntent(Intent intent) {
        if (intent != null && "com.example.test.scan".equals(intent.getAction())) {
            // Lực chọn khởi chạy camera hoặc đầu đọc máy quét phần ứng
            startBarcodeScanner();
        }
    }

    private void startBarcodeScanner() {
        // Code kích hoạt camera / scanner driver
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gửi `adb shell am start -a com.example.test.scan` kích hoạt đúng `ScanActivity` ở chế độ `singleInstance`.
- **Modules Kiểm thử**: `ScanActivity`, `QRCodeActivity`, `VolumeKeyShortcutHandler`.
- **Seam Strategy**: Sử dụng `IVolumeKeyShortcutHandler` để mock việc nhận Intent action trong Unit Test.

## Out of Scope

- Tùy chỉnh các phím phần cứng khác ngoài nút Volume Up và Volume Down (ví dụ: Nút Nguồn, Nút Power).
- Hỗ trợ gán phím Volume Shortcut trên phiên bản SUNMI OS cũ dưới 2.1.0.

## Further Notes

- Yêu cầu thiết bị chạy phiên bản **SUNMI OS 2.1.0 trở lên**. Người dùng sau đó vào **System Settings > Volume Key Customization** để gán thao tác bấm đơn (Single Press) phím Volume cho ứng dụng.
