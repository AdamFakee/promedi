# SUNMI Flutter CommandApi ESC/POS & TSPL Passthrough Specification

## Proposed Seam

- **FlutterCommandApiDriver Seam (`IFlutterCommandApiDriver`)**: Seam nằm ở interface `printer.commandApi`. Interface này bao bọc hai phương thức Future-based truyền lệnh thô dạng mảng byte `Uint8List`: `sendEscCommand` và `sendTsplCommand`. Seam cho phép mock dữ liệu mảng byte lệnh in và kiểm thử kết quả trả về trong Flutter Unit Test mà không cần nạp qua cổng phần cứng.

## Problem Statement

Các ứng dụng Flutter POS legacy, ứng dụng logistics kho bãi Dart, hoặc các hệ thống đã có sẵn bộ sinh byte mã lệnh thô (RAW Command Generators) bằng chuẩn ESC/POS (in hóa đơn nhiệt) hoặc chuẩn TSPL (in tem nhãn Zebra/TSC) cần phương thức nạp thẳng mảng byte `Uint8List` vào máy in SUNMI. Việc nạp mã lệnh yêu cầu xử lý đúng bảng mã hóa ký tự (`GB18030`, `utf8.encode`, `CP437`) và đảm bảo thiết bị đã chuyển sang Label Mode trước khi gửi lệnh TSPL.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CommandApi` thuộc SUNMI Flutter Printer SDK (`sunmi_flutter_plugin_printer`). Tài liệu giải thích cơ chế nạp mảng byte `Uint8List` cho lệnh `sendEscCommand` và `sendTsplCommand`, quy định cách dùng thư viện `dart:convert` để nạp chuỗi TSPL, và cung cấp mã nguồn mẫu Dart hoàn chỉnh.

## User Stories

1. As a Legacy Flutter Migrator, I want to transmit pre-compiled ESC/POS `Uint8List` byte arrays using `sendEscCommand()`, so that existing receipt formatting routines work without modification.
2. As a Flutter Warehouse Logistics Engineer, I want to convert TSPL text templates to `Uint8List` using `utf8.encode()`, so that label templates print directly from Dart apps via `sendTsplCommand()`.
3. As a Multi-Language POS Lead, I want to switch printer code pages (e.g. CP437) via ESC commands before printing text, so that international character sets render accurately.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `printer.commandApi` (Future-based trong Dart)

- `Future<void> sendEscCommand(Uint8List esc)`: Gửi mảng byte `Uint8List` chứa lệnh chuẩn `ESC/POS` (In hóa đơn nhiệt). Mặc định nạp bảng mã hóa ký tự `GB18030`.
- `Future<void> sendTsplCommand(Uint8List tspl)`: Gửi mảng byte `Uint8List` chứa lệnh chuẩn `TSPL` (In tem nhãn nhiệt).

---

### 2. So sánh & Hạn chế Máy in (Service Restrictions)

| Bộ Lệnh (Instruction Set) | Máy in Tích hợp SUNMI (Built-in)                           | Máy in Ngoại vi (External Printers) | Mã hóa Ký tự Mặc định                  |
| :------------------------ | :--------------------------------------------------------- | :---------------------------------- | :------------------------------------- |
| **ESC/POS**               | Hỗ trợ tất cả các dòng máy                                 | Hỗ trợ                              | `GB18030` (Có thể đổi Code Page)       |
| **TSPL**                  | Hỗ trợ trên các dòng in tem nhãn (V2s, V2s_Plus, S2LCC...) | Chưa hỗ trợ                         | `UTF-8` / `ASCII` (Dùng `utf8.encode`) |

---

### 3. Sample Code - Gửi Lệnh ESC/POS Bằng Flutter Dart (`sendEscCommand`)

```dart
import 'dart:typed_data';
import 'package:sunmi_flutter_plugin_printer/sunmi_flutter_plugin_printer.dart' as sunmi;

public class FlutterEscPosManager {

  /// Gửi mảng byte Uint8List chứa lệnh ESC/POS (Khởi tạo + Căn giữa + Chữ in)
  static Future<void> sendSampleEscPosReceipt(sunmi.Printer printer) async {
    final commandApi = printer.commandApi;

    try {
      // 1. Lệnh ESC/POS Khởi tạo máy in (0x1B 0x40) và Căn giữa (0x1B 0x61 0x01)
      final List<int> cmdBytes = [
        0x1B, 0x40,       // Initialize printer
        0x1B, 0x61, 0x01, // Center alignment
      ];

      // 2. Chuyển List<int> sang Uint8List
      final Uint8List escBytes = Uint8List.fromList(cmdBytes);

      // 3. Gửi lệnh thô ESC/POS vào Flutter CommandApi
      await commandApi.sendEscCommand(escBytes);

    } catch (e) {
      print("Lỗi gửi lệnh ESC/POS Flutter: $e");
    }
  }
}
```

---

### 4. Sample Code - Gửi Lệnh TSPL In Tem Nhãn Bằng Flutter Dart (`sendTsplCommand`)

> [!IMPORTANT]
> **YÊU CẦU CHẾ ĐỘ LABEL MODE**: Đảm bảo thiết bị SUNMI (V2s, V2s_Plus...) đã được chuyển sang chế độ **Label Mode** trước khi nạp lệnh TSPL.

```dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:sunmi_flutter_plugin_printer/sunmi_flutter_plugin_printer.dart' as sunmi;

public class FlutterTsplLabelManager {

  /// Gửi chuỗi lệnh TSPL tem nhãn sản phẩm dạng Uint8List (Mã hóa UTF-8)
  static Future<void> sendSampleTsplLabel(sunmi.Printer printer) async {
    final commandApi = printer.commandApi;

    try {
      // 1. Định dạng mẫu tem nhãn TSPL đa dòng
      final String tsplText =
        "SIZE 40 mm, 30 mm\n" +
        "GAP 2 mm, 0 mm\n" +
        "CLS\n" +
        'TEXT 20,20,"TSS24.BF2",0,1,1,"FLUTTER TSPL DEMO"\n' +
        'BARCODE 20,60,"128",50,1,0,2,2,"893456789"\n' +
        "PRINT 1,1\n";

      // 2. Chuyển chuỗi mã lệnh TSPL sang Uint8List bằng utf8.encode() từ dart:convert
      final Uint8List tsplBytes = Uint8List.fromList(utf8.encode(tsplText));

      // 3. Gửi lệnh thô TSPL vào Flutter CommandApi
      await commandApi.sendTsplCommand(tsplBytes);

    } catch (e) {
      print("Lỗi gửi lệnh TSPL Flutter: $e");
    }
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc nạp mảng `Uint8List` không rỗng vào `sendEscCommand` và `sendTsplCommand` không gây crash ứng dụng.
- **Modules Kiểm thử**: `FlutterEscPosManager`, `FlutterTsplLabelManager`.
- **Seam Strategy**: Giả lập `IFlutterCommandApiDriver` để mock đối tượng `commandApi` trong bài test Flutter Unit Test (`flutter test`).

## Out of Scope

- Tự động thay đổi mã trang (Code page) của máy in ngoại vi không hỗ trợ tập lệnh ESC mở rộng.
- Biên dịch lại các cú pháp lệnh TSPL bị lỗi chuỗi.

## Further Notes

- **Thư viện mã hóa**: Luôn import `import 'dart:convert';` khi cần mã hóa các chuỗi văn bản TSPL sang `Uint8List` bằng `utf8.encode()`.
