# SUNMI Developer Onboarding & Environment Setup Specification

## Proposed Seam

- **PrinterServiceBinding Seam (`InnerPrinterCallback`)**: Seam nằm ở phần callback của `InnerPrinterManager.getInstance().bindService()`. Toàn bộ thao tác bind/unbind dịch vụ hệ thống SUNMI OS được điều hướng qua interface callback này để hỗ trợ mock trạng thái kết nối `onConnected(service)` và `onDisconnected()` trong môi trường test.

## Problem Statement

Các nhà phát triển mới gia nhập hệ sinh thái SUNMI gặp khó khăn trong việc thiết lập môi trường phát triển (Android Studio, Java/Kotlin, Gradle dependencies), quy trình đăng ký tài khoản Partner/Developer theo từng vùng địa lý (Global, US, EU), việc liên kết dịch vụ phần cứng không đồng bộ (`InnerPrinterManager`), và quy trình đẩy ứng dụng lên SUNMI App Store.

## Solution

Cung cấp đặc tả chuẩn hóa các bước Onboarding & Technical Setup cho ứng dụng chạy trên SUNMI OS. Giải pháp quy định chu trình phát triển từ giai đoạn mượn thiết bị thử nghiệm, đăng ký tài khoản phân vùng, tích hợp SDK dependencies, thực thi cơ chế asynchronous binding dịch vụ phần cứng, debugging qua ADB đến phát hành theo chính sách phân phối trên SUNMI Partner Platform.

## User Stories

1. As an Enterprise Developer, I want to register a regional SUNMI Partner Platform account (Global, US, EU), so that my organization complies with regional cloud and data privacy laws.
2. As a Developer, I want a standardized Gradle dependency (`com.sunmi:printerlibrary`), so that core printing APIs are available in my Android project.
3. As an Application Developer, I want an asynchronous service binding mechanism (`InnerPrinterCallback`), so that my app binds to SunmiPrinterService safely at startup without blocking the main UI thread.
4. As an Application Developer, I want to execute printing commands (`printText`), so that plain text and receipts can be rendered on physical SUNMI thermal printers.
5. As a QA Engineer, I want to debug apps via ADB over USB on physical SUNMI hardware, so that I can inspect logs (`Log.e`/`Log.w`) and verify real-time performance.
6. As a Product Manager, I want granular App Store distribution controls (scoping by Device Model, Region, or Merchant Account), so that app releases can be rolled out safely in phases.

## Implementation Decisions

- **SDK Dependency**: Khai báo `com.sunmi:printerlibrary:1.0.23` tại level module `build.gradle` (Android API Level 28+).
- **Asynchronous Service Binding**: Sử dụng `InnerPrinterManager` trong custom `Application` class để quản lý vòng đời kết nối với `SunmiPrinterService`.

_Snippet tham chiếu cơ chế Bind Service:_

```java
InnerPrinterManager.getInstance().bindService(context, new InnerPrinterCallback() {
    @Override
    protected void onConnected(SunmiPrinterService service) { sunmiPrinterService = service; }
    @Override
    protected void onDisconnected() { sunmiPrinterService = null; }
});
```

- **Null-Safe Execution**: Tất cả lệnh gọi phần cứng (`printerService.printText(text, null)`) phải bọc trong kiểm tra null-safety và try-catch log lỗi.
- **Phân vùng Partner Platform**: Hỗ trợ 3 Cloud Cluster chính: Global (`partner.sunmi.com`), US (`partner.us.sunmi.com`), EU (`partner.eu.sunmi.com`).
- **Chính sách phát hành**: Đóng gói APK chữ ký V2/V3 và định hình chính sách phân phối theo Device Model, Region hoặc Merchant Account ID.

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử trạng thái kết nối phần cứng và xử lý bất đồng bộ thông qua các callback sự kiện của Seam.
- **Modules Kiểm thử**: `MyApplication`, `PrinterServiceBinder`, `MainActivityPrintExecutor`.
- **Seam Strategy**: Giả lập hai trạng thái callback `onConnected` và `onDisconnected` để đảm bảo app xử lý an toàn cả khi `SunmiPrinterService` bị null hoặc mất kết nối đột ngột.

## Out of Scope

- Quy trình phê duyệt cấp phát thiết bị thử nghiệm vật lý tại kho phần cứng SUNMI.
- Quản lý tài chính và hợp đồng đại lý giữa Partner và SUNMI.

## Further Notes

- Tổng đài hỗ trợ kỹ thuật SUNMI: 400-6666-509 (9:00 - 18:00 UTC+8).
- Link tài liệu chính thức: https://docs.sunmi.com/en-US/ciczeghjk557/xdxmeghjk546
