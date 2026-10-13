# SUNMI PrinterX SDK Overview & Architecture Specification

## Proposed Seam

- **PrinterXSdk Seam (`IPrinterXController`)**: Seam nằm ở phần lắng nghe phát hiện máy in bất đồng bộ `PrinterSdk.getInstance().getPrinter(context, PrinterListen)`. Seam này bọc 7 bộ Sub-API (`QueryApi`, `CommandApi`, `LineApi`, `CanvasApi`, `FileApi`, `CashDrawerApi`, `LcdApi`), hỗ trợ mock sự kiện phát hiện máy in (`onDefPrinter`, `onPrinters`) và kiểm thử các tính năng in ấn trong unit test mà không cần phần ứng máy in thật.

## Problem Statement

SUNMI thế hệ mới nâng cấp hệ thống in ấn lên kiến trúc `PrinterX` (`com.sunmi:printerx`), phân chia các tác vụ in ấn thành 7 bộ Sub-API chuyên biệt (LineApi cho hóa đơn, CanvasApi cho tem nhãn, FileApi cho tài liệu, CashDrawerApi cho két tiền, LcdApi cho màn hình hiển thị phụ...). Nếu không có tài liệu đặc tả cấu trúc SDK mới và mã nguồn mẫu chuẩn, lập trình viên sẽ gặp khó khăn khi quản lý danh sách nhiều máy in kết nối đồng thời, cấu hình tham số toàn cục (Density, FontType, Speed), hoặc chuyển đổi qua giao diện Cài đặt hệ thống.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `SUNMI PrinterX SDK` (phiên bản `1.0.20` trở lên). Tài liệu hướng dẫn tích hợp dependency Gradle, quy trình kết nối bất đồng bộ qua `PrinterListen`, phân loại 7 Sub-APIs chuyên dụng, các hàm thiết lập thuộc tính máy in toàn cục (`setSunmiPrinterDensity`, `setSunmiPrinterFontType`, `setSunmiPrinterSpeed`, `setSunmiPrinterAlert`), và quản lý giải phóng tài nguyên `destroy()`.

## User Stories

1. As an Application Developer, I want to discover connected printers asynchronously via `PrinterListen` (`onDefPrinter` & `onPrinters`), so that my app handles both built-in and external SUNMI printers dynamically.
2. As a Multi-Store POS Architect, I want to route jobs to specific Sub-APIs (`LineApi` for receipts, `CanvasApi` for labels, `CashDrawerApi` for drawers), so that code responsibilities are clean and decoupled.
3. As a System Admin, I want to configure global printer properties (`Density`, `FontType`, `Speed`, `Alerts`), so that print output quality is optimized across all devices.
4. As a UI/UX Developer, I want to navigate users to SUNMI system printer settings (`startSettings`), so that cashiers can adjust paper size or density directly in system UI.

## Implementation Decisions

### 1. Tích hợp Dependency & Khởi tạo PrinterX SDK

#### Gradle Dependency (`app/build.gradle`):

```groovy
dependencies {
    // SUNMI PrinterX SDK thế hệ mới
    implementation 'com.sunmi:printerx:1.0.20'
}
```

---

### 2. Sample Code - Quy trình Phát hiện & Lấy đối tượng Máy In (`getPrinter`)

```java
package com.sm.sdk.demo.printerx;

import android.content.Context;
import android.util.Log;
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.PrinterSdk.PrinterListen;
import com.sunmi.printerx.Printer;
import java.util.List;

public class PrinterXManager {

    private static final String TAG = "PrinterXManager";
    private static PrinterXManager instance;
    private Printer defaultPrinter;
    private List<Printer> availablePrinters;

    private PrinterXManager() {}

    public static synchronized PrinterXManager getInstance() {
        if (instance == null) {
            instance = new PrinterXManager();
        }
        return instance;
    }

    /**
     * Bật log debug SDK (Khuyên dùng khi dev, nên tắt khi release)
     */
    public void enableSdkLogging(boolean enable) {
        PrinterSdk.getInstance().log(enable, "PrinterXDebug");
    }

    /**
     * Khởi tạo và lắng nghe danh sách máy in bất đồng bộ
     */
    public void initPrinterSdk(Context context) {
        PrinterSdk.getInstance().getPrinter(context, new PrinterListen() {
            @Override
            public void onDefPrinter(Printer printer) {
                // Máy in mặc định (Thường là máy in nhiệt tích hợp sẵn của SUNMI)
                defaultPrinter = printer;
                Log.d(TAG, "Default printer connected: " + (printer != null ? printer.toString() : "null"));
            }

            @Override
            public void onPrinters(List<Printer> printers) {
                // Danh sách tất cả máy in đang kết nối với thiết bị (Built-in, USB, Network, Cloud)
                availablePrinters = printers;
                Log.d(TAG, "Available printers count: " + (printers != null ? printers.size() : 0));
            }
        });
    }

    public Printer getDefaultPrinter() {
        return defaultPrinter;
    }

    /**
     * Giải phóng tài nguyên SDK khi ứng dụng đóng
     */
    public void destroySdk() {
        PrinterSdk.getInstance().destroy();
        defaultPrinter = null;
        availablePrinters = null;
    }
}
```

---

### 3. Danh sách 7 Sub-APIs chuyên dụng trên đối tượng `Printer`

| Tên Sub-API       | Đối tượng API             | Mô tả chức năng                                                   |
| :---------------- | :------------------------ | :---------------------------------------------------------------- |
| **QueryApi**      | `printer.queryApi()`      | Truy vấn thông số kỹ thuật, trạng thái phần cứng máy in           |
| **CommandApi**    | `printer.commandApi()`    | Gửi trực tiếp mảng lệnh in thô (RAW Commands)                     |
| **LineApi**       | `printer.lineApi()`       | Chuyên dụng in hóa đơn bán hàng theo từng dòng (Receipt printing) |
| **CanvasApi**     | `printer.canvasApi()`     | Chuyên dụng in tem nhãn hàng hóa trên Canvas (Label printing)     |
| **FileApi**       | `printer.fileApi()`       | In file văn bản / tài liệu trực tiếp                              |
| **CashDrawerApi** | `printer.cashDrawerApi()` | Kích hoạt điều khiển két tiền thu ngân                            |
| **LcdApi**        | `printer.lcdApi()`        | Điều khiển màn hình hiển thị phụ cho khách (Customer LCD Display) |

---

### 4. Sample Code - Chuyển sang Trang Cài Đặt Hệ Thống Máy In (`startSettings`)

_Yêu cầu bản Service In > 6.6.32_

```java
import android.app.Activity;
import com.sunmi.printerx.enums.SettingItem;

public void openPrinterSettings(Activity activity, SettingItem item) {
    // SettingItem: TYPE, DENSITY, PAPER, FONT, ALL
    boolean launched = PrinterSdk.getInstance().startSettings(activity, item);
    if (!launched) {
        // Bản Service in hiện tại cũ hơn 6.6.32
    }
}
```

---

### 5. Sample Code - Cấu hình Tham số Máy in Toàn cục (`PrinterSdk Global Settings`)

_Yêu cầu bản Service In > 6.11.23_

#### 5.1 Đặt Độ đậm In Toàn cục (`setSunmiPrinterDensity`)

```java
// Density Range: 70% đến 130%
// Enum: Density.DENSITY_70, DENSITY_100, DENSITY_130...
PrinterSdk.getInstance().setSunmiPrinterDensity(context, Density.DENSITY_100);
```

#### 5.2 Đặt Phông chữ Toàn cục (`setSunmiPrinterFontType`)

```java
// FontType Enum:
// Default (0): Phông chữ mặc định
// SunmiFont1 (1): Hỗ trợ chữ Latin
// SunmiFont2 (2): Hỗ trợ hầu hết ký tự Unicode
// SunmiFont3 (3): Hỗ trợ Unicode mịn và chi tiết hơn
PrinterSdk.getInstance().setSunmiPrinterFontType(context, FontType.SunmiFont2);
```

#### 5.3 Đặt Tốc độ In (`setSunmiPrinterSpeed` - Dành riêng cho máy Financial)

```java
// Speed Enum: LOW (0), MEDIUM (1), HIGH (2)
PrinterSdk.getInstance().setSunmiPrinterSpeed(context, Speed.HIGH);
```

#### 5.4 Đặt Cảnh báo Lỗi Máy in (`setSunmiPrinterAlert` & `setSunmiPrinterBootAlert`)

```java
// Bật popup cảnh báo khi máy in gặp sự cố (Hết giấy, nắp mở...)
PrinterSdk.getInstance().setSunmiPrinterAlert(context, true);

// Bật cảnh báo kiểm tra máy in khi khởi động máy
PrinterSdk.getInstance().setSunmiPrinterBootAlert(context, true);
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `PrinterSdk.getInstance().destroy()` giải phóng bộ nhớ và hủy listener an toàn.
- **Modules Kiểm thử**: `PrinterXManager`, `GlobalPrinterConfigurator`, `SubApiRouter`.
- **Seam Strategy**: Giả lập `IPrinterXController` để mock hai sự kiện callback `onDefPrinter` và `onPrinters` với danh sách 0 hoặc nhiều máy in trong Unit Test.

## Out of Scope

- Gọi các Sub-API không tương thích với loại máy in (ví dụ: Gọi `CanvasApi` tem nhãn trên máy in Laser thông thường sẽ ném ngoại lệ SDK Exception).
- Thay đổi thuộc tính phần cứng cứng ngoài các enum hợp lệ của `PrinterSdk`.

## Further Notes

- **Demo tham khảo chính thức**:
  - GitHub: https://github.com/shangmisunmi/SunmiPrinterXSample
  - Gitee: https://gitee.com/kaltin/SunmiPrinterXSample
