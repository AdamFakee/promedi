# SUNMI Flutter Printer SDK (sunmi_flutter_plugin_printer) Overview Specification

## Proposed Seam

- **FlutterPrinterSdk Seam (`IFlutterPrinterService`)**: Seam nằm ở interface `PrinterSdk.instance.getPrinter(PrinterListener)`. Seam này bao bọc 5 bộ Sub-API Flutter Dart (`QueryApi`, `CommandApi`, `LineApi`, `CanvasApi`, `CashDrawerApi`), cho phép mock việc lấy đối tượng `Printer` và kiểm thử kết quả in ấn trong unit test / widget test trên ứng dụng Flutter POS mà không cần thiết bị thật.

## Problem Statement

Các nhà phát triển ứng dụng di động đa nền tảng bằng Flutter (Android/iOS) cần kết nối máy in nhiệt tích hợp của SUNMI để in hóa đơn bán hàng, tem nhãn mã vạch, và bật két tiền thu ngân. Nếu không có tài liệu đặc tả chuẩn cho Flutter Plugin chính thức (`sunmi_flutter_plugin_printer`) và hướng dẫn khởi tạo listener bất đồng bộ `PrinterListener`, lập trình viên dễ gặp lỗi gọi phương thức in khi `Printer` object chưa được thiết lập.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `SUNMI Flutter Printer SDK` (`sunmi_flutter_plugin_printer: ^1.0.7+7`). Tài liệu hướng dẫn tích hợp dependency trong `pubspec.yaml`, quy trình khởi tạo `getPrinter()`, phân loại 5 Sub-APIs chuyên dụng bằng ngôn ngữ Dart, hàm chuyển trang Cài đặt hệ thống `startSettings()`, và mã nguồn mẫu Flutter Widget hoàn chỉnh.

## User Stories

1. As a Flutter App Developer, I want to add `sunmi_flutter_plugin_printer` to my `pubspec.yaml`, so that my cross-platform Flutter POS app accesses SUNMI thermal printers natively.
2. As a Flutter POS Architect, I want an asynchronous `PrinterListener` callback (`onDefPrinter`), so that print commands are only sent after the printer connection is established.
3. As a Mobile Store Manager, I want to jump to printer system settings using `startSettings(SettingItem.DENSITY)`, so that print density can be adjusted directly from the Flutter UI.

## Implementation Decisions

### 1. Tích Hợp Dependency Trong `pubspec.yaml`

Chạy lệnh terminal:

```bash
flutter pub add sunmi_flutter_plugin_printer
```

Hoặc thêm trực tiếp vào `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  sunmi_flutter_plugin_printer: ^1.0.7+7
```

---

### 2. Danh Mục 5 Sub-APIs Khả Dụng Trong Flutter SDK

| Tên Sub-API Dart        | Mô tả Chức năng trong Flutter                                    |
| :---------------------- | :--------------------------------------------------------------- |
| `printer.queryApi`      | Tra cứu trạng thái sẵn sàng và thông tin máy in                  |
| `printer.commandApi`    | Gửi mảng lệnh thô ESC/POS hoặc TSPL dạng Uint8List               |
| `printer.lineApi`       | In hóa đơn bán hàng theo từng dòng (Thermal Receipt Printing)    |
| `printer.canvasApi`     | Vẽ và in tem nhãn theo tọa độ Canvas 2D (Label Printing)         |
| `printer.cashDrawerApi` | Điều khiển phát xung bật két tiền thu ngân (Cash Drawer Control) |

---

### 3. Sample Code - Khởi Tạo Printer Listener & In Hóa Đơn Trong Flutter (Dart)

```dart
import 'package:flutter/material.dart';
import 'package:sunmi_flutter_plugin_printer/sunmi_flutter_plugin_printer.dart';

class SunmiFlutterPrinterManager implements PrinterListener {
  static final SunmiFlutterPrinterManager _instance = SunmiFlutterPrinterManager._internal();
  factory SunmiFlutterPrinterManager() => _instance;
  SunmiFlutterPrinterManager._internal();

  Printer? _defaultPrinter;
  bool _isBound = false;

  Printer? get defaultPrinter => _defaultPrinter;
  bool get isBound => _isBound;

  /// Bật log debug SDK khi lập trình
  Future<void> enableSdkLogs(bool enable) async {
    await PrinterSdk.instance.log(enable, "FlutterPrinterDebug");
  }

  /// Khởi tạo và lắng nghe lấy đối tượng Printer
  Future<void> initPrinterService() async {
    await PrinterSdk.instance.getPrinter(this);
  }

  @override
  void onDefPrinter(Printer printer) {
    _defaultPrinter = printer;
    _isBound = true;
    debugPrint("Sunmi Default Printer Connected: ${printer.toString()}");
  }

  /// In hóa đơn bán hàng Flutter mẫu qua LineApi
  Future<void> printSampleReceipt() async {
    if (_defaultPrinter == null) {
      debugPrint("Printer is not ready yet!");
      return;
    }

    try {
      // 1. Khởi tạo dòng in căn giữa
      await _defaultPrinter!.lineApi.initLine(
        BaseStyle.getStyle().setAlign(Align.CENTER),
      );

      // 2. In tiêu đề hóa đơn
      await _defaultPrinter!.lineApi.printText(
        "FLUTTER POS DEMO\n",
        TextStyle.getStyle().setTextSize(32).setEnableBold(true),
      );

      // 3. In văn bản chi tiết
      await _defaultPrinter!.lineApi.printText(
        "Hóa đơn thanh toán #FL-8899\n",
        TextStyle.getStyle().setTextSize(24),
      );

      // 4. Đẩy giấy và tự động cắt
      await _defaultPrinter!.lineApi.autoOut();

    } catch (e) {
      debugPrint("Error printing from Flutter: $e");
    }
  }

  /// Chuyển sang trang Cài đặt máy in hệ thống (Yêu cầu Print Service > 6.6.32)
  Future<void> openDensitySettings() async {
    bool? success = await PrinterSdk.instance.startSettings(SettingItem.DENSITY);
    debugPrint("Launched Density Settings: $success");
  }

  /// Giải phóng tài nguyên SDK
  Future<void> disposeSdk() async {
    await PrinterSdk.instance.destroy();
    _defaultPrinter = null;
    _isBound = false;
  }
}
```

---

### 4. Sample Code - Sử Dụng Trong Flutter Statefulness Widget

```dart
class PrinterScreen extends StatefulWidget {
  const PrinterScreen({Key? key}) : super(key: key);

  @override
  State<PrinterScreen> createState() => _PrinterScreenState();
}

class _PrinterScreenState extends State<PrinterScreen> {
  final _printerManager = SunmiFlutterPrinterManager();

  @override
  void initState() {
    super.initState();
    _printerManager.initPrinterService();
  }

  @override
  void dispose() {
    _printerManager.disposeSdk();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Sunmi Flutter Printer Demo")),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () => _printerManager.printSampleReceipt(),
              child: const Text("In Hóa Đơn Bán Hàng"),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _printerManager.openDensitySettings(),
              child: const Text("Cấu Hình Độ Đậm (Density)"),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `initPrinterService()` kích hoạt đúng callback `onDefPrinter`.
- **Modules Kiểm thử**: `SunmiFlutterPrinterManager`, `PrinterScreen`.
- **Seam Strategy**: Giả lập `IFlutterPrinterService` để mock đối tượng `Printer` trong bài test Flutter Widget Test (`testWidgets`).

## Out of Scope

- Gọi các Sub-API không được hỗ trợ trên loại máy in hiện tại (ví dụ: gọi `CanvasApi` trên máy in laser sẽ ném `SDK Exception`).
- Biên dịch ứng dụng cho nền tảng iOS với tính năng in qua cổng USB nội bộ của thiết bị SUNMI Android.

## Further Notes

- **Lưu ý phiên bản Print Service**: Hàm `startSettings()` yêu cầu phiên bản dịch vụ in trên thiết bị lớn hơn `6.6.32`. Nếu phiên bản cũ hơn, hàm sẽ trả về `false`.
