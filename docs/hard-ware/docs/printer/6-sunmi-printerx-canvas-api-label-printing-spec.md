# SUNMI PrinterX CanvasApi Label & Black Mark Printing Specification

## Proposed Seam

- **CanvasApiDriver Seam (`ICanvasApiDriver`)**: Seam nằm ở interface `printer.canvasApi()`. Interface này bao bọc toàn bộ 7 phương thức vẽ và in tem nhãn theo tọa độ Canvas (`initCanvas`, `renderText`, `renderBarCode`, `renderQrCode`, `renderBitmap`, `renderArea`, `printCanvas`). Seam hỗ trợ giả lập khung vẽ Canvas 2D, kiểm thử tính toán vị trí tọa độ X/Y, và mock các sự kiện chờ bóc tem (`label not removed`) trong unit test.

## Problem Statement

Các ứng dụng tem nhãn mã vạch (Barcode label), nhãn giá sản phẩm (Price tag), tem trà sữa/cà phê (Beverage label) và tem nhãn đánh dấu đen (Black mark) trên thiết bị SUNMI đòi hỏi khả năng thiết kế tự do theo tọa độ X/Y 2D. Nếu sử dụng `LineApi` dạng dòng thông thường, tem nhãn không thể xoay góc 90°/270°, không thể vẽ khung viền (Box/Circle), và không thể tự định vị vị trí cắt/bóc nhãn. Ngoài ra, việc quên chuyển máy in sang chế độ Label Mode sẽ làm tem bị trượt vị trí in.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CanvasApi` thuộc SUNMI PrinterX SDK. Tài liệu hướng dẫn luồng chuyển đổi chế độ in Label/Black Mark (`com.sunmi.printer.settings`), phương pháp khởi tạo kích thước Canvas (`initCanvas`), tọa độ vẽ tuyệt đối X/Y cho Text, Barcode, QR Code, Bitmap và hình học `AreaStyle` (`BOX`, `RECT_FILL`, `CIRCLE`, `PATH`), cùng mã nguồn mẫu Java cho thiết kế nhãn hoàn chỉnh và xử lý phát hiện tem chờ bóc (Label removal detection trên S2LCC).

## User Stories

1. As a Retail Label Developer, I want to define a 330x330px canvas using `initCanvas`, so that price labels with borders, titles, QR codes, and barcodes are drawn with pixel accuracy.
2. As a Coffee Shop Cashier, I want label print jobs to align automatically to black mark gaps, so that cup labels do not drift after printing hundreds of orders.
3. As a Hardware Operator, I want the SDK to handle label removal events (`PrintResult` callback & `NORMAL_ACTION` broadcast), so that the printer waits for the cashier to peel off the current label before printing the next one.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `CanvasApi`

| Tên Phương thức                | Mô tả Chức năng                                                                                                 |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `initCanvas(style)`            | Khởi tạo chiều rộng/chiều cao Canvas 2D (`BaseStyle` hoặc `LabelStyle`).                                        |
| `renderText(text, style)`      | Vẽ văn bản tại tọa độ X/Y chỉ định (`setPosX`, `setPosY`, `setTextSize`, `setRotate`).                          |
| `renderBarCode(code, style)`   | Vẽ mã vạch Barcode tại tọa độ X/Y (`setSymbology`, `setDotWidth`, `setBarHeight`).                              |
| `renderQrCode(text, style)`    | Vẽ mã QR Code tại tọa độ X/Y (`setDot`, `setErrorLevel`).                                                       |
| `renderBitmap(bitmap, style)`  | Vẽ hình ảnh Bitmap tại tọa độ X/Y (`setAlgorithm`, `setValue`).                                                 |
| `renderArea(format)`           | Vẽ các hình học đặc biệt (`AreaStyle`: Khung viền BOX, Hình chữ nhật RECT, Hình tròn CIRCLE, Đường thẳng PATH). |
| `printCanvas(count, listener)` | Thực thi lệnh in Canvas với số lượng bản in `count` (Trả về `PrintResult`).                                     |

---

### 2. Chuyển Chế độ Máy in sang Label / Black Mark Mode

Để `CanvasApi` hoạt động chính xác, cần kích hoạt máy in ở chế độ Label hoặc Black Mark Mode (Print Service >= 6.6.32):

```java
import android.content.Intent;
import android.os.Bundle;

public void switchToLabelMode(Context context) {
    Intent intent = new Intent();
    intent.setAction("com.sunmi.printer.settings");
    intent.setPackage("woyou.aidlservice.jiuiv5");
    Bundle bundle = new Bundle();
    bundle.putInt("item", 1); // 1: Chuyển sang chế độ Label/Black Mark
    intent.putExtras(bundle);
    if (intent.resolveActivity(context.getPackageManager()) != null) {
        context.startActivity(intent);
    }
}
```

---

### 3. Sample Code - Vẽ Tem Nhãn Hoàn Chỉnh (Box + Title + QR + Text + Barcode)

```java
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;
import com.sunmi.printerx.style.BaseStyle;
import com.sunmi.printerx.style.AreaStyle;
import com.sunmi.printerx.style.TextStyle;
import com.sunmi.printerx.style.QrStyle;
import com.sunmi.printerx.style.BarcodeStyle;
import com.sunmi.printerx.enums.Shape;
import com.sunmi.printerx.enums.Align;
import com.sunmi.printerx.enums.ErrorLevel;

public void printCompleteLabel() {
    Printer printer = PrinterSdk.getInstance().getPrinter();
    if (printer == null) return;

    try {
        // 1. Khởi tạo Kích thước Canvas 330px x 330px
        printer.canvasApi().initCanvas(BaseStyle.getStyle().setWidth(330).setHeight(330));

        // 2. Vẽ Khung Viền Bao Quanh Tem (Hollow Rectangle BOX)
        printer.canvasApi().renderArea(AreaStyle.getStyle()
            .setStyle(Shape.BOX)
            .setPosX(0).setPosY(0)
            .setWidth(330).setHeight(330)
            .setThick(2));

        // 3. Vẽ Tiêu đề Tem (Căn giữa tại X=165, Y=5)
        printer.canvasApi().renderText("TEM TRÀ SỮA PHÚC LONG", TextStyle.getStyle()
            .setPosX(165).setPosY(5)
            .setTextSize(26)
            .setAlign(Align.CENTER)
            .enableBold(true));

        // 4. Vẽ Mã QR Code tại góc trái (X=5, Y=35, Size=120x120)
        printer.canvasApi().renderQrCode("123456789", QrStyle.getStyle()
            .setPosX(5).setPosY(35)
            .setWidth(120).setHeight(120)
            .setErrorLevel(ErrorLevel.M));

        // 5. Vẽ Văn bản Chi tiết bên phải Mã QR (X=135, Y=35, Width=190, Height=120)
        printer.canvasApi().renderText("Size: L\nĐường: 50%\nĐá: 100%\nTopping: Thạch Trái Cây", TextStyle.getStyle()
            .setPosX(135).setPosY(35)
            .setWidth(190).setHeight(120)
            .setTextSize(20));

        // 6. Vẽ Mã vạch Barcode bên dưới (X=15, Y=180, Width=300, Height=120)
        printer.canvasApi().renderBarCode("89345678", BarcodeStyle.getStyle()
            .setPosX(15).setPosY(180)
            .setWidth(300).setHeight(120));

        // 7. Thực thi in 1 bản tem
        printer.canvasApi().printCanvas(1, null);

    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

### 4. Sample Code - In Tem Trắng (Blank Label) & Phát hiện Tem Chờ Bóc (S2LCC Model)

```java
import com.sunmi.printerx.api.PrintResult;

public void printBlankLabelWithPeelDetection() {
    Printer printer = PrinterSdk.getInstance().getPrinter();
    if (printer == null) return;

    try {
        // 1. Khởi tạo Canvas trống 330px x 330px
        printer.canvasApi().initCanvas(BaseStyle.getStyle().setWidth(330).setHeight(330));

        // 2. In 1 bản tem kèm lắng nghe trạng thái bóc tem (S2LCC Model support)
        printer.canvasApi().printCanvas(1, new PrintResult() {
            @Override
            public void onResult(int resultCode, String message) {
                if (resultCode == 0) {
                    // Tem in thành công
                } else {
                    // Nếu resultCode báo lỗi tem chưa được bóc (Label not removed),
                    // Gọi queryApi() để kiểm tra và nhắc người dùng bóc tem trước khi in bản tiếp theo.
                }
            }
        });
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

### 5. Bảng Tra Cứu Enums Hình Học `Shape` (`AreaStyle`)

| Tên Enum Shape | Mô tả Hình vẽ                                         |
| :------------- | :---------------------------------------------------- |
| `RECT_FILL`    | Hình chữ nhật đặc màu đen (Filled Black Rectangle)    |
| `RECT_WHITE`   | Hình chữ nhật xóa trắng (Erase White Rectangle)       |
| `RECT_REVERSE` | Hình chữ nhật đảo ngược màu (Reverse Color Rectangle) |
| `BOX`          | Khung hình chữ nhật rỗng viền (Hollow Rectangle)      |
| `CIRCLE`       | Hình tròn rỗng viền (Hollow Circle)                   |
| `OVAL`         | Hình bầu dục rỗng viền (Hollow Ellipse)               |
| `PATH`         | Đường thẳng nối từ `(posX, posY)` đến `(endX, endY)`  |

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `renderText` và `renderBarCode` khi truyền tọa độ X/Y vượt quá chiều rộng/chiều cao Canvas không gây crash ứng dụng.
- **Modules Kiểm thử**: `CanvasLabelRenderer`, `BeverageLabelBuilder`, `LabelPeelStatusDetector`.
- **Seam Strategy**: Giả lập `ICanvasApiDriver` để kiểm tra mảng cấu trúc hình vẽ nạp qua Canvas trước khi gửi lệnh `printCanvas` trong Unit Test.

## Out of Scope

- Tự động thay đổi độ rộng cuộn giấy tem nhãn vật lý bên trong khay đựng giấy.
- In tem nhãn mã vạch màu 3D đa lớp.

## Further Notes

- **Lưu ý vị trí đọc HRI Barcode trên Label**: Khác với in hóa đơn, vị trí đọc HRI barcode trên tem nhãn hỗ trợ: `POS_ONE` (Dưới bên trái), `POS_TWO` (Dưới căn giữa), `POS_THREE` (Dưới bên phải).
