# SUNMI Application Data Clearing Protection Specification

## Proposed Seam

- **AppDataProtection Seam (`IAppDataManager`)**: Interface quản lý dữ liệu ứng dụng và lưu trữ cục bộ. Seam này giúp bọc các thao tác truy xuất bộ nhớ (SharedPreferences, SQLite, Room DB) và kiểm thử hành vi bảo vệ dữ liệu khi nhận event quản lý dung lượng.

## Problem Statement

Mặc định trên Android, người dùng hoặc nhân viên thu ngân có thể vào Cài đặt hệ thống (Settings > Apps > Clear Data) để xóa toàn bộ dữ liệu ứng dụng. Việc này làm mất các dữ liệu giao dịch chưa đồng bộ, cấu hình thiết bị, nhật ký hóa đơn hoặc thông tin cấp phép phần mềm quan trọng của POS.

## Solution

Cấu hình thuộc tính `android:manageSpaceActivity` trong `AndroidManifest.xml` để điều hướng nút "Xóa dữ liệu" (Clear Data) trong System Settings sang một Activity tùy chỉnh. Nhà phát triển có thể tạo giao diện quản lý dữ liệu theo phân vùng công việc hoặc tạo một Activity tự động kết thúc (`finish()`) để ngăn chặn hoàn toàn việc xóa dữ liệu ứng dụng trái phép.

## User Stories

1. As a Store Owner, I want application data to be protected from accidental clearing via Android Settings, so that offline sales receipts and local device credentials are not lost.
2. As an Enterprise Developer, I want to redirect the system "Clear Data" action to a custom space management screen, so that users can clear temporary cache files without wiping critical database tables.

## Implementation Decisions

### 1. Cấu hình `android:manageSpaceActivity` trong `AndroidManifest.xml`

Khai báo thuộc tính `manageSpaceActivity` trong thẻ `<application>` trỏ đến Activity xử lý không gian bộ nhớ:

#### Sample Code - `AndroidManifest.xml`:

```xml
<application
    android:name=".MyApplication"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:manageSpaceActivity=".ManageSpaceActivity">

    <!-- Khai báo Activity quản lý bộ nhớ -->
    <activity
        android:name=".ManageSpaceActivity"
        android:exported="true"
        android:theme="@android:style/Theme.NoDisplay" />

</application>
```

### 2. Sample Code - Auto-Finish Activity (Chống xóa dữ liệu tuyệt đối)

Nếu mục đích là **chặn hoàn toàn** hành vi xóa dữ liệu từ cài đặt hệ thống, tạo `ManageSpaceActivity` và gọi `finish()` ngay trong `onCreate`:

```java
package com.sm.sdk.demo;

import android.app.Activity;
import android.os.Bundle;

/**
 * Activity được hệ thống kích hoạt khi người dùng bấm "Clear Data" trong Settings.
 * Gọi finish() lập tức để chặn hệ thống thực thi xóa dữ liệu ứng dụng.
 */
public class ManageSpaceActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Đóng Activity ngay lập tức mà không thực thi xóa dữ liệu
        finish();
    }
}
```

### 3. Tùy chọn Quản lý Dung lượng theo Nghiệp vụ (Granular Data Clearing)

Thay vì chặn hoàn toàn bằng `finish()`, có thể hiển thị dialog xác nhận mật khẩu admin hoặc giao diện lựa chọn xóa theo loại dữ liệu:

- Xóa Cache ảnh / Báo cáo cũ (Giữ nguyên Cấu hình thiết bị & Database giao dịch).

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `ManageSpaceActivity` khi Intent manage space được gửi từ hệ thống.
- **Modules Kiểm thử**: `ManageSpaceActivity`, `ManifestConfigValidator`.
- **Seam Strategy**: Sử dụng `IAppDataManager` để kiểm tra toàn vẹn dữ liệu database và preference sau khi trigger Intent manage space trong Unit Test.

## Out of Scope

- Chống xóa dữ liệu khi thiết bị bị gỡ ứng dụng hoàn toàn (Uninstall App).
- Khôi phục dữ liệu đã bị xóa trước khi áp dụng cấu hình `manageSpaceActivity`.

## Further Notes

- Cấu hình `manageSpaceActivity` là giải pháp chuẩn của Android Framework để đè hành vi Clear Data mặc định mà không cần quyền Root.
