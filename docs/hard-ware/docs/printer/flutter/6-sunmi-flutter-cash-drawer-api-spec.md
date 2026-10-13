# SUNMI Flutter CashDrawerApi Cash Drawer Control Specification

## Proposed Seam

- **FlutterCashDrawerApiDriver Seam (`IFlutterCashDrawerApiDriver`)**: Seam nằm ở interface `printer.cashDrawerApi`. Interface này bao bọc hai phương thức Future-based trong Flutter Dart: `open(PrintResult)` và `isOpen()`. Seam cho phép giả lập việc phát xung mở két tiền và mock trạng thái đóng/mở két tiền trong bài test tự động cho ứng dụng Flutter POS mà không cần cắm két phần cứng qua cổng RJ11/RJ12.

## Problem Statement

Các ứng dụng bán hàng Flutter POS trên các thiết bị SUNMI để bàn (như T2, T3, D2, D3...) cần tự động phát xung điện mở két tiền thu ngân (Cash Drawer) ngay khi hoàn tất hóa đơn thanh toán tiền mặt. Đồng thời, ứng dụng Flutter cần đọc trạng thái đóng/mở két tiền (`isOpen()`) để cập nhật State giao diện người dùng. Việc gọi các hàm này trên thiết bị không trang bị cổng két tiền phần cứng có thể ném ngoại lệ exception.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CashDrawerApi` thuộc SUNMI Flutter Printer SDK (`sunmi_flutter_plugin_printer`). Tài liệu hướng dẫn sử dụng class `PrintResult` lắng nghe kết quả mở két thành công/thất bại, xử lý đọc trạng thái `isOpen()` bất đồng bộ bằng `async/await`, và cung cấp mã nguồn mẫu Dart hoàn chỉnh.

## User Stories

1. As a Flutter POS Cashier App, I want to call `await printer.cashDrawerApi.open(MyPrintResult())`, so that the physical cash drawer pops open automatically after cash payment.
2. As a Flutter UI Developer, I want to query `await printer.cashDrawerApi.isOpen()`, so that a status indicator widget switches between 'Open' and 'Closed'.
3. As a Mobile Lead, I want exception handling around cash drawer calls, so that handheld devices without cash drawer ports fail gracefully without crashing.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `printer.cashDrawerApi` (Future-based trong Dart)

- `Future<void> open(PrintResult resultListener)`: Phát xung điện mở két tiền thu ngân kết nối qua cổng RJ11/RJ12 và nhận kết quả qua callback `PrintResult`.
- `Future<bool?> isOpen()`: Truy vấn trạng thái đóng/mở két tiền thời gian thực (`true`: Đang mở, `false`: Đã đóng).

---

### 2. Hạn chế Thiết bị & Xử lý Ngoại lệ (Usage Restrictions)

- **Cổng kết nối phần cứng**: Tính năng này chỉ hoạt động trên các thiết bị SUNMI có tích hợp cổng RJ11/RJ12.
- **Xử lý Ngoại lệ Exception**: Khi gọi trên máy cầm tay không hỗ trợ, API sẽ ném ngoại lệ. Bắt buộc bao bọc lệnh gọi trong khối `try-catch`.

---

### 3. Sample Code - Mở Két Tiền & Đọc Trạng Thái Trong Flutter (Dart)

```dart
import 'package:flutter/material.dart';
import 'package:sunmi_flutter_plugin_printer/sunmi_flutter_plugin_printer.dart' as sunmi;

/// Class lắng nghe kết quả kích mở két tiền
class FlutterCashDrawerResult extends sunmi.PrintResult {
  final Function(bool success, String? message) onFinish;

  FlutterCashDrawerResult(this.onFinish);

  @override
  void onResult(int? resultCode, String? message) {
    print("CashDrawer ResultCode: $resultCode, Message: $message");
    if (resultCode == 0) {
      onFinish(true, message);
    } else {
      onFinish(false, message);
    }
  }
}

public class FlutterCashDrawerController {

  /// Kích hoạt mở két tiền thu ngân
  static Future<void> triggerOpenDrawer(
    sunmi.Printer printer,
    Function(bool success, String? msg) callback
  ) async {
    final cashDrawerApi = printer.cashDrawerApi;

    try {
      // Gọi open() truyền class listener FlutterCashDrawerResult
      await cashDrawerApi.open(FlutterCashDrawerResult(callback));
    } catch (e) {
      print("Lỗi khi mở két tiền Flutter: $e");
      callback(false, e.toString());
    }
  }

  /// Truy vấn trạng thái đóng/mở két tiền thời gian thực
  static Future<bool> getDrawerCurrentStatus(sunmi.Printer printer) async {
    final cashDrawerApi = printer.cashDrawerApi;

    try {
      final bool? isOpen = await cashDrawerApi.isOpen();
      return isOpen == true;
    } catch (e) {
      print("Lỗi khi đọc isOpen Flutter: $e");
      return false;
    }
  }
}
```

---

### 4. Sample Code - Tích hợp Vào Flutter Widget UI State

```dart
class CashDrawerStatusWidget extends StatefulWidget {
  final sunmi.Printer printer;

  const CashDrawerStatusWidget({Key? key, required this.printer}) : super(key: key);

  @override
  State<CashDrawerStatusWidget> createState() => _CashDrawerStatusWidgetState();
}

class _CashDrawerStatusWidgetState extends State<CashDrawerStatusWidget> {
  String _drawerStateText = "Chưa rõ";

  Future<void> _checkStatus() async {
    bool isOpen = await FlutterCashDrawerController.getDrawerCurrentStatus(widget.printer);
    setState(() {
      _drawerStateText = isOpen ? "Đang MỞ" : "Đã ĐÓNG";
    });
  }

  Future<void> _openDrawer() async {
    await FlutterCashDrawerController.triggerOpenDrawer(widget.printer, (success, msg) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? "Mở két tiền thành công!" : "Lỗi mở két: $msg"),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
      _checkStatus();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text("Trạng thái Két Tiền: $_drawerStateText"),
        const SizedBox(height: 10),
        ElevatedButton(
          onPressed: _openDrawer,
          child: const Text("Bật Mở Két Tiền"),
        ),
        ElevatedButton(
          onPressed: _checkStatus,
          child: const Text("Cập Nhật Trạng Thái"),
        ),
      ],
    );
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `isOpen()` khi mock giá trị trả về `true` hoặc `false` không gây crash ứng dụng.
- **Modules Kiểm thử**: `FlutterCashDrawerController`, `FlutterCashDrawerResult`.
- **Seam Strategy**: Giả lập `IFlutterCashDrawerApiDriver` để mock đối tượng `cashDrawerApi` trong bài test Flutter Unit Test (`flutter test`).

## Out of Scope

- Tự động thay đổi điện áp cổng cắm két tiền (12V / 24V) từ phía Flutter SDK.
- Điều khiển két tiền cơ học độc lập không cắm qua cổng RJ11/RJ12 của máy SUNMI.

## Further Notes

- **Khuyên dùng**: Nên cập nhật trạng thái `isOpen()` ngay sau khi gọi `open()` để giao diện người dùng hiển thị tức thì.
