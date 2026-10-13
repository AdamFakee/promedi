# SUNMI Customer API - System UI Management Module Specification

## Proposed Seam

- **SystemUIManager Seam (`ISystemUIManager`)**: Seam nằm ở interface `sTmsApi.getSystemUIManager()`. Interface này bao bọc 18 API điều khiển giao diện hệ thống System UI (Ẩn/Hiện và Bật/Vô hiệu hóa Navigation Bar, Back Key, Home Key, Recent Key, Status Bar, Notification Panel vuốt xuống, nút Chia sẻ Wi-Fi và PPP Portal). Seam cho phép giả lập các thao tác ẩn/hiện và vô hiệu hóa UI trong unit test mà không làm ảnh hưởng giao diện thiết bị thật.

## Problem Statement

Các ứng dụng POS/Kiosk trên máy SUNMI cần kiểm soát toàn diện giao diện thanh điều hướng (Navigation Bar) và thanh trạng thái (Status Bar)—ví dụ: ẩn toàn bộ thanh điều hướng, vô hiệu hóa từng phím cứng ảo (Back, Home, Recent Apps), chặn cử chỉ vuốt thanh thông báo xuống (Disable Notification Drop-down), và ẩn các nút cấu hình nhạy cảm trong Cài đặt hệ thống (như nút Share Wi-Fi hoặc cổng kết nối PPP). Việc thiếu đặc tả và code mẫu cho 18 API của `System UI Management Module` làm chậm tiến độ phát triển chế độ Kiosk an toàn.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `System UI Management Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 18 APIs, làm rõ sự khác biệt giữa ẩn hiển thị (`show...`) và vô hiệu hóa chức năng (`enable...`), đồng thời cung cấp đầy đủ mã nguồn mẫu Java chuẩn xác cho từng hàm.

## User Stories

1. As a Kiosk Developer, I want to hide the Navigation Bar (`showNatigationBar(false)`) and Status Bar (`showStatusBar(false)`), so that the application runs in a full-screen commercial environment.
2. As a POS Security Manager, I want to disable the Home button (`enableNavigationBarHomeButton(false)`) and Recent Apps button (`enableNavigationBarRecentsButton(false)`), so that cashiers cannot exit the checkout application or switch apps.
3. As a Fleet Manager, I want to disable the status bar drop-down notification panel (`enableNotificationPanel(false)`), so that end users cannot swipe down to access Wi-Fi, Bluetooth, or system settings.
4. As an Enterprise Admin, I want to hide the Wi-Fi Share button (`setSettingsUiWifiDetailShareVisible(false)`) and PPP Communication portal in System Settings, so that network credentials cannot be leaked.

## Implementation Decisions

### 1. Phân nhóm 18 APIs thuộc `System UI Management Module`

#### Group 1: Quản lý Ẩn/Hiện Thanh Điều hướng & Các Phím chức năng (Show/Hide Nav & Keys)

- `showNatigationBar(boolean show)`: Ẩn/Hiện toàn bộ thanh điều hướng Navigation Bar.
- `showNavigationBarBackButton(boolean show)`: Ẩn/Hiện phím Back (Quay lại).
- `showNavigationBarHomeButton(boolean show)`: Ẩn/Hiện phím Home (Màn hình chính).
- `showNavigationBarRecentsButton(boolean show)`: Ẩn/Hiện phím Recents (Ứng dụng gần đây).

#### Group 2: Quản lý Bật/Vô hiệu hóa Phím Điều hướng (Enable/Disable Nav Keys & Status Check)

- `enableNavigationBarBackButton(boolean enable)`, `isNavigationBarBackButtonEnabled()`: Cho phép / Khóa chức năng phím Back.
- `enableNavigationBarHomeButton(boolean enable)`, `isNavigationBarHomeButtonEnabled()`: Cho phép / Khóa chức năng phím Home.
- `enableNavigationBarRecentsButton(boolean enable)`, `isNavigationBarRecentsButtonEnabled()`: Cho phép / Khóa chức năng phím Recents.

#### Group 3: Quản lý Thanh Trạng thái & Bảng Thông báo Vuốt xuống (Status Bar & Notification Panel)

- `showStatusBar(boolean show)`: Ẩn/Hiện thanh trạng thái Status Bar ở mép trên màn hình.
- `enableNotificationPanel(boolean enable)`, `isNotificationPanelEnabled()`: Cho phép / Chặn thao tác vuốt xuống mở Notification Panel.

#### Group 4: Tùy chỉnh Cài đặt Nâng cao (Quick Settings & System Portals)

- `setAirplaneModeBarClickable(boolean clickable)`: Cho phép / Chặn click nút Chế độ máy bay trên menu Quick Settings.
- `setSettingsUiWifiDetailShareVisible(boolean show)`, `getSettingsUiWifiDetailShareVisible()`: Ẩn/Hiện nút Share QR Wi-Fi trong Cài đặt chi tiết Wi-Fi (P3).
- `setSettingsPPPCommunicationVisible(boolean show)`, `getSettingsPPPCommunicationVisible()`: Ẩn/Hiện mục kết nối truyền thông PPP trong Settings (P3, P3H).

---

### 2. Sample Code - Mã nguồn mẫu cho từng tính năng

#### 2.1 Ẩn/Hiện toàn bộ Thanh Điều hướng & Thanh Trạng thái (Fullscreen Kiosk UI)

```java
try {
    // 1. Ẩn thanh trạng thái (Status Bar) ở trên cùng
    sTmsApi.getSystemUIManager().showStatusBar(false);

    // 2. Ẩn toàn bộ thanh điều hướng (Navigation Bar) ở dưới cùng
    sTmsApi.getSystemUIManager().showNatigationBar(false);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.2 Vô hiệu hóa từng phím chức năng Back, Home, Recent Apps (Lockout Mode)

```java
try {
    // 1. Vô hiệu hóa nút Home (Bấm vào không tác dụng)
    sTmsApi.getSystemUIManager().enableNavigationBarHomeButton(false);

    // 2. Vô hiệu hóa nút Recent Apps (Ngăn xem ứng dụng gần đây)
    sTmsApi.getSystemUIManager().enableNavigationBarRecentsButton(false);

    // 3. Vô hiệu hóa nút Back (Quay lại)
    sTmsApi.getSystemUIManager().enableNavigationBarBackButton(false);

    // Kiểm tra trạng thái phím Home
    boolean isHomeActive = sTmsApi.getSystemUIManager().isNavigationBarHomeButtonEnabled();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.3 Chặn thao tác vuốt Bảng Thông báo từ mép trên (`enableNotificationPanel`)

```java
try {
    // Chặn hoàn toàn cử chỉ vuốt bảng Notification từ Status Bar xuống
    sTmsApi.getSystemUIManager().enableNotificationPanel(false);

    // Kiểm tra xem bảng thông báo có đang cho phép vuốt xuống không
    boolean isPanelAllowed = sTmsApi.getSystemUIManager().isNotificationPanelEnabled();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.4 Ẩn nút Chia sẻ Wi-Fi và Cổng kết nối PPP trong Settings

```java
try {
    // 1. Ẩn nút "Chia sẻ QR Wi-Fi" trong Cài đặt chi tiết Wi-Fi
    int resultWifi = sTmsApi.getSystemUIManager().setSettingsUiWifiDetailShareVisible(false);

    // 2. Ẩn cổng giao tiếp PPP trong Mạng & Internet
    int resultPPP = sTmsApi.getSystemUIManager().setSettingsPPPCommunicationVisible(false);
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Đảm bảo tất cả các hàm `is...Enabled` phản ánh đúng trạng thái đã đặt thông qua các hàm `enable...`.
- **Modules Kiểm thử**: `SystemUiLockController`, `KioskModeManager`, `SettingsMenuCustomizer`.
- **Seam Strategy**: Giả lập `ISystemUIManager` để kiểm thử logic chuyển đổi giữa chế độ Kiosk (Nav Disabled & Status Bar Hidden) và Chế độ Admin (Nav Enabled).

## Out of Scope

- Sửa đổi bố cục giao diện System UI mặc định ngoài các phím tiêu chuẩn (Back, Home, Recent).
- Bỏ qua các ràng buộc an ninh cử chỉ phần cứng trên các bản Android gốc không thuộc SUNMI OS.

## Further Notes

- Tên hàm `showNatigationBar` là tên phương thức chính thức trong SDK (chứa lỗi chính tả từ nhà sản xuất SUNMI, cần giữ nguyên tên hàm để gọi không bị lỗi biên dịch).
