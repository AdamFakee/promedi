# SUNMI Thermal Printer SDK Integration Specification

## Proposed Seam

- **SunmiPrinterService Seam (`ISunmiPrinterService`)**: Seam nằm ở phần kết nối bất đồng bộ `InnerPrinterManager.getInstance().bindService()`. Interface này bao bọc toàn bộ các lệnh in ấn (Text, Barcode, QR Code, Bitmap, LineWrap, CutPaper, OpenDrawer, sendRAWData ESC/POS). Seam cho phép giả lập phản hồi của máy in nhiệt và mock các trạng thái lỗi phần cứng (Hết giấy, Quá nhiệt, Mở nắp) trong unit test mà không cần máy in thật.

## Problem Statement

Các ứng dụng bán hàng POS và Kiosk thương mại trên thiết bị SUNMI cần in hóa đơn thanh toán, phiếu chế biến (Kitchen ticket), mã vạch sản phẩm, mã QR chuyển khoản ngân hàng (VietQR / Dynamic QR), và tự động bật két tiền (Cash Drawer). Nếu không có đặc tả chuẩn hóa và mã nguồn mẫu chi tiết cho SUNMI Printer SDK (`com.sunmi:printerlibrary`), lập trình viên dễ gặp các sự cố như: đơ ứng dụng do gọi lệnh khi service chưa bind xong, rò rỉ bộ nhớ khi in hình ảnh Bitmap lớn, hoặc mất nét in do sai định dạng ESC/POS.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho SUNMI Thermal Printer SDK trong thư mục `/docs/printer`. Tài liệu quy định luồng khởi tạo bất đồng bộ `InnerPrinterManager`, hướng dẫn định dạng căn lề (Left, Center, Right), kích thước phông chữ, in mã vạch / QR code, in ảnh logo Bitmap, cắt giấy tự động, kích két tiền, truyền lệnh RAW ESC/POS, và lắng nghe trạng thái máy in (Paper out, Head overheat, Cover open).

## User Stories

1. As a POS Developer, I want an asynchronous service binder (`InnerPrinterCallback`), so that my app binds to `SunmiPrinterService` safely on startup without freezing the UI.
2. As a Cashier, I want receipts to print quickly with clear formatted text, centered store logos, and bold totals, so that customers receive professional receipts.
3. As a Mobile Customer, I want dynamic payment QR codes printed on my bill, so that I can scan to pay at the table.
4. As a Store Owner, I want the printer to automatically cut the paper (`cutPaper`) and pop the cash drawer (`openDrawer`) upon payment completion, so that checkout speed is maximized.
5. As a Maintenance Technician, I want to query real-time printer status (`getPrinterStatus`), so that paper-out or cover-open warnings are alerted immediately.

## Implementation Decisions

### 1. Tích hợp Dependency & Binding Service (`InnerPrinterManager`)

#### Gradle Dependency (`app/build.gradle`):

```groovy
dependencies {
    // Core SUNMI Printer SDK
    implementation 'com.sunmi:printerlibrary:1.0.23'
}
```

#### Service Binding Architecture (`SunmiPrintManager.java`):

```java
package com.sm.sdk.demo.printer;

import android.content.Context;
import com.sunmi.peripheral.printer.InnerPrinterCallback;
import com.sunmi.peripheral.printer.InnerPrinterException;
import com.sunmi.peripheral.printer.InnerPrinterManager;
import com.sunmi.peripheral.printer.SunmiPrinterService;

public class SunmiPrintManager {

    private static SunmiPrintManager instance;
    private SunmiPrinterService sunmiPrinterService;
    private boolean isBound = false;

    private SunmiPrintManager() {}

    public static synchronized SunmiPrintManager getInstance() {
        if (instance == null) {
            instance = new SunmiPrintManager();
        }
        return instance;
    }

    public void bindPrinterService(Context context) {
        try {
            InnerPrinterManager.getInstance().bindService(context, new InnerPrinterCallback() {
                @Override
                protected void onConnected(SunmiPrinterService service) {
                    sunmiPrinterService = service;
                    isBound = true;
                }

                @Override
                protected void onDisconnected() {
                    sunmiPrinterService = null;
                    isBound = false;
                }
            });
        } catch (InnerPrinterException e) {
            e.printStackTrace();
        }
    }

    public SunmiPrinterService getPrinterService() {
        return sunmiPrinterService;
    }

    public boolean isBound() {
        return isBound && sunmiPrinterService != null;
    }
}
```

---

### 2. Sample Code - In Văn Bản & Định dạng Căn lề (Text & Alignment)

#### Hằng số Căn lề (Alignment Constants):

- `0`: Căn trái (Left)
- `1`: Căn giữa (Center)
- `2`: Căn phải (Right)

```java
public void printReceiptHeader(String storeName, String address, String phone) {
    SunmiPrinterService printer = SunmiPrintManager.getInstance().getPrinterService();
    if (printer == null) return;

    try {
        // 1. Căn giữa tiêu đề cửa hàng
        printer.setAlignment(1, null);
        printer.setFontSize(32f, null); // Font to cho tiêu đề
        printer.printTextWithFont(storeName + "\n", "", 32f, null);

        // 2. Căn giữa địa chỉ & số điện thoại
        printer.setFontSize(24f, null); // Font tiêu chuẩn
        printer.printText(address + "\n", null);
        printer.printText("Hotline: " + phone + "\n", null);

        // 3. Đường kẻ phân cách
        printer.printText("--------------------------------\n", null);

        // 4. Căn trái cho danh sách món ăn
        printer.setAlignment(0, null);
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

### 3. Sample Code - In Mã Vạch Barcode & Mã QR Code

```java
public void printBarcodeAndQR(String barcodeData, String qrData) {
    SunmiPrinterService printer = SunmiPrintManager.getInstance().getPrinterService();
    if (printer == null) return;

    try {
        printer.setAlignment(1, null); // Căn giữa mã in

        // 1. In Mã vạch Barcode (Code128)
        // symbology: 8 (CODE128), height: 100, width: 2, textPosition: 2 (Text bên dưới mã)
        printer.printBarCode(barcodeData, 8, 100, 2, 2, null);
        printer.lineWrap(1, null);

        // 2. In Mã QR Code (VietQR / Dynamic Payment QR)
        // modulesize: 6 (Kích thước ô QR 1-12), errorlevel: 3 (Error correction level)
        printer.printQRCode(qrData, 6, 3, null);
        printer.lineWrap(2, null);
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

### 4. Sample Code - In Hình Ảnh Logo Bitmap

```java
public void printStoreLogo(Bitmap logoBitmap) {
    SunmiPrinterService printer = SunmiPrintManager.getInstance().getPrinterService();
    if (printer == null || logoBitmap == null) return;

    try {
        printer.setAlignment(1, null); // Căn giữa Logo

        // In Bitmap trực tiếp (Tự động scale theo độ rộng giấy 58mm/80mm)
        printer.printBitmap(logoBitmap, null);
        printer.lineWrap(1, null);
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

### 5. Sample Code - Cắt Giấy, Đẩy Giấy & Mở Két Tiền (Cutter & Cash Drawer)

```java
public void finishReceiptAndOpenDrawer() {
    SunmiPrinterService printer = SunmiPrintManager.getInstance().getPrinterService();
    if (printer == null) return;

    try {
        // 1. Đẩy thêm 3 dòng giấy trống trước khi cắt
        printer.lineWrap(3, null);

        // 2. Cắt giấy tự động (Dành cho máy in có dao cắt tự động như T2, T3, D3)
        // 0: Full cut (Cắt đứt toàn bộ), 1: Partial cut (Cắt chừa mép)
        printer.cutPaper(null);

        // 3. Kích hoạt mở két tiền thu ngân (Cash Drawer)
        printer.openDrawer(null);
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

### 6. Sample Code - Truyền Lệnh Chuyên Sâu RAW ESC/POS Commands

```java
public void sendCustomEscPosBytes(byte[] rawEscPosCmds) {
    SunmiPrinterService printer = SunmiPrintManager.getInstance().getPrinterService();
    if (printer == null) return;

    try {
        // Truyền trực tiếp mảng byte ESC/POS vào máy in
        printer.sendRAWData(rawEscPosCmds, null);
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

### 7. Sample Code - Trích Xuất Trạng Thái Máy In (`getPrinterStatus`)

| Mã Trạng Thái (Status Code) | Trạng thái Máy In Nhiệt                      |
| :-------------------------- | :------------------------------------------- |
| `1`                         | Máy in hoạt động bình thường (Normal)        |
| `2`                         | Máy in đang cập nhật Firmware (Under update) |
| `3`                         | Máy in bị hết giấy (Out of paper)            |
| `4`                         | Máy in quá nhiệt (Overheated)                |
| `5`                         | Nắp máy in đang mở (Cover open)              |
| `6`                         | Cutter (Dao cắt) bị kẹt (Cutter error)       |
| `505`                       | Không tìm thấy máy in phần cứng (No printer) |

```java
public int checkPrinterStatus() {
    SunmiPrinterService printer = SunmiPrintManager.getInstance().getPrinterService();
    if (printer == null) return 505;

    try {
        // Lấy mã trạng thái máy in thời gian thực
        return printer.getPrinterStatus();
    } catch (Exception e) {
        e.printStackTrace();
        return -1;
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi các lệnh in luôn kiểm tra null-safety với `SunmiPrinterService`.
- **Modules Kiểm thử**: `SunmiPrintManager`, `ReceiptFormatter`, `BarcodeQrPrinter`, `PrinterStatusChecker`.
- **Seam Strategy**: Sử dụng `ISunmiPrinterService` mock để giả lập trạng thái lỗi `getPrinterStatus() = 3` (Hết giấy) hoặc `= 5` (Nắp máy in mở) để kiểm thử phản ứng thông báo lỗi trên UI trong Unit Test.

## Out of Scope

- Sửa đổi cơ chế điều khiển phần cứng của đầu in nhiệt (Thermal Printhead voltage/timing).
- In các định dạng file tài liệu phức tạp như PDF, DOCX trực tiếp mà không chuyển đổi thành Bitmap hoặc Plain Text.

## Further Notes

- Tùy theo dòng máy SUNMI (Khổ giấy 58mm như V2/V3/M2 vs Khổ giấy 80mm như T2/T3/D3), chiều rộng in Bitmap tối đa sẽ tự động được driver căn chỉnh.
