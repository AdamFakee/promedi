# SUNMI Flutter LineApi Thermal Receipt Printing Specification

## Proposed Seam

- **FlutterLineApiDriver Seam (`IFlutterLineApiDriver`)**: Seam nằm ở interface `printer.lineApi`. Interface này bao bọc 11 phương thức Future-based trong Flutter Dart dùng để in hóa đơn bán hàng theo từng dòng (`initLine`, `addText`, `printText`, `printTexts`, `printBarCode`, `printQrCode`, `printBitmap`, `printDividingLine`, `autoOut`, `enableTransMode`, `printTrans`). Seam hỗ trợ mock dữ liệu Future và kiểm thử logic in ấn hóa đơn trong các bài test tự động cho ứng dụng Flutter POS.

## Problem Statement

Các ứng dụng bán hàng POS viết bằng Flutter (Dart) trên máy SUNMI cần in hóa đơn theo dòng với cấu trúc phức tạp: dòng tiêu đề căn giữa, bảng danh sách món ăn phân chia cột tỷ lệ (ví dụ `[1, 1, 1]`), mã vạch Barcode, mã QR VietQR, logo hình ảnh nạp từ Flutter assets (`Uint8List`), và tự động đẩy/cắt giấy `autoOut()`. Việc quên thêm ký tự xuống dòng `\n` khi gọi `addText()` hoặc xử lý sai luồng bất đồng bộ trong Transaction Mode có thể gây đè dòng hoặc ngưng máy in.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `LineApi` thuộc SUNMI Flutter Printer SDK (`sunmi_flutter_plugin_printer`). Tài liệu chuẩn hóa 11 hàm Future-based, hướng dẫn nạp ảnh từ Flutter Asset Bundle sang `Uint8List`, in bảng phân cột (`printTexts`), in hai màu đỏ/đen (`RenderColor.RED`), và cung cấp mã nguồn mẫu Dart `async/await` an toàn cho luồng in hóa đơn POS.

## User Stories

1. As a Flutter POS Developer, I want to load image assets as `Uint8List` bytes using `rootBundle.load()`, so that store logos print smoothly on thermal receipts via `printBitmap()`.
2. As a Flutter Restaurant Developer, I want to print multi-column item tables using `printTexts(texts, ratio, styles)`, so that item names, quantities, and prices align accurately across columns.
3. As a Mobile Checkout Lead, I want to batch print commands using Transaction Mode (`enableTransMode`), so that print execution speed is maximized during peak hours.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `printer.lineApi` (Future-based trong Dart)

| Phương thức Dart API | Tham số nạp vào                              | Giá trị Trả về | Mô tả Chức năng                                               |
| :------------------- | :------------------------------------------- | :------------- | :------------------------------------------------------------ |
| `initLine`           | `(BaseStyle format)`                         | `Future<void>` | Khởi tạo cấu hình dòng in cơ bản (Căn lề, lề trái, màu sắc).  |
| `addText`            | `(String text, TextStyle style)`             | `Future<void>` | Nạp văn bản vào bộ đệm dòng (Bắt buộc chứa `\n` ở đoạn cuối). |
| `printText`          | `(String text, TextStyle style)`             | `Future<void>` | Thực thi in trực tiếp dòng văn bản ra máy in.                 |
| `printTexts`         | `(List<String>, List<int>, List<TextStyle>)` | `Future<void>` | In văn bản chia theo nhiều cột tỷ lệ cố định (Bảng hàng hóa). |
| `printBarCode`       | `(String code, BarcodeStyle style)`          | `Future<void>` | In mã vạch Barcode (Code128, EAN13...).                       |
| `printQrCode`        | `(String code, QrStyle style)`               | `Future<void>` | In mã vuông QR Code.                                          |
| `printBitmap`        | `(Uint8List bitmap, BitmapStyle style)`      | `Future<void>` | In hình ảnh nạp từ mảng byte `Uint8List`.                     |
| `printDividingLine`  | `(DividingLine style, int offset)`           | `Future<void>` | In đường kẻ phân cách (EMPTY, SOLID, DOTTED).                 |
| `autoOut`            | `()`                                         | `Future<void>` | Tự động đẩy giấy ra vị trí xé hoặc cắt giấy tự động.          |
| `enableTransMode`    | `(bool enable)`                              | `Future<void>` | Bật/Tắt chế độ Transaction Mode lưu đệm lệnh.                 |
| `printTrans`         | `(PrintResult listener)`                     | `Future<void>` | Gửi toàn bộ bộ đệm Transaction Mode để in siêu tốc.           |

---

### 2. Sample Code - In Hóa Đơn POS Phân Cột & Nạp Ảnh Asset Bằng Flutter (Dart)

```dart
import 'package:flutter/services.dart';
import 'package:sunmi_flutter_plugin_printer/sunmi_flutter_plugin_printer.dart' as sunmi;

public class FlutterReceiptPrinter {

  /// In hóa đơn bán hàng hoàn chỉnh bằng Flutter LineApi
  static Future<void> printCompleteFlutterReceipt(sunmi.Printer printer) async {
    final lineApi = printer.lineApi;

    try {
      // 1. Khởi tạo dòng in căn giữa
      await lineApi.initLine(
        sunmi.BaseStyle.getStyle().setAlign(sunmi.Align.CENTER),
      );

      // 2. In Ảnh Logo từ Flutter Assets (assets/images/logo.png)
      final ByteData byteData = await rootBundle.load('assets/images/logo.png');
      final Uint8List bitmapBytes = byteData.buffer.asUint8List();

      await lineApi.printBitmap(
        bitmapBytes,
        sunmi.BitmapStyle.getStyle()
            .setAlign(sunmi.Align.CENTER)
            .setAlgorithm(sunmi.ImageAlgorithm.BINARIZATION)
            .setValue(120)
            .setWidth(384)
            .setHeight(150),
      );

      // 3. In Tiêu đề Cửa hàng
      await lineApi.printText(
        "CỬA HÀNG FLUTTER POS\n",
        sunmi.TextStyle.getStyle().setTextSize(32).enableBold(true),
      );

      // 4. In Bảng Chi Tiết Món Ăn (Phân 3 cột tỷ lệ 2:1:1)
      final leftStyle = sunmi.TextStyle.getStyle().setAlign(sunmi.Align.LEFT);
      final centerStyle = sunmi.TextStyle.getStyle().setAlign(sunmi.Align.CENTER);
      final rightStyle = sunmi.TextStyle.getStyle().setAlign(sunmi.Align.RIGHT);

      await lineApi.printTexts(
        ["Tên Món", "SL", "Giá"],
        [2, 1, 1],
        [leftStyle, centerStyle, rightStyle],
      );

      await lineApi.printTexts(
        ["Bánh Mỳ Pâté", "2", "40.000"],
        [2, 1, 1],
        [leftStyle, centerStyle, rightStyle],
      );

      // 5. In Đường Kẻ Phân Cách & Mã QR VietQR
      await lineApi.printDividingLine(sunmi.DividingLine.EMPTY, 10);
      await lineApi.printDividingLine(sunmi.DividingLine.DOTTED, 2);
      await lineApi.printDividingLine(sunmi.DividingLine.EMPTY, 10);

      await lineApi.printQrCode(
        "https://vietqr.api/pay?acc=999999",
        sunmi.QrStyle.getStyle()
            .setDot(8)
            .setAlign(sunmi.Align.CENTER),
      );

      // 6. Tự động đẩy giấy và cắt giấy
      await lineApi.autoOut();

    } catch (e) {
      print("Lỗi khi in hóa đơn Flutter: $e");
    }
  }
}
```

---

### 3. Sample Code - Chế Độ Transaction Mode Trong Flutter (Dart)

```dart
class MyFlutterPrintResult extends sunmi.PrintResult {
  @override
  void onResult(int resultCode, String? message) {
    if (resultCode == 0) {
      print("In Transaction Flutter thành công!");
    } else {
      print("Lỗi Transaction Flutter: $message (code: $resultCode)");
    }
  }
}

Future<void> batchPrintTransactionFlutter(sunmi.Printer printer) async {
  final lineApi = printer.lineApi;

  try {
    // 1. Bật chế độ Transaction Mode
    await lineApi.enableTransMode(true);

    // 2. Nạp hàng loạt lệnh in
    await lineApi.addText("HÓA ĐƠN FLUTTER BATCH\n", sunmi.TextStyle.getStyle());
    await lineApi.addText("Món A x1\n", sunmi.TextStyle.getStyle());
    await lineApi.printText("Món B x2\n", sunmi.TextStyle.getStyle());
    await lineApi.autoOut();

    // 3. Gửi toàn bộ dữ liệu in và lắng nghe kết quả
    await lineApi.printTrans(MyFlutterPrintResult());

  } catch (e) {
    print("Lỗi trong Transaction: $e");
  } finally {
    // 4. Luôn tắt Transaction Mode
    await lineApi.enableTransMode(false);
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc nạp ảnh `Uint8List` không rỗng và truyền đúng định dạng mảng tỷ lệ `[1, 1, 1]` vào `printTexts`.
- **Modules Kiểm thử**: `FlutterReceiptPrinter`, `MyFlutterPrintResult`.
- **Seam Strategy**: Giả lập `IFlutterLineApiDriver` để mock kết quả trả về của `lineApi` trong Flutter Unit Test.

## Out of Scope

- Chuyển đổi định dạng ảnh SVG trực tiếp sang Uint8List mà không qua bộ render Bitmap.
- In 2 màu đỏ/đen (`RenderColor.RED`) trên đầu in nhiệt đơn sắc.

## Further Notes

- **Lưu ý addText() trong Dart**: Khi gọi `addText()`, chuỗi truyền vào bắt buộc phải chứa ký tự xuống dòng `\n` ở đoạn cuối hoặc sử dụng `printText()` ở câu lệnh cuối cùng để đẩy dòng in ra giấy.
