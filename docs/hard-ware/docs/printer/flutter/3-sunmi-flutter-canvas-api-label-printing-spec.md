# SUNMI Flutter CanvasApi Label Printing Specification

## Proposed Seam

- **FlutterCanvasApiDriver Seam (`IFlutterCanvasApiDriver`)**: Seam nằm ở interface `printer.canvasApi`. Interface này bao bọc 7 phương thức Future-based trong Flutter Dart dùng để vẽ và in tem nhãn theo tọa độ Canvas 2D (`initCanvas`, `renderText`, `renderBarCode`, `renderQrCode`, `renderBitmap`, `renderArea`, `printCanvas`). Seam cho phép giả lập hình vẽ 2D Canvas và mock kết quả callback `PrintResult` trong các bài test tự động cho ứng dụng Flutter POS.

## Problem Statement

Các ứng dụng Flutter di động và ứng dụng kho bãi bán lẻ cần in tem nhãn trà sữa, nhãn giá sản phẩm, hoặc tem nhãn đánh dấu đen (Black mark) với cấu trúc thiết kế 2D tự do. Nếu không khởi tạo `initCanvas()` đúng kích thước giấy tem trước khi nạp các thành phần X/Y, hoặc chưa chuyển đổi loại máy in sang "Label Printer Mode" thông qua `startSettings(SettingItem.TYPE)`, các tem nhãn in ra sẽ bị tràn lề hoặc trượt vị trí nhãn.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CanvasApi` thuộc SUNMI Flutter Printer SDK (`sunmi_flutter_plugin_printer`). Tài liệu chuẩn hóa 7 hàm Future-based, hướng dẫn luồng chuyển chế độ in Label Mode, quy định tọa độ vẽ tuyệt đối X/Y cho Text, Barcode, QR Code, ảnh Flutter Asset (`Uint8List`), hình học `AreaStyle` (`BOX`, `CIRCLE`, `RECT_FILL`, `PATH`), và cung cấp mã nguồn mẫu Dart `async/await` thiết kế tem nhãn sản phẩm hoàn chỉnh.

## User Stories

1. As a Flutter Label App Developer, I want to initialize a 330x330px canvas using `initCanvas()`, so that dynamic price tags with barcodes, QR codes, and custom text render pixel-perfectly on SUNMI label printers.
2. As a Store Operations Lead, I want to trigger `startSettings(SettingItem.TYPE)`, so that users are navigated to the system page to switch printer modes when label printing fails.
3. As a Mobile Logistics Manager, I want to handle `PrintResult` callbacks from `printCanvas(count, listener)`, so that label print completion status is tracked accurately in Flutter UI.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `printer.canvasApi` (Future-based trong Dart)

| Phương thức Dart API | Tham số nạp vào                         | Giá trị Trả về | Mô tả Chức năng                                                                |
| :------------------- | :-------------------------------------- | :------------- | :----------------------------------------------------------------------------- |
| `initCanvas`         | `(LabelStyle style)`                    | `Future<void>` | Khởi tạo kích thước Canvas 2D (`setWidth`, `setHeight`, `setPosX`, `setPosY`). |
| `renderText`         | `(String text, TextStyle style)`        | `Future<void>` | Vẽ văn bản tại tọa độ X/Y (`setPosX`, `setPosY`, `setFont`, `enableBold`).     |
| `renderBarCode`      | `(String code, BarcodeStyle style)`     | `Future<void>` | Vẽ mã vạch Barcode tại tọa độ X/Y (`setSymbology`, `setBarHeight`).            |
| `renderQrCode`       | `(String text, QrStyle style)`          | `Future<void>` | Vẽ mã vuông QR Code tại tọa độ X/Y (`setDot`, `setErrorLevel`).                |
| `renderBitmap`       | `(Uint8List bitmap, BitmapStyle style)` | `Future<void>` | Vẽ hình ảnh nạp từ `Uint8List` tại tọa độ X/Y (`setAlgorithm`).                |
| `renderArea`         | `(AreaStyle format)`                    | `Future<void>` | Vẽ hình học đặc biệt (`BOX`, `RECT_FILL`, `CIRCLE`, `PATH`).                   |
| `printCanvas`        | `(int count, PrintResult listener)`     | `Future<void>` | Thực thi in Canvas với số lượng tem `count` (> 0) và callback `PrintResult`.   |

---

### 2. Sample Code - Chuyển Đổi Chế Độ Label Mode & Vẽ Tem Nhãn Hoàn Chỉnh Trong Flutter

```dart
import 'package:flutter/services.dart';
import 'package:sunmi_flutter_plugin_printer/sunmi_flutter_plugin_printer.dart' as sunmi;

/// Class lắng nghe kết quả in tem nhãn Flutter
class FlutterLabelPrintResult extends sunmi.PrintResult {
  @override
  void onResult(int resultCode, String? message) {
    if (resultCode == 0) {
      print("In tem nhãn Flutter thành công!");
    } else {
      print("Lỗi in tem nhãn Flutter: $message (code: $resultCode)");
    }
  }
}

public class FlutterLabelPrinter {

  /// Chuyển sang màn hình cài đặt loại máy in (Thermal vs Label Mode)
  static Future<void> switchToLabelModePage() async {
    bool? success = await sunmi.PrinterSdk.instance.startSettings(sunmi.SettingItem.TYPE);
    print("Mở trang cài đặt Loại máy in: $success");
  }

  /// Vẽ và in tem nhãn sản phẩm 330px x 330px
  static Future<void> printBeverageLabel(sunmi.Printer printer) async {
    final canvasApi = printer.canvasApi;

    try {
      // 1. Khởi tạo kích thước Canvas 330px x 330px
      await canvasApi.initCanvas(
        sunmi.LabelStyle.getStyle().setWidth(330).setHeight(330),
      );

      // 2. Vẽ Khung Viền Bao Quanh Tem (Hollow Rectangle BOX)
      await canvasApi.renderArea(
        sunmi.AreaStyle.getStyle()
            .setStyle(sunmi.Shape.BOX)
            .setPosX(0).setPosY(0)
            .setWidth(330).setHeight(330)
            .setThick(2),
      );

      // 3. Vẽ Tiêu đề Tem Căn Giữa (X=165, Y=10)
      await canvasApi.renderText(
        "TEM PHÚC LONG TEA",
        sunmi.TextStyle.getStyle()
            .setPosX(165).setPosY(10)
            .setTextSize(26)
            .setAlign(sunmi.Align.CENTER)
            .enableBold(true),
      );

      // 4. Vẽ Mã QR Code tại góc trái (X=10, Y=45, Size=110)
      await canvasApi.renderQrCode(
        "123456789",
        sunmi.QrStyle.getStyle()
            .setPosX(10).setPosY(45)
            .setWidth(110).setHeight(110)
            .setErrorLevel(sunmi.ErrorLevel.M),
      );

      // 5. Vẽ Nội Dung Văn Bản bên phải Mã QR (X=130, Y=45)
      await canvasApi.renderText(
        "Size: L\nĐường: 50%\nĐá: 100%\nTopping: Thạch Đào",
        sunmi.TextStyle.getStyle()
            .setPosX(130).setPosY(45)
            .setWidth(190).setHeight(110)
            .setTextSize(18),
      );

      // 6. Vẽ Mã vạch Barcode bên dưới (X=15, Y=180, Width=300, Height=120)
      await canvasApi.renderBarCode(
        "893456789",
        sunmi.BarcodeStyle.getStyle()
            .setPosX(15).setPosY(180)
            .setWidth(300).setHeight(120),
      );

      // 7. Thực thi in 1 bản tem kèm lắng nghe callback PrintResult
      await canvasApi.printCanvas(1, FlutterLabelPrintResult());

    } catch (e) {
      print("Lỗi khi vẽ/in tem nhãn Flutter: $e");
    }
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `printCanvas(count, listener)` với `count > 0` nhận đúng callback `onResult(0, "Success")`.
- **Modules Kiểm thử**: `FlutterLabelPrinter`, `FlutterLabelPrintResult`.
- **Seam Strategy**: Giả lập `IFlutterCanvasApiDriver` để mock đối tượng `canvasApi` trong bài test Flutter Unit Test (`flutter test`).

## Out of Scope

- Tự động thay đổi phần cứng khay chứa giấy tem nhãn vật lý bên trong máy in.
- In tem nhãn mã vạch màu 3D đa sắc.

## Further Notes

- **Lưu ý vị trí đọc HRI Barcode trên Label**: Khác với in hóa đơn, vị trí đọc HRI barcode trên tem nhãn trong Flutter hỗ trợ: `POS_ONE` (Căn lề dưới bên trái), `POS_TWO` (Căn lề dưới ở giữa), `POS_THREE` (Căn lề dưới bên phải).
