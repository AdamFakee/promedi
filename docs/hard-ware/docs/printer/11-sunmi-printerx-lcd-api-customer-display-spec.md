# SUNMI PrinterX LcdApi Customer Display Control Specification

## Proposed Seam

- **LcdApiDriver Seam (`ILcdApiDriver`)**: Seam nằm ở interface `printer.lcdApi()`. Interface này bao bọc các phương thức điều khiển màn hình hiển thị phụ cho khách hàng (Customer LCD Display): `config(Command)`, `showText`, `showTexts`, `showBitmap`, và `showDigital`. Seam giúp giả lập dữ liệu hiển thị trên màn hình phụ và mock trạng thái nguồn/bộ nhớ LCD trong unit test mà không cần phần cứng màn hình thật.

## Problem Statement

Các điểm bán hàng (POS) quầy thu ngân trên các thiết bị SUNMI có màn hình phụ (như T1 MINI, T2 MINI, D3 MINI, D3 PRO) cần hiển thị thông tin giá tiền, tổng số tiền thanh toán, hình ảnh logo khuyến mãi, hoặc lời chào cho khách hàng trong quá trình thanh toán. Các loại màn hình phụ có đặc tính kỹ thuật khác nhau (Màn hình đồ họa 128x40 Dots LCD vs Màn hình LED 7 đoạn 7-Segment). Việc không nắm rõ sự phân biệt API giữa 2 loại màn hình phụ gây lỗi không hiển thị hoặc tràn nội dung màn hình.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `LcdApi` thuộc SUNMI PrinterX SDK. Tài liệu phân loại các nhóm hàm theo từng chủng loại màn hình phụ (128x40 Dots LCD cho T1/T2 MINI vs Segment Screen cho D3 MINI/D3 PRO), hướng dẫn gửi lệnh hệ thống `config(Command)`, và cung cấp mã nguồn mẫu Java hoàn chỉnh cho hiển thị giá tiền và ảnh logo.

## User Stories

1. As a Retail Cashier App Developer, I want to display the transaction total on a 7-segment display using `showDigital("150.00")`, so that customers can see the payment amount clearly on D3 MINI devices.
2. As a Fast Food Restaurant POS Developer, I want to show item names and order numbers on a 128x40 Dots LCD using `showText()` and `showTexts()`, so that customers on T2 MINI terminals see order progress.
3. As a Marketing Manager, I want to display promotional 128x40 logos via `showBitmap()`, so that idle customer screens show store branding.

## Implementation Decisions

### 1. Phân loại Chủng loại Màn hình Phụ & Thiết bị Hỗ trợ

| Nhóm Màn hình Phụ           | Thiết bị Hỗ trợ tiêu biểu | Phương thức Điều khiển Khả dụng                                                  |
| :-------------------------- | :------------------------ | :------------------------------------------------------------------------------- |
| **Lệnh Hệ thống Chung**     | Tất cả thiết bị có LCD    | `config(Command command)` (`INIT`, `WAKE`, `SLEEP`, `CLEAR`)                     |
| **128x40 Dots Graphic LCD** | SUNMI T1 MINI, T2 MINI    | `showText(text, size, fill)`, `showTexts(text[], align[])`, `showBitmap(bitmap)` |
| **7-Segment Price Display** | SUNMI D3 MINI, D3 PRO     | `showDigital(String digital)` (Hiển thị giá tối đa 7 chữ số 0-9, A-Z, dấu `.`)   |

---

### 2. Lệnh Cấu hình Hệ thống màn hình phụ (`config(Command)`)

- `Command.INIT`: Khởi tạo màn hình LCD.
- `Command.WAKE`: Thức dậy màn hình LCD (Bật đèn nền).
- `Command.SLEEP`: Đưa màn hình LCD vào chế độ ngủ đông.
- `Command.CLEAR`: Xóa toàn bộ nội dung đang hiển thị trên màn hình LCD.

---

### 3. Sample Code - Hiển thị trên Màn hình Đồ họa 128x40 Dots LCD (T1 MINI, T2 MINI)

```java
package com.sm.sdk.demo.printerx;

import android.graphics.Bitmap;
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;
import com.sunmi.printerx.enums.Command;

public class GraphicLcdManager {

    /**
     * Hiển thị văn bản đơn dòng hoặc đa dòng trên màn hình phụ 128x40 Dots
     */
    public void displayCustomerMessage(String message) {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null) return;

        try {
            // 1. Thức dậy và Xóa màn hình phụ
            printer.lcdApi().config(Command.WAKE);
            printer.lcdApi().config(Command.CLEAR);

            // 2. Hiển thị văn bản đơn dòng với font size 28 (Độ dài hiển thị max = 128 / size)
            // fill = false (Không kéo giãn chiều cao văn bản)
            printer.lcdApi().showText(message, 28, false);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Hiển thị danh sách 2 dòng văn bản kèm tỷ lệ khoảng cách dòng
     */
    public void displayMultiLineOrder(String line1, String line2) {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null) return;

        try {
            String[] lines = new String[]{line1, line2};
            int[] alignRatio = new int[]{1, 1}; // Tỷ lệ giãn dòng 1:1

            printer.lcdApi().showTexts(lines, alignRatio);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Hiển thị ảnh Bitmap logo 128x40 pixels trên màn hình phụ
     */
    public void displayLogoBitmap(Bitmap logo128x40) {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null || logo128x40 == null) return;

        try {
            printer.lcdApi().showBitmap(logo128x40);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

---

### 4. Sample Code - Hiển thị Giá tiền trên Màn hình LED 7-Segment (D3 MINI, D3 PRO)

```java
package com.sm.sdk.demo.printerx;

import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;

public class SegmentLcdManager {

    /**
     * Hiển thị số tiền thanh toán trên màn hình 7 đoạn (Tối đa 7 ký tự 0-9, A-Z và dấu .)
     *
     * @param priceText Ví dụ: "125.00" hoặc "99000"
     */
    public void displayPriceToCustomer(String priceText) {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null || priceText == null) return;

        try {
            // Truyền chuỗi giá tiền hiển thị lên màn hình LED 7 đoạn
            printer.lcdApi().showDigital(priceText);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `showDigital` khi truyền chuỗi chữ số hợp lệ không gây crash app.
- **Modules Kiểm thử**: `GraphicLcdManager`, `SegmentLcdManager`.
- **Seam Strategy**: Giả lập `ILcdApiDriver` để mock hai nhóm hàm `showText` và `showDigital` trong Unit Test.

## Out of Scope

- Phát lại video hoặc hoạt họa đồ họa 3D chuyển động trên màn hình LCD 128x40 nhỏ.
- Tự động thay đổi phần cứng màn hình LCD giữa các dòng máy không hỗ trợ.

## Further Notes

- **Lưu ý kích thước ảnh**: Khi dùng `showBitmap()`, hình ảnh nạp vào phải có kích thước đúng `128x40` pixels để tránh bị méo hoặc tràn khung hiển thị.
