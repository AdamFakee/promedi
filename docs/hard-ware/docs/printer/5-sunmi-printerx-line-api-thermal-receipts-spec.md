# SUNMI PrinterX LineApi Thermal Receipts Specification

## Proposed Seam

- **LineApi Seam (`ILineApiDriver`)**: Seam nằm ở interface `printer.lineApi()`. Interface này bao bọc toàn bộ 10 phương thức dựng hóa đơn nhiệt theo dòng (`initLine`, `addText`, `printText`, `printTexts`, `printBarCode`, `printQrCode`, `printBitmap`, `printDividingLine`, `autoOut`, `enableTransMode`, `printTrans`). Seam cho phép kiểm thử logic sắp xếp cột, tính toán vị trí in và gom nhóm Transaction Mode trong unit test mà không cần đầu in phần cứng.

## Problem Statement

Các ứng dụng bán hàng POS và nhà hàng cần in hóa đơn thanh toán dạng dòng (Receipt line mode) với cấu trúc phức tạp: dòng tiêu đề in đậm căn giữa, bảng danh sách món ăn phân chia cột tỷ lệ (ví dụ: Tên món 2 cột : Số lượng 1 cột : Thành tiền 1 cột), mã vạch Barcode sản phẩm, mã QR chuyển khoản VietQR, đường kẻ đứt phân cách, và tự động đẩy/cắt giấy sau khi in xong. Việc thiếu đặc tả cú pháp và mã nguồn mẫu chuẩn cho `LineApi` trong `PrinterX SDK` dẫn đến sai lệch cột, lệch viền hoặc giảm tốc độ in khi in từng dòng riêng lẻ.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `LineApi` thuộc SUNMI PrinterX SDK. Tài liệu tổng hợp 10 phương thức in hóa đơn, quy định chi tiết các đối tượng Style (`LineStyle`, `TextStyle`, `BarcodeStyle`, `QrStyle`, `BitmapStyle`), hướng dẫn in cột đa kiểu (`printTexts`), thuật toán nén ảnh `ImageAlgorithm` (Binarization vs Dithering), và cơ chế Transaction Mode gom nhóm lệnh in để tăng tốc độ xử lý.

## User Stories

1. As a POS Developer, I want to print multi-column dish tables using `printTexts` with custom column width ratios (`{2, 1, 1}`), so that items, quantities, and prices align perfectly across 58mm and 80mm paper sizes.
2. As a Cashier, I want multi-styled text in a single line using `addText()` and `printText()`, so that order numbers can be printed in bold next to standard item names.
3. As a Mobile Payment Developer, I want to configure QR code dot sizes and error correction levels (`setErrorLevel`), so that banking QR codes scan quickly under varying lighting conditions.
4. As a High-Volume Store Manager, I want to enable Transaction Mode (`enableTransMode`), so that complex receipts are cached in memory and printed in one continuous high-speed pass.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `LineApi`

| Tên Phương thức                           | Mô tả Chức năng                                                                       |
| :---------------------------------------- | :------------------------------------------------------------------------------------ |
| `initLine(format)`                        | Khởi tạo cấu hình cơ bản cho dòng in (`BaseStyle` hoặc `LineStyle`).                  |
| `addText(text, style)`                    | Nạp văn bản vào bộ đệm dòng (Chưa in ngay, cho phép ghép nhiều kiểu chữ trên 1 dòng). |
| `printText(text, style)`                  | Thực thi in trực tiếp dòng văn bản ra giấy.                                           |
| `printTexts(texts, colsWidthArr, styles)` | In văn bản chia theo nhiều cột tỷ lệ cố định (Bảng hàng hóa).                         |
| `printBarCode(code, style)`               | In mã vạch Barcode (Code128, EAN13, Code39...).                                       |
| `printQrCode(code, style)`                | In mã vuông QR Code (Tùy chỉnh Error Level & Dot Size).                               |
| `printBitmap(bitmap, style)`              | In hình ảnh Bitmap (Thuật toán Binarization hoặc Dithering).                          |
| `printDividingLine(style, offset)`        | In đường kẻ phân cách (EMPTY, SOLID, DOTTED).                                         |
| `autoOut()`                               | Tự động đẩy giấy ra vị trí xé hoặc cắt giấy tự động.                                  |
| `enableTransMode(enable)`                 | Bật/Tắt chế độ Transaction Mode (Gom đệm lệnh in).                                    |
| `printTrans(listener)`                    | Gửi toàn bộ bộ đệm Transaction Mode để in liên tục.                                   |

---

### 2. Sample Code - Khởi tạo Style Dòng in (`LineStyle`)

```java
import com.sunmi.printerx.style.LineStyle;
import com.sunmi.printerx.enums.Align;
import com.sunmi.printerx.enums.Rotate;

public void setupLineStyle() {
    // 1. Cấu hình căn giữa dòng in
    LineStyle centerStyle = LineStyle.getStyle().setAlign(Align.CENTER);
    PrinterSdk.getInstance().getPrinter().lineApi().initLine(centerStyle);

    // 2. Cấu hình in xoay ngược 180 độ (Định dạng ngược cho Kiosk xoay màn hình)
    LineStyle rotateStyle = LineStyle.getStyle().setRotate(Rotate.ROTATE_180);
    PrinterSdk.getInstance().getPrinter().lineApi().initLine(rotateStyle);
}
```

---

### 3. Sample Code - In Văn Bản Đa Kiểu Chữ Trên Cùng 1 Dòng (`addText` & `printText`)

```java
import com.sunmi.printerx.style.TextStyle;

public void printCustomTextLine() {
    // Để ghép nhiều kiểu chữ trên cùng 1 dòng, dùng addText() nhiều lần và kết thúc bằng printText()

    // Đoạn 1: Chữ thường
    TextStyle normalStyle = TextStyle.getStyle().setTextSize(24);
    PrinterSdk.getInstance().getPrinter().lineApi().addText("Mon: ", normalStyle);

    // Đoạn 2: Chữ In đậm (Bold)
    TextStyle boldStyle = TextStyle.getStyle().setTextSize(24).enableBold(true);
    PrinterSdk.getInstance().getPrinter().lineApi().addText("Phở Bò Đặc Biệt", boldStyle);

    // Đoạn 3: Kết thúc dòng với gạch chân (Underline) và thực thi in dòng
    TextStyle underlineStyle = TextStyle.getStyle().setTextSize(24).enableUnderline(true);
    PrinterSdk.getInstance().getPrinter().lineApi().printText(" (x2)\n", underlineStyle);
}
```

---

### 4. Sample Code - In Bảng Danh Sách Hóa Đơn Phân Cột (`printTexts`)

```java
import com.sunmi.printerx.enums.Align;
import com.sunmi.printerx.style.TextStyle;

public void printOrderTable() {
    // Cấu hình Căn lề từng cột: Cột 1 (Trái), Cột 2 (Giữa), Cột 3 (Phải)
    TextStyle leftStyle   = TextStyle.getStyle().setAlign(Align.LEFT);
    TextStyle centerStyle = TextStyle.getStyle().setAlign(Align.CENTER);
    TextStyle rightStyle  = TextStyle.getStyle().setAlign(Align.RIGHT);

    String[]   dishNames  = new String[]{"Cà Phê Sữa", "2", "50.000"};
    int[]      columnRatio= new int[]{2, 1, 1}; // Tỷ lệ chiều rộng 2 : 1 : 1
    TextStyle[] colStyles = new TextStyle[]{leftStyle, centerStyle, rightStyle};

    // In hàng tiêu đề cột
    PrinterSdk.getInstance().getPrinter().lineApi().printTexts(
        new String[]{"Tên Món", "SL", "Thành Tiền"},
        columnRatio,
        colStyles
    );

    // In hàng chi tiết
    PrinterSdk.getInstance().getPrinter().lineApi().printTexts(dishNames, columnRatio, colStyles);
}
```

---

### 5. Sample Code - In Barcode & QR Code Thanh Toán (`printBarCode` & `printQrCode`)

```java
import com.sunmi.printerx.style.BarcodeStyle;
import com.sunmi.printerx.style.QrStyle;
import com.sunmi.printerx.enums.Symbology;
import com.sunmi.printerx.enums.HumanReadable;
import com.sunmi.printerx.enums.ErrorLevel;

public void printCodes() {
    // 1. In Mã vạch Barcode Code128 với ký tự hiển thị ở mép dưới
    BarcodeStyle barcodeStyle = BarcodeStyle.getStyle()
        .setSymbology(Symbology.CODE128)
        .setBarHeight(120)
        .setDotWidth(2)
        .setReadable(HumanReadable.POS_TWO) // HRI text nằm bên dưới
        .setAlign(Align.CENTER);

    PrinterSdk.getInstance().getPrinter().lineApi().printBarCode("893456789012", barcodeStyle);

    // 2. In Mã QR VietQR với mức sửa lỗi M (15%) và độ mịn 8dot
    QrStyle qrStyle = QrStyle.getStyle()
        .setDot(8)
        .setErrorLevel(ErrorLevel.M)
        .setAlign(Align.CENTER);

    PrinterSdk.getInstance().getPrinter().lineApi().printQrCode("https://vietqr.api/pay?acc=123456", qrStyle);
}
```

---

### 6. Sample Code - In Hình Ảnh Logo Bitmap & Đường Kẻ Phân Cách (`printBitmap` & `printDividingLine`)

```java
import android.graphics.Bitmap;
import com.sunmi.printerx.style.BitmapStyle;
import com.sunmi.printerx.enums.ImageAlgorithm;
import com.sunmi.printerx.enums.DividingLine;

public void printImageAndDivider(Bitmap logo) {
    // 1. Cấu hình in Logo với thuật toán Nhị phân hóa (Binarization)
    BitmapStyle bitmapStyle = BitmapStyle.getStyle()
        .setAlgorithm(ImageAlgorithm.BINARIZATION)
        .setValue(200) // Ngưỡng chuyển màu đen
        .setAlign(Align.CENTER);

    PrinterSdk.getInstance().getPrinter().lineApi().printBitmap(logo, bitmapStyle);

    // 2. In đường gạch nét đứt (DOTTED) khoảng cách 2px
    PrinterSdk.getInstance().getPrinter().lineApi().printDividingLine(DividingLine.EMPTY, 15);
    PrinterSdk.getInstance().getPrinter().lineApi().printDividingLine(DividingLine.DOTTED, 2);
    PrinterSdk.getInstance().getPrinter().lineApi().printDividingLine(DividingLine.EMPTY, 15);
}
```

---

### 7. Sample Code - Chế Độ Batch Transaction Mode Tăng Tốc Độ In (`enableTransMode`)

```java
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.api.PrintResult;

public void printBatchReceiptFast() {
    try {
        // 1. Bật chế độ Transaction Mode (Tất cả lệnh in sẽ được lưu vào RAM)
        PrinterSdk.getInstance().getPrinter().lineApi().enableTransMode(true);

        // 2. Nạp hàng loạt lệnh in
        printOrderTable();
        printCodes();

        // 3. Tự động đẩy/cắt giấy sau khi xong
        PrinterSdk.getInstance().getPrinter().lineApi().autoOut();

        // 4. Gửi toàn bộ dữ liệu in liên tục 1 lần duy nhất
        PrinterSdk.getInstance().getPrinter().lineApi().printTrans(new PrintResult() {
            @Override
            public void onResult(int resultCode, String message) {
                if (resultCode == 0) {
                    // In hóa đơn siêu tốc thành công
                } else {
                    // Lỗi trong quá trình in
                }
            }
        });

    } catch (Exception e) {
        e.printStackTrace();
    } finally {
        // Tắt chế độ Transaction Mode
        PrinterSdk.getInstance().getPrinter().lineApi().enableTransMode(false);
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `printTexts` với mảng `colsWidthArr` có tổng phần tử lớn hơn 0 và mảng dữ liệu khớp độ dài.
- **Modules Kiểm thử**: `LineApiFormatter`, `ReceiptTableRenderer`, `TransactionBatchPrinter`.
- **Seam Strategy**: Giả lập `ILineApiDriver` để kiểm định chuỗi mã nạp qua `addText` và `printText` trước khi gửi tới service in trong Unit Test.

## Out of Scope

- Vẽ tự do theo tọa độ pixel X/Y ngẫu nhiên (Tính năng thuộc về `CanvasApi` tem nhãn).
- In đa sắc RGB trên máy in nhiệt đơn sắc chuẩn.

## Further Notes

- **Lưu ý addText()**: Khi dùng `addText()`, chuỗi văn bản cuối cùng cần chứa ký tự xuống dòng `\n` hoặc dùng `printText()` ở đoạn cuối để đẩy dòng in ra giấy.
