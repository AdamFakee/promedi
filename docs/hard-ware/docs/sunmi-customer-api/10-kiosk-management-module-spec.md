# SUNMI Customer API - Kiosk Management Module Specification

## Proposed Seam

- **KioskManager Seam (`IKioskManager`)**: Seam nằm ở interface `sTmsApi.getKioskManager()`. Interface này bao bọc 15 API điều khiển tính năng Kiosk Mode (Bật/Tắt tính năng Kiosk, quản lý danh sách app Kiosk Whitelist, cấu hình mật khẩu thoát Kiosk local/cloud 4 hoặc 8 chữ số, chuyển đổi loại mật khẩu, ẩn/hiện Navigation Bar và Status Bar trong chế độ Kiosk, và thoát Kiosk qua lập trình). Seam giúp giả lập mọi trạng thái Kiosk Mode trong unit test mà không làm khóa phần cứng thật.

## Problem Statement

Các ứng dụng Kiosk thương mại (tự phục vụ, tra cứu sản phẩm, thanh toán POS cố định) trên thiết bị SUNMI cần khóa ứng dụng trong môi trường Kiosk khép kín. Việc này đòi hỏi ứng dụng phải tự thêm vào danh sách Kiosk Whitelist (`addAppToKioskList`), đặt mật khẩu bảo mật để nhân viên thoát Kiosk (`setKioskPwdByType`), tùy chỉnh thanh điều hướng hiển thị liên tục hoặc vuốt từ dưới lên (`setNavigationBarStatusForKiosk`), ẩn thanh trạng thái Notification Bar, và thực thi thoát Kiosk Mode khi xác thực mật khẩu. Việc thiếu đặc tả tập trung kèm mã nguồn mẫu cho 15 API của `Kiosk Management Module` gây khó khăn khi xây dựng giao diện Kiosk chuẩn an toàn.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `Kiosk Management Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 15 APIs, quy định rõ độ ưu tiên mật khẩu (8 chữ số > 4 chữ số, cloud vs local), nguyên tắc quản lý Navigation Bar/Status Bar trước khi mở Kiosk App, và cung cấp đầy đủ mã nguồn mẫu Java cho từng trường hợp sử dụng.

## User Stories

1. As a Kiosk Systems Engineer, I want to enable the Kiosk feature (`enableKioskFunction`) and add my package name to the Kiosk Whitelist (`addAppToKioskList`), so that the device stays locked to the commercial kiosk application.
2. As a Security Admin, I want to configure a 4-digit or 8-digit PIN to exit Kiosk Mode (`setKioskPwdByType`) and switch active password types (`switchKioskPwdByType`), so that cashiers need proper authorization to leave Kiosk mode.
3. As a UI/UX Developer, I want to set the Navigation Bar display mode (`setNavigationBarStatusForKiosk`) and hide the Status Bar (`hideStatusBarForKiosk`), so that users cannot swipe down notifications or leave the application.
4. As an Application Developer, I want to call `exitKioskMode(password)` programmatically after verifying staff credentials, so that technicians can perform administrative maintenance seamlessly.

## Implementation Decisions

### 1. Phân nhóm 15 APIs thuộc `Kiosk Management Module`

#### Group 1: Bật/Tắt & Kiểm tra Trạng thái Kiosk Mode (Core Kiosk Controls)

- `enableKioskFunction(enable)`: Bật/Tắt toàn bộ tính năng Kiosk trên thiết bị.
- `isKioskFunctionEnabled()`: Kiểm tra thiết bị có hỗ trợ/đã bật Kiosk feature không.
- `getKioskModeStatus()`: Kiểm tra thiết bị có đang hoạt động trong chế độ Kiosk không.

#### Group 2: Quản lý Danh sách App Kiosk (Kiosk App Whitelist)

- `addAppToKioskList(packageNames)`: Thêm danh sách package name vào danh sách ứng dụng Kiosk.
- `removeAppFromKioskList(packageNames)`: Xóa package name khỏi danh sách ứng dụng Kiosk.
- `getKioskAppList()`: Truy vấn danh sách toàn bộ package name thuộc Kiosk Mode.
- `isKioskApp(packageName)`: Kiểm tra một package name có phải là app Kiosk không.

#### Group 3: Cấu hình Mật khẩu & Chuyển đổi Loại Mật khẩu (Password Management & Switch)

- `setKioskPwdByType(type, psw)`: Thiết lập mật khẩu thoát Kiosk Mode bằng số (4 hoặc 8 chữ số).
  - `type = 0`: Mật khẩu Cloud 4 chữ số.
  - `type = 1`: Mật khẩu Cloud 8 chữ số (Độ ưu tiên cao nhất).
  - `type = 2`: Mật khẩu Local tại máy 4 chữ số.
- `switchKioskPwdByType(type)`: Chuyển đổi loại mật khẩu hoạt động (`-1`: Logic gốc, `0`: Cloud 4-digit, `1`: Cloud 8-digit, `2`: Local).
- `getSwitchKioskPwdByType()`: Đọc loại mật khẩu đang áp dụng hiện tại.
- `exitKioskMode(password)`: Thoát Kiosk Mode bằng mã lập trình sau khi xác thực đúng mật khẩu.

#### Group 4: Cấu hình Thanh Điều hướng & Thanh Trạng thái trong Kiosk Mode (Nav & Status Bar Behavior)

- `setNavigationBarStatusForKiosk(status)`: Cấu hình hiển thị Navigation Bar trong Kiosk Mode.
  - `status = 1`: Hiển thị liên tục (Chỉ hiển thị duy nhất nút Back quay lại).
  - `status = 2`: Mặc định vuốt từ mép dưới màn hình lên để hiện thanh điều hướng.
- `getNavigationBarStatusForKiosk()`: Đọc chế độ hiển thị Navigation Bar hiện tại.
- `hideStatusBarForKiosk(hide)`: Ẩn/Hiện Status Bar trong Kiosk Mode (`true`: Ẩn mặc định, `false`: Hiện liên tục).
- `isStatusBarHiddenForKiosk()`: Đọc trạng thái ẩn Status Bar.

---

### 2. Sample Code - Mã nguồn mẫu chi tiết cho từng tính năng

#### 2.1 Khởi tạo Kiosk Mode & Thêm App vào Danh sách Whitelist

```java
try {
    // 1. Bật tính năng Kiosk toàn hệ thống
    boolean isKioskEnabled = sTmsApi.getKioskManager().enableKioskFunction(true);

    // 2. Thêm package name của ứng dụng vào Kiosk Whitelist
    List<String> kioskApps = new ArrayList<>();
    kioskApps.add("com.example.kioskpos");

    boolean addSuccess = sTmsApi.getKioskManager().addAppToKioskList(kioskApps);

    // 3. Đợi 300ms trước khi kiểm tra lại danh sách Kiosk App (Khuyến nghị cho stress test)
    Thread.sleep(300);
    List<String> currentKioskApps = sTmsApi.getKioskManager().getKioskAppList();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.2 Đặt Mật khẩu & Chuyển đổi Loại Mật khẩu Thoát Kiosk (`setKioskPwdByType`)

```java
try {
    // 1. Cài đặt Mật khẩu Local 4 chữ số là "1234" (type = 2)
    boolean setLocalSuccess = sTmsApi.getKioskManager().setKioskPwdByType(2, "1234");

    // 2. Cài đặt Mật khẩu Cloud 8 chữ số là "88888888" (type = 1)
    boolean setCloudSuccess = sTmsApi.getKioskManager().setKioskPwdByType(1, "88888888");

    // 3. Chuyển đổi loại mật khẩu hoạt động sang Mật khẩu Local (type = 2)
    boolean switchSuccess = sTmsApi.getKioskManager().switchKioskPwdByType(2);

    // 4. Truy vấn loại mật khẩu đang áp dụng (-1: Logic gốc, 0: Cloud 4-digit, 1: Cloud 8-digit, 2: Local)
    int activeType = sTmsApi.getKioskManager().getSwitchKioskPwdByType();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.3 Cấu hình Giao diện Navigation Bar & Status Bar trước khi mở Kiosk App

```java
try {
    // 1. Đặt Navigation Bar hiển thị liên tục (chỉ chứa phím Back) (status = 1)
    // Hoặc status = 2 (Vuốt từ dưới lên mới hiện)
    sTmsApi.getKioskManager().setNavigationBarStatusForKiosk(1);

    // 2. Ẩn thanh trạng thái Status Bar (hide = true)
    // Lưu ý: Trong Kiosk Mode, bảng thông báo vuốt xuống (Notification Panel) sẽ bị chặn hoàn toàn.
    sTmsApi.getKioskManager().hideStatusBarForKiosk(true);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 2.4 Thoát Chế độ Kiosk Mode qua Mã Lập trình (`exitKioskMode`)

```java
try {
    // Truyền mật khẩu chính xác đã cấu hình (e.g. "1234") để thoát Kiosk Mode
    boolean isExited = sTmsApi.getKioskManager().exitKioskMode("1234");
    if (isExited) {
        // Đã thoát Kiosk Mode thành công, hệ thống quay lại Launcher mặc định
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử logic xác thực mật khẩu `exitKioskMode` đảm bảo trả về `false` khi nhập sai PIN.
- **Modules Kiểm thử**: `KioskModeController`, `KioskAppWhitelistManager`, `KioskPasswordAuthenticator`.
- **Seam Strategy**: Giả lập `IKioskManager` để mock trạng thái `getKioskModeStatus() = true` để kiểm thử hành vi UI trong môi trường Unit Test.

## Out of Scope

- Thoát Kiosk Mode bằng nút bấm phần cứng hoặc phím tắt Volume ngoài việc xác thực mật khẩu.
- Xóa mật khẩu đã lưu trong bộ nhớ khi gỡ ứng dụng (Mật khẩu được lưu trữ an toàn cấp hệ điều hành).

## Further Notes

- **Độ ưu tiên Mật khẩu**: Nếu đồng thời cấu hình cả Mật khẩu Cloud 4 chữ số và 8 chữ số, hệ thống sẽ **ưu tiên Mật khẩu 8 chữ số**. Sử dụng hàm `switchKioskPwdByType` để chuyển lại Mật khẩu 4 chữ số hoặc Mật khẩu Local.
