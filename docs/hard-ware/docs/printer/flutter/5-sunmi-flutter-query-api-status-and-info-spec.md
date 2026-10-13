# SUNMI Flutter QueryApi Status & Printer Info Specification

## Proposed Seam

- **FlutterQueryApiDriver Seam (`IFlutterQueryApiDriver`)**: Seam nằm ở interface `printer.queryApi`. Interface này bao bọc hai phương thức Future-based trong Flutter Dart: `getStatus()` và `getInfo(PrinterInfo)`. Seam giúp giả lập các dữ liệu trạng thái máy in (`Status.ERR_PAPER_OUT`, `Status.ERR_COVER`) và thuộc tính metadata (`PrinterInfo.DISTANCE`, `CUTTER`) trong các bài test tự động cho ứng dụng Flutter POS.

## Problem Statement

Các ứng dụng Flutter POS di động chạy trên máy SUNMI cần truy vấn trạng thái thời gian thực của máy in trước khi người dùng thực hiện giao dịch in ấn. Nếu máy in bị hết giấy (`ERR_PAPER_OUT`), mở nắp (`ERR_COVER`), hoặc quá nhiệt (`ERR_PRINTER_HOT`), ứng dụng Flutter cần cảnh báo trực tiếp trên UI bằng SnackBar hoặc Dialog thay vì gửi lệnh in hỏng. Ngoài ra, việc đọc thông số kỹ thuật (`DISTANCE`, `CUTTER`) đòi hỏi hàm `getInfo()` hoạt động chính xác qua Dart Future.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `QueryApi` thuộc SUNMI Flutter Printer SDK (`sunmi_flutter_plugin_printer`). Tài liệu quy định danh mục các giá trị trả về của `getStatus()` (Phân biệt nhóm lỗi `ERR_*` và cảnh báo `WARN_*`), định nghĩa các trường thuộc tính `PrinterInfo` (ID, NAME, VERSION, DISTANCE, CUTTER, DENSITY, TYPE, PAPER), và cung cấp mã nguồn mẫu Dart `async/await` hoàn chỉnh.

## User Stories

1. As a Flutter POS Checkout Service, I want to call `await printer.queryApi.getStatus()` before printing, so that Flutter UI widgets alert cashiers if paper is out or cover is open.
2. As a Flutter Fleet Manager, I want to query print distance and cutter usage using `getInfo(PrinterInfo.DISTANCE)` and `getInfo(PrinterInfo.CUTTER)`, so that maintenance metrics display on Flutter dashboards.
3. As a Mobile App Lead, I want status checks to execute asynchronously via Dart Futures, so that Flutter UI main isolates are never blocked by hardware I/O.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `printer.queryApi` (Future-based trong Dart)

- `Future<Status> getStatus()`: Truy vấn trạng thái phần cứng máy in theo thời gian thực.
- `Future<String?> getInfo(PrinterInfo info)`: Tra cứu thông số thông tin phần cứng máy in.

---

### 2. Bảng Trạng Thái Máy In Trong Flutter Dart (`Status`)

#### a. Nhóm Lỗi Phần Cứng Ngăn Cản Việc In (`ERR_*`)

- `Status.READY`: Máy in sẵn sàng hoạt động bình thường.
- `Status.OFFLINE`: Máy in ngoại tuyến / Hỏng hóc.
- `Status.COMM`: Lỗi giao tiếp truyền thông.
- `Status.ERR_PAPER_OUT`: Máy in hết giấy.
- `Status.ERR_PAPER_JAM`: Kẹt giấy trong khay máy in.
- `Status.ERR_PAPER_MISMATCH`: Sai loại giấy in.
- `Status.ERR_PRINTER_HOT`: Đầu in nhiệt quá nhiệt.
- `Status.ERR_MOTOR_HOT`: Mô-tơ máy in quá nhiệt.
- `Status.ERR_COVER`: Nắp khay giấy đang mở.
- `Status.ERR_COVER_INCOMPLETE`: Nắp khay giấy chưa đóng kín.
- `Status.ERR_CUTTER`: Dao cắt tự động bị kẹt/lỗi.

#### b. Nhóm Cảnh Báo Không Chặn Việc In (`WARN_*`)

- `Status.WARN_THERMAL_PAPER`: Giấy in nhiệt sắp hết.
- `Status.WARN_PICK_PAPER`: Tem nhãn in xong chưa được bóc khỏi cảm biến.

---

### 3. Bảng Thuộc Tính Thông Số Máy In (`PrinterInfo`)

| Thuộc tính `PrinterInfo` | Ý Nghĩa Thông Số Tra Cứu    | Giá trị Trả về                                                    |
| :----------------------- | :-------------------------- | :---------------------------------------------------------------- |
| `PrinterInfo.ID`         | Mã ID phần cứng máy in      | Chuỗi ID phần cứng                                                |
| `PrinterInfo.NAME`       | Tên của máy in              | Chuỗi tên máy in mặc định / custom                                |
| `PrinterInfo.VERSION`    | Số phiên bản Firmware       | Chuỗi phiên bản Firmware                                          |
| `PrinterInfo.DISTANCE`   | Tổng độ dài giấy đã in      | Đơn vị `mm`                                                       |
| `PrinterInfo.CUTTER`     | Số lần dao cắt đã thực hiện | Đếm số lần cắt                                                    |
| `PrinterInfo.HOT`        | Số lần quá nhiệt recorded   | Đếm số lần                                                        |
| `PrinterInfo.DENSITY`    | Mức độ đậm hiện tại         | Khoảng `70%` đến `130%`                                           |
| `PrinterInfo.TYPE`       | Loại chế độ máy in          | `"thermal printer"`, `"black mark printer"`, `"label printer"`... |
| `PrinterInfo.PAPER`      | Khổ giấy hỗ trợ hiện tại    | `"58mm"` hoặc `"80mm"`                                            |

---

### 4. Sample Code - Truy vấn Trạng thái & Thông số Máy In Trong Flutter (Dart)

```dart
import 'package:flutter/material.dart';
import 'package:sunmi_flutter_plugin_printer/sunmi_flutter_plugin_printer.dart' as sunmi;

public class FlutterPrinterStatusChecker {

  /// Kiểm tra trạng thái máy in và hiển thị SnackBar cảnh báo nếu có lỗi
  static Future<bool> verifyAndAlertPrinter(
    BuildContext context,
    sunmi.Printer printer
  ) async {
    try {
      // 1. Đọc trạng thái phần cứng thời gian thực bất đồng bộ
      final sunmi.Status status = await printer.queryApi.getStatus();
      print("Flutter Real-time Printer Status: ${status.name}");

      if (status == sunmi.Status.READY) {
        return true;
      }

      String warningMsg = "Máy in không sẵn sàng!";
      if (status == sunmi.Status.ERR_PAPER_OUT) {
        warningMsg = "Cảnh báo: Máy in đã HẾT GIẤY!";
      } else if (status == sunmi.Status.ERR_COVER) {
        warningMsg = "Cảnh báo: NẮP KHAY GIẤY đang mở!";
      } else if (status == sunmi.Status.ERR_PRINTER_HOT) {
        warningMsg = "Cảnh báo: Đầu in nhiệt bị QUÁ NHIỆT!";
      }

      // Hiển thị thông báo UI
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(warningMsg),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }

      return false;

    } catch (e) {
      print("Lỗi khi đọc getStatus Flutter: $e");
      return false;
    }
  }

  /// Đọc các thông số tuổi thọ máy in (Số mm giấy đã in, Lượt cắt cutter)
  static Future<Map<String, String>> fetchPrinterMetrics(sunmi.Printer printer) async {
    final queryApi = printer.queryApi;
    final Map<String, String> metrics = {};

    try {
      metrics['distance'] = (await queryApi.getInfo(sunmi.PrinterInfo.DISTANCE)) ?? "0";
      metrics['cutter']   = (await queryApi.getInfo(sunmi.PrinterInfo.CUTTER)) ?? "0";
      metrics['paper']    = (await queryApi.getInfo(sunmi.PrinterInfo.PAPER)) ?? "58mm";
      metrics['type']     = (await queryApi.getInfo(sunmi.PrinterInfo.TYPE)) ?? "thermal";
      metrics['density']  = (await queryApi.getInfo(sunmi.PrinterInfo.DENSITY)) ?? "100%";
    } catch (e) {
      print("Lỗi khi đọc metadata Flutter: $e");
    }

    return metrics;
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `getStatus()` và `getInfo()` trả về Dart Future chứa đối tượng hợp lệ.
- **Modules Kiểm thử**: `FlutterPrinterStatusChecker`.
- **Seam Strategy**: Giả lập `IFlutterQueryApiDriver` để mock đối tượng `queryApi` trả về `sunmi.Status.READY` hoặc `sunmi.Status.ERR_PAPER_OUT` trong Flutter Unit Test (`flutter test`).

## Out of Scope

- Thay đổi thông số `DENSITY` hay `TYPE` thông qua các hàm tra cứu `queryApi`.
- Đăng ký Android Broadcast Receivers trực tiếp bằng mã Dart thuần mà không qua Native Android EventChannel.

## Further Notes

- **Lưu ý hiệu năng**: Hàm `getStatus()` thực thi đo đạc I/O phần cứng tốn thời gian. Chỉ nên gọi trước mỗi lần bấm in hoặc khi mở màn hình thanh toán, tránh gọi trong vòng lặp polling liên tục.
