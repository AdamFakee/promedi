# SUNMI PrinterX SDK Version History & Compatibility Specification

## Proposed Seam

- **PrinterXVersionManager Seam (`IPrinterXVersionManager`)**: Seam nằm ở phần định tuyến phiên bản SDK và kiểm tra điều kiện tương thích với Print Service hệ thống (Print Service < 6.0.0 vs >= 6.6.32 vs >= 6.11.23). Seam này giúp mock các phiên bản Print Service khác nhau trong unit test để xác minh khả năng tương thích ngược của các hàm `ZPL`, `startSettings`, `destroy()`.

## Problem Statement

Các thiết bị phần cứng SUNMI đang lưu hành trên thị trường chạy các phiên bản Dịch vụ In (Print Service) khác nhau (từ dưới 6.0.0 đến 6.11.23+). Khi nâng cấp ứng dụng lên các bản `PrinterX SDK` mới nhất (từ 1.0.11 đến 1.0.20), lập trình viên cần nắm rõ lịch sử phiên bản, các lỗi tương thích đã được sửa (như rò rỉ NullPointer khi hủy SDK `destroy()`, lỗi in bảng/đường kẻ trên service cũ, lỗi crash khi nhận Boot Broadcast), và các tính năng mới được bổ sung như bộ lệnh `ZPL` (Zebra Pass-through Command).

## Solution

Cung cấp đặc tả lịch sử phát triển và tương thích phiên bản (Version History & Compatibility Specification) cho `com.sunmi:printerx`. Tài liệu tổng hợp toàn bộ mốc cập nhật từ v1.0.11 đến v1.0.20, quy định các ngưỡng tương thích Print Service, và cung cấp mã nguồn mẫu Java cho các tính năng mới (ZPL pass-through, an toàn gọi `destroy()`, tái cấu trúc `LineStyle`).

## User Stories

1. As a POS Developer, I want to execute ZPL pass-through commands (`1.0.19+`), so that legacy Zebra label templates can be printed directly on SUNMI label printers.
2. As a Maintenance Engineer, I want safe SDK destruction logic (`destroy()`) that prevents service crashes (`1.0.13+` & `1.0.12+`), so that app reloads do not crash background print services.
3. As a QA Engineer, I want to verify Print Service compatibility boundaries (version 6.0.0, 6.6.32, 6.11.23), so that app behavior is predictable across older and newer SUNMI hardware.

## Implementation Decisions

### 1. Bảng Tổng hợp Lịch sử Phiên bản SDK PrinterX (v1.0.11 -> v1.0.20)

| Phiên bản   | Ngày phát hành | Các Tính năng Mới & Bản Sửa Lỗi Quan trọng                                                                                                      |
| :---------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.0.20** | 24/06/2026     | Refactor cấu trúc thuộc tính `LineStyle` giúp đường dẫn gọi hàm rõ ràng hơn. Sửa các lỗi ngoại lệ ranh giới (edge-case) và hành vi tương thích. |
| **v1.0.19** | 14/05/2026     | Thêm interface cấu hình tham số máy in toàn cục (Density, Font, Speed, Alerts). **Thêm bộ lệnh ZPL Pass-through** (`ZPL`).                      |
| **v1.0.18** | 06/05/2025     | Thêm interface chuyển nhanh trang Cài đặt (`startSettings`) (Yêu cầu Print Service >= 6.6.32).                                                  |
| **v1.0.17** | 12/08/2024     | Sửa lỗi tương thích: Khắc phục lỗi không lấy được default printer trên Print Service v6.0.0 - v6.2.3.                                           |
| **v1.0.16** | 01/04/2024     | Tối ưu hóa việc lấy default printer khi nhận Boot Broadcast (Khắc phục lỗi ném exception khi in ngay sau khi boot). Cải tiến `LineStyle`.       |
| **v1.0.15** | 29/12/2023     | Sửa lỗi không in được hình ảnh trên Print Service < 6.0.0. Hàm `initCanvas` hỗ trợ định dạng `LabelStyle`.                                      |
| **v1.0.14** | 14/09/2023     | Khắc phục lỗi in bảng (Table style) và đường kẻ phân cách (Divider line) trên Print Service < 6.0.0.                                            |
| **v1.0.13** | 22/08/2023     | Ngăn ngừa crash dịch vụ in khi hàm `destroy()` bị gọi nhiều lần liên tiếp.                                                                      |
| **v1.0.12** | 04/08/2023     | Thêm phương thức hiển thị giá tiền trên màn hình phụ `LcdApi`. Fix lỗi `NullPointerException` khi gọi `destroy()`.                              |
| **v1.0.11** | 08/03/2023     | Phiên bản phát hành đầu tiên (Initial Release) của thư viện PrinterX.                                                                           |

---

### 2. Các Ngưỡng Tương thích Dịch vụ In Hệ thống (Print Service Version Boundaries)

- **Print Service < 6.0.0**: Cần SDK v1.0.14/v1.0.15 trở lên để sửa các lỗi in bảng, đường kẻ và in ảnh Bitmap.
- **Print Service v6.0.0 - v6.2.3**: Bắt buộc dùng SDK v1.0.17 trở lên để tránh lỗi không lấy được đối tượng `defaultPrinter`.
- **Print Service >= 6.6.32**: Hỗ trợ gọi hàm chuyển trang cài đặt `PrinterSdk.getInstance().startSettings()`.
- **Print Service >= 6.11.23**: Hỗ trợ đầy đủ các hàm cấu hình thuộc tính toàn cục (Density, FontType, Speed, Alert popup).

---

### 3. Sample Code - Mã nguồn mẫu cho Tính năng Mới & Xử lý An toàn

#### 3.1 Truyền Lệnh in ZPL Pass-through (`ZPL Command Pass-through - SDK v1.0.19+`)

```java
package com.sm.sdk.demo.printerx;

import com.sunmi.printerx.Printer;

public class ZplPrintManager {

    /**
     * Gửi trực tiếp chuỗi mã lệnh Zebra ZPL tới máy in nhãn SUNMI
     */
    public void printZplRawLabel(Printer printer, String zplData) {
        if (printer == null || zplData == null) return;

        try {
            // Chuỗi mã lệnh ZPL tiêu chuẩn (Ví dụ in tem mã vạch ZPL)
            // ^XA ^FO50,50^ADN,36,20^FDSTORES_POS^FS ^FO50,100^BCN,100,Y,N,N^FD12345678^FS ^XZ
            byte[] zplBytes = zplData.getBytes("UTF-8");

            // Gọi CommandApi truyền trực tiếp mảng byte ZPL
            printer.commandApi().sendRAWData(zplBytes, null);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

#### 3.2 Tái cấu trúc `LineStyle` trong SDK v1.0.20+ (`Receipt Line Formatting`)

```java
package com.sm.sdk.demo.printerx;

import com.sunmi.printerx.Printer;
import com.sunmi.printerx.style.LineStyle;

public class LineStyleManager {

    public void printCustomStyledLine(Printer printer, String text) {
        if (printer == null) return;

        try {
            // Refactored LineStyle setters trong SDK v1.0.20+
            LineStyle lineStyle = new LineStyle();
            lineStyle.setAlign(LineStyle.ALIGN_CENTER); // Căn giữa
            lineStyle.setTextSize(28);                   // Kích thước chữ 28
            lineStyle.setBold(true);                     // In đậm

            // Thực thi in dòng văn bản áp dụng LineStyle
            printer.lineApi().printText(text, lineStyle);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

#### 3.3 Hủy giải phóng tài nguyên an toàn (`Safe SDK Destroy`)

```java
public void safeDestroySdk() {
    try {
        // SDK v1.0.13+ đã fix lỗi crash khi gọi destroy() nhiều lần
        PrinterSdk.getInstance().destroy();
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Đảm bảo gọi `destroy()` nhiều lần liên tiếp không làm ném ngoại lệ `NullPointerException`.
- **Modules Kiểm thử**: `ZplPrintManager`, `LineStyleManager`, `PrinterXVersionManager`.
- **Seam Strategy**: Giả lập `IPrinterXVersionManager` để kiểm thử khả năng fallback khi chạy trên các phiên bản Print Service hệ thống cũ.

## Out of Scope

- Biên dịch lại các file firmware máy in nhiệt nội bộ của SUNMI.
- Sửa đổi trực tiếp các tập lệnh ZPL nâng cao chưa được bộ nạp ZPL hỗ trợ.

## Further Notes

- **Khuyến nghị nâng cấp**: Khuyến nghị tất cả các dự án đang dùng `com.sunmi:printerx` nên nâng cấp lên phiên bản tối thiểu **`v1.0.20`** để nhận đầy đủ các bản vá tương thích và tính năng bộ lệnh ZPL mới nhất.
