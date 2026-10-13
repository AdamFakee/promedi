# SUNMI USB Peripheral Permission Persistence Specification

## Proposed Seam

- **UsbPermissionManager Seam (`IUsbPermissionManager`)**: Interface quản lý quyền kết nối thiết bị USB ngoại vi (Printer, Scanner, Customer Display). Seam này đóng gói việc đăng ký `UsbManager` broadcast receiver và kiểm tra `hasPermission()`, giúp mock việc cắm/rút cáp USB trong unit test mà không cần phần cứng USB vật lý.

## Problem Statement

Khi ứng dụng kết nối thiết bị ngoại vi USB (như máy in hóa đơn USB class 7, đầu đọc mã vạch class 3), Android bắt buộc hiển thị dialog xin quyền người dùng để bảo mật. Nếu không cấu hình đúng, ứng dụng sẽ bị hỏi lại quyền mỗi khi rút/cắm lại cáp USB, sau khi reboot thiết bị, hoặc bị giật/refresh lại màn hình (Activity re-launch) khi cắm USB.

## Solution

Cung cấp giải pháp kỹ thuật cấu hình `AndroidManifest.xml`, file lọc thiết bị `res/xml/device_filter.xml`, và chế độ `launchMode="singleTop"` để tự động ghi nhớ quyền USB mặc định ("Use by default for this USB device"), triệt tiêu dialog hỏi quyền lặp lại sau khi reboot và ngăn chặn việc Activity bị khởi chạy lại khi cắm USB.

## User Stories

1. As a Retail Merchant, I want the USB printer to connect automatically after rebooting the POS terminal, so that I don't have to manually confirm USB permission dialogs every morning.
2. As a Store Cashier, I want plugging in a USB scanner not to refresh or restart the active POS screen, so that current cart items are not lost during operation.
3. As an Application Developer, I want a pre-configured `device_filter.xml` matching target USB device classes (Printer, HID, Serial), so that peripheral auto-attachment intent handling works correctly out of the box.

## Implementation Decisions

### 1. Cấu hình Intent Filter trong `AndroidManifest.xml`

Gắn `USB_DEVICE_ATTACHED` intent filter và chỉ định file resource `device_filter` vào Activity xử lý:

#### Sample Code - Manifest Configuration:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTop"> <!-- Ngăn Activity bị refresh/re-launch khi cắm USB -->

    <intent-filter>
        <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
    </intent-filter>

    <meta-data
        android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
        android:resource="@xml/device_filter" />
</activity>
```

### 2. Cấu hình Filter Loại Thiết Bị USB (`res/xml/device_filter.xml`)

Tạo file `res/xml/device_filter.xml` với `class` tương ứng với loại ngoại vi kết nối.

#### Sample Code - `res/xml/device_filter.xml` (Ví dụ máy in USB Class 7):

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- class = 7 tương ứng với USB_CLASS_PRINTER -->
    <usb-device class="7" />
</resources>
```

### 3. Bảng Mã Tra Cứu USB Class Constants (`UsbConstants`)

Dùng để xác định giá trị `class` chính xác cho `device_filter.xml`:

```java
public static final int USB_CLASS_PER_INTERFACE = 0;
public static final int USB_CLASS_AUDIO         = 1;  // Thiết bị âm thanh
public static final int USB_CLASS_COMM          = 2;  // Thiết bị truyền thông
public static final int USB_CLASS_HID           = 3;  // Bàn phím / Máy quét mã vạch HID
public static final int USB_CLASS_PHYSICA       = 5;  // Thiết bị vật lý
public static final int USB_CLASS_STILL_IMAGE   = 6;  // Camera / Ảnh tĩnh
public static final int USB_CLASS_PRINTER       = 7;  // Máy in USB (Máy in hóa đơn POS)
public static final int USB_CLASS_MASS_STORAGE  = 8;  // USB Flash / Thẻ nhớ
public static final int USB_CLASS_HUB           = 9;  // USB Hub
public static final int USB_CLASS_CDC_DATA      = 10; // CDC Communications (0x0a)
public static final int USB_CLASS_CSCID         = 11; // Đầu đọc thẻ Smart Card (0x0b)
public static final int USB_CLASS_CONTENT_SEC   = 13; // Security devices (0x0d)
public static final int USB_CLASS_VIDEO         = 14; // USB Camera / Video (0x0e)
public static final int USB_CLASS_WIRELESS_CONTROLLER = 224; // Wireless (0xe0)
public static final int USB_CLASS_MISC          = 239; // Miscellaneous (0xef)
public static final int USB_CLASS_APP_SPEC      = 254; // Application Specific (0xfe)
public static final int USB_CLASS_VENDOR_SPEC   = 255; // Vendor Specific (0xff - EDC/Serial)
```

### 4. Cơ chế duy trì quyền (Permission Retention Rule)

- Khi dialog xin quyền hiển thị lần đầu, tích chọn **"Use by default for this USB device"** (Bắt buộc người dùng chọn thủ công 1 lần đầu tiên, không thể bypass bằng code do cơ chế bảo mật của Android).
- Sau khi tích chọn, nhờ có `device_filter.xml` và `USB_DEVICE_ATTACHED`, ứng dụng sẽ tự động được cấp quyền ở các lần cắm/rút tiếp theo cũng như sau khi khởi động lại máy (Reboot).

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc nhận dạng thiết bị USB attached intent và kiểm tra `launchMode="singleTop"` không tạo ra instance mới của Activity.
- **Modules Kiểm thử**: `UsbAttachedReceiver`, `UsbDeviceFilterConfig`, `MainActivity`.
- **Seam Strategy**: Sử dụng `IUsbPermissionManager` để mock sự kiện `USB_DEVICE_ATTACHED` Broadcast Intent trong Unit Test.

## Out of Scope

- Lấy quyền USB hoàn toàn bằng mã nguồn không qua xác nhận dialog người dùng ở lần cắm đầu tiên (Bị cấm bởi chính sách an ninh Android).
- Tự động khắc phục dây cáp USB lỏng hoặc chập chập tín hiệu phần cứng.

## Further Notes

- Resource Demo ủy quyền USB từ SUNMI CDN: http://ota.cdn.sunmi.com/DOC/resource/re_cn/USB%E6%8E%88%E6%9D%83%E5%BC%B9%E7%AA%97demo.zip
