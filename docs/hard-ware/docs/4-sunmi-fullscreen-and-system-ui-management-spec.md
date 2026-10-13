# SUNMI Application Fullscreen & System UI Management Specification

## Proposed Seam

- **SystemUiController Seam (`ISystemUiController`)**: Interface quản lý trạng thái ẩn/hiện Navigation Bar và Status Bar. Seam này bọc các lệnh can thiệp `View.setSystemUiVisibility` và `Window` decor view, giúp kiểm thử hành vi UI trong môi trường unit test/UI test mà không bị phụ thuộc vào Android Window Manager thực tế.

## Problem Statement

Các ứng dụng POS và Kiosk thương mại trên thiết bị SUNMI yêu cầu chế độ hiển thị toàn màn hình (Immersive Fullscreen) để tránh người dùng cuối bấm nhầm nút điều hướng hoặc thanh thông báo. Tuy nhiên, việc bật Fullscreen cho Activity và Dialog trên Android thường gặp lỗi chớp màn hình (splash screen nav bar popup) do bug AOSP, cũng như các hành vi vuốt cạnh màn hình hoặc bật bàn phím ảo (IME) cần được xử lý chuẩn hóa.

## Solution

Cung cấp giải pháp kỹ thuật chuẩn hóa để duy trì chế độ Sticky Immersive Fullscreen cho cả Activity lẫn AlertDialog trên SUNMI OS. Tận dụng flag hệ thống Android và các bản sửa lỗi firmware từ SUNMI OS (Firmware >= 332) để ngăn hiện tượng nảy thanh điều hướng khi bật Dialog hoặc hiển thị bàn phím.

## User Stories

1. As a Commercial Kiosk Developer, I want my app to stay in sticky immersive full-screen mode, so that customers cannot leave the POS interface or trigger Android navigation buttons by accident.
2. As an Application Developer, I want Dialog popups to inherit full-screen flags without showing a transient navigation bar splash, so that the UI remains seamless during modal interactions.
3. As a POS Store Operator, I want the system bar to auto-hide 4 seconds after a swipe-up gesture, so that store managers can temporarily access OS settings without ruining the full-screen kiosk flow.

## Implementation Decisions

### 1. Fullscreen cho Activity (`SystemUIUtils`)

Cấu hình flag `IMMERSIVE_STICKY` trong callback `onWindowFocusChanged` của Activity để đảm bảo giữ chế độ toàn màn hình ngay cả khi ứng dụng lấy lại focus.

#### Sample Code - Structing SystemUIUtils:

```java
public class MainActivity extends AppCompatActivity {
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            SystemUIUtils.setStickFullScreen(getWindow().getDecorView());
        }
    }
}

public class SystemUIUtils {
    public static void setStickFullScreen(View view) {
        int systemUiVisibility = view.getSystemUiVisibility();
        int flags = View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                  | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                  | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION // Hide Navigation Bar
                  | View.SYSTEM_UI_FLAG_FULLSCREEN        // Hide Status Bar
                  | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY; // Sticky Immersive
        systemUiVisibility |= flags;
        view.setSystemUiVisibility(systemUiVisibility);
    }
}
```

### 2. Fullscreen cho Dialog (Khắc phục lỗi AOSP Nav Bar Flash)

Khi khởi tạo `AlertDialog`, phải áp dụng `setStickFullScreen` trực tiếp lên `dialog.getWindow().getDecorView()`.

#### Sample Code - Fullscreen Dialog:

```java
public AlertDialog createFullscreenDialog(Context context, boolean fullscreen) {
    AlertDialog.Builder builder = new AlertDialog.Builder(context, R.style.DialogStyle);
    AlertDialog dialog = builder.create();
    if (fullscreen && dialog.getWindow() != null) {
        SystemUIUtils.setStickFullScreen(dialog.getWindow().getDecorView());
    }
    return dialog;
}
```

### 3. Quy tắc hành vi System UI trên SUNMI OS

- **Vuốt vuốt cạnh dưới (Swipe up)**: Thanh điều hướng sẽ xuất hiện tạm thời và tự động ẩn lại sau **4 giây**.
- **Chuyển đổi App**: Khi chuyển sang app thứ 3, thanh điều hướng phụ thuộc vào app đó. Khi quay lại ứng dụng hiện tại, ứng dụng sẽ tự động ẩn thanh điều hướng trở lại.
- **Giới hạn an toàn (Security Restriction)**: SUNMI OS không cho phép ẩn hoàn toàn thanh Notification/Navigation mà chặn thao tác vuốt. Vuốt từ mép màn hình luôn kích hoạt lại thanh điều hướng tạm thời.

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi đúng và đủ các flag `SYSTEM_UI_FLAG` khi view nhận focus hoặc khi khởi tạo dialog.
- **Modules Kiểm thử**: `SystemUIUtils`, `BaseFullscreenActivity`, `FullscreenDialogFactory`.
- **Seam Strategy**: Sử dụng `ISystemUiController` để verified tập hợp UI flags được pass vào `setSystemUiVisibility` trong Unit Test.

## Out of Scope

- Khóa cứng cứng hoàn toàn cử chỉ vuốt phần cứng (Hardware swipe gesture lockdown) cấp Kernel.
- Sửa lỗi AOSP trên các bản firmware SUNMI OS cũ dưới version 332 (khuyến nghị update OTA).

## Further Notes

- **SUNMI OS Firmware >= 332**: Đã fix sẵn 2 lỗi AOSP lớn: lỗi chớp thanh điều hướng khi bật Dialog và lỗi hiện thanh điều hướng khi bật bàn phím ảo (Software Keyboard IME).
