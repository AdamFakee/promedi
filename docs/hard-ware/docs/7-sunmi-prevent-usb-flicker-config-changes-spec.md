# SUNMI Prevent USB Plug-in UI Flickering & Configuration Changes Specification

## Proposed Seam

- **ConfigChangeHandler Seam (`IConfigChangeHandler`)**: Interface xử lý các sự kiện thay đổi cấu hình hệ thống (Configuration Changes) khi cắm/rút ngoại vi USB. Seam này giúp bắt và kiểm thử callback `onConfigurationChanged` trong môi trường unit/UI test mà không làm tái tạo Activity.

## Problem Statement

Khi cắm hoặc rút các thiết bị ngoại vi USB (như đầu đọc mã vạch USB, bàn phím USB, máy in USB) vào thiết bị SUNMI, hệ điều hành Android mặc định coi đó là một sự kiện thay đổi phần cứng/bàn phím (`navigation` / `keyboard` change). Việc này khiến Activity bị hủy và khởi tạo lại (destroy and recreate), gây chớp/giật màn hình ứng dụng (UI flickering) và làm gián đoạn trải nghiệm người dùng hoặc mất trạng thái form đang nhập.

## Solution

Cấu hình thuộc tính `android:configChanges="navigation|keyboardHidden|keyboard"` trong `AndroidManifest.xml` cho Activity. Việc này thông báo với Android rằng ứng dụng sẽ tự xử lý các thay đổi cấu hình liên quan đến bàn phím và điều hướng, ngăn chặn việc hệ thống tự động tái tạo Activity khi thiết bị USB được cắm hoặc rút.

## User Stories

1. As a Store Cashier, I want the POS screen not to flicker or reset when I plug in a USB barcode scanner, so that my active order scanning is not interrupted.
2. As an Application Developer, I want to retain Activity state when USB peripherals are dynamically attached/detached, so that I don't have to save and restore instance states manually for USB hardware events.

## Implementation Decisions

### 1. Cấu hình `android:configChanges` trong `AndroidManifest.xml`

Bổ sung chuỗi cấu hình `navigation|keyboardHidden|keyboard` vào thuộc tính `configChanges` của thẻ `<activity>`:

#### Sample Code - `AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTop"
    android:configChanges="navigation|keyboardHidden|keyboard|orientation|screenSize">

    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

</activity>
```

### 2. Sample Code - Ghi đè callback `onConfigurationChanged` (Tùy chọn)

Khi có sự kiện cắm/rút thiết bị USB, Android sẽ gọi hàm `onConfigurationChanged` thay vì hủy Activity. Bạn có thể ghi đè hàm này để xử lý logic tùy chỉnh nếu cần:

```java
package com.sm.sdk.demo;

import android.content.res.Configuration;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "USBConfigChange";

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        // Log xác nhận Activity không bị tái tạo khi cắm/rút USB bàn phím/máy quét
        Log.d(TAG, "Configuration changed without destroying Activity: keyboard/navigation updated.");
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `onConfigurationChanged` thay vì `onDestroy` -> `onCreate` khi giả lập sự kiện thay đổi cấu hình phần cứng.
- **Modules Kiểm thử**: `MainActivity`, `ConfigChangeHandler`.
- **Seam Strategy**: Sử dụng `IConfigChangeHandler` để kiểm tra trạng thái Activity Instance không thay đổi (cùng hashcode) trước và sau sự kiện cắm thiết bị USB.

## Out of Scope

- Khắc phục lỗi sụt nguồn phần cứng làm khởi động lại toàn bộ máy khi cắm USB bị chập điện.
- Tự động nhận diện driver USB nếu thiết bị ngoại vi sử dụng protocol không được Android hỗ trợ.

## Further Notes

- Kết hợp thuộc tính này với `android:launchMode="singleTop"` (đã nêu tại spec 5) để có giải pháp chống giật/lặp màn hình hoàn hảo nhất cho thiết bị SUNMI.
