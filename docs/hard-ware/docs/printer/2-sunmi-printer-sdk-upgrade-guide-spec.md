# SUNMI Printer SDK Upgrade & Command Comparison Specification

## Proposed Seam

- **PrinterCommandDriver Seam (`IPrinterCommandDriver`)**: Seam nằm ở lớp định tuyến lệnh in (`ESC/POS` vs `TSPL` label command driver). Seam này đóng gói việc phát sinh và gửi các gói lệnh in ấn (Thermal Receipt vs Thermal Label vs Cloud Printer), hỗ trợ mock và kiểm thử việc biên dịch lệnh in trong unit test mà không cần phần cứng in thật.

## Problem Statement

Phiên bản SUNMI Printer SDK cũ bị giới hạn ở việc chỉ hỗ trợ in hóa đơn nhiệt dạng dòng (Print by line), chỉ hỗ trợ lệnh chuẩn ESC/POS, và chỉ chạy được trên máy in tích hợp sẵn. Nhà phát triển muốn nâng cấp lên phiên bản SDK mới để hỗ trợ in tem nhãn (Thermal Label Printer), máy in file (File Printer), máy in đám mây (Cloud Printer), và sử dụng bộ lệnh TSPL cho in nhãn hàng hóa nhưng thiếu tài liệu so sánh và hướng dẫn nâng cấp mã nguồn.

## Solution

Cung cấp đặc tả nâng cấp và chuyển đổi (Upgrade & Migration Specification) cho SUNMI Printer SDK. Tài liệu so sánh chi tiết giữa SDK cũ và SDK mới, hướng dẫn tích hợp bộ lệnh TSPL cho in tem nhãn, hỗ trợ đa loại máy in (Receipt/Label/Cloud), và cung cấp mã nguồn mẫu Java chuyển đổi luồng in.

## User Stories

1. As a Retail Store Developer, I want to upgrade to the new SUNMI Printer SDK, so that I can print both thermal checkout receipts (ESC/POS) and product price barcodes/labels (TSPL) from the same application.
2. As a Cloud Logistics Engineer, I want the SDK to support cloud-connected printers and file printers, so that order invoices can be dispatched to remote warehouse printers.
3. As a POS System Architect, I want a unified command abstraction layer (`IPrinterCommandDriver`), so that switching between receipt mode and label mode requires zero changes to core business logic.

## Implementation Decisions

### 1. Bảng So sánh Chi tiết SDK Cũ vs SDK Mới (SDK Comparison Matrix)

| Tiêu chí So sánh       | Phiên bản SDK Cũ (Old Version)                                        | Phiên bản SDK Mới (New Version)                                                                |
| :--------------------- | :-------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **Loại Máy in Hỗ trợ** | Chỉ hỗ trợ máy in hóa đơn nhiệt (Receipt printer); in theo từng dòng. | Hỗ trợ đa dạng: Máy in hóa đơn nhiệt, Máy in tem nhãn nhiệt (Label printer), Máy in File, v.v. |
| **Phạm vi Phủ sóng**   | Chỉ dùng cho máy in tích hợp sẵn (Built-in printer) của SUNMI.        | Hỗ trợ tất cả thiết bị SUNMI và hỗ trợ kết nối Máy in Đám mây (Cloud Printer).                 |
| **Bộ Lệnh Hỗ trợ**     | Chỉ hỗ trợ bộ lệnh tiêu chuẩn `ESC/POS`.                              | Hỗ trợ bộ lệnh `ESC/POS` và `TSPL` (in nhãn), sẽ mở rộng thêm các lệnh mới.                    |
| **Tính Dễ sử dụng**    | Phức tạp và khó khăn khi tạo các bố cục giao diện in phức tạp.        | Đơn giản, linh hoạt và dễ dàng xây dựng bố cục in phức tạp.                                    |

---

### 2. Sample Code - Cấu hình Phân loại Máy in & Chế độ In (Receipt vs Label Mode)

#### Định nghĩa Enum Loại Máy in & Command Driver:

```java
package com.sm.sdk.demo.printer;

public enum PrinterType {
    THERMAL_RECEIPT, // In hóa đơn nhiệt (ESC/POS)
    THERMAL_LABEL,   // In tem nhãn nhiệt (TSPL)
    CLOUD_PRINTER,   // Máy in đám mây qua mạng
    FILE_PRINTER     // Máy in xuất file
}
```

#### Driver Chuyển đổi và Xử lý Lệnh in TSPL (In Tem nhãn Giá / Barcode Label):

```java
package com.sm.sdk.demo.printer;

import com.sunmi.peripheral.printer.SunmiPrinterService;

public class SunmiLabelPrintManager {

    /**
     * In tem nhãn giá sản phẩm bằng bộ lệnh TSPL (Chỉ có trên SDK mới)
     *
     * @param productName Tên sản phẩm
     * @param price       Giá bán (VND)
     * @param barcodeData Mã vạch sản phẩm
     */
    public void printProductLabelTSPL(String productName, String price, String barcodeData) {
        SunmiPrinterService printer = SunmiPrintManager.getInstance().getPrinterService();
        if (printer == null) return;

        try {
            // Khởi tạo khung lệnh TSPL cho tem nhãn 40mm x 30mm
            StringBuilder tsplCmd = new StringBuilder();
            tsplCmd.append("SIZE 40 mm, 30 mm\n"); // Kích thước tem
            tsplCmd.append("GAP 2 mm, 0 mm\n");     // Khoảng cách giữa các tem
            tsplCmd.append("CLS\n");                // Xóa bộ nhớ đệm tem

            // In Tên sản phẩm tại tọa độ X=20, Y=20
            tsplCmd.append("TEXT 20,20,\"TSS24.BF2\",0,1,1,\"" + productName + "\"\n");

            // In Giá bán tại tọa độ X=20, Y=60
            tsplCmd.append("TEXT 20,60,\"TSS24.BF2\",0,1,1,\"Gia: " + price + " VND\"\n");

            // In Mã vạch Code128 tại tọa độ X=20, Y=100, chiều cao 50dot
            tsplCmd.append("BARCODE 20,100,\"128\",50,1,0,2,2,\"" + barcodeData + "\"\n");

            // Thực thi in 1 bản tem
            tsplCmd.append("PRINT 1,1\n");

            // Gửi dữ liệu RAW TSPL tới máy in qua SDK mới
            byte[] tsplBytes = tsplCmd.toString().getBytes("GBK");
            printer.sendRAWData(tsplBytes, null);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

---

### 3. Sample Code - Chuyển đổi Luồng In giữa Máy in Tích hợp & Cloud Printer

```java
public class MultiPrinterRouter {

    public void dispatchPrintJob(PrinterType type, String printContent) {
        switch (type) {
            case THERMAL_RECEIPT:
                // Sử dụng lệnh ESC/POS in hóa đơn thông thường
                SunmiPrintManager.getInstance().getPrinterService();
                // Execute ESC/POS print...
                break;

            case THERMAL_LABEL:
                // Sử dụng driver TSPL in tem nhãn
                new SunmiLabelPrintManager().printProductLabelTSPL("Sữa tươi 1L", "35.000", "893456789012");
                break;

            case CLOUD_PRINTER:
                // Đóng gói payload gửi qua Cloud API
                sendToCloudPrinterServer(printContent);
                break;
        }
    }

    private void sendToCloudPrinterServer(String content) {
        // Gửi payload qua HTTP/WebSocket tới SUNMI Cloud Printer API
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử mã hóa mảng byte lệnh TSPL và ESC/POS được tạo ra khớp với cấu trúc định dạng chuẩn.
- **Modules Kiểm thử**: `SunmiLabelPrintManager`, `MultiPrinterRouter`, `PrinterCommandDriver`.
- **Seam Strategy**: Giả lập `IPrinterCommandDriver` để kiểm tra mảng byte `sendRAWData` phát ra từ chế độ in hóa đơn vs chế độ in tem nhãn trong Unit Test.

## Out of Scope

- Tự định nghĩa lại tập lệnh phần cứng máy in nhiệt ngoài chuẩn ESC/POS và TSPL.
- Quản lý hạ tầng mạng máy chủ SUNMI Cloud Printer.

## Further Notes

- **Khuyến nghị**: Khi phát triển các ứng dụng POS/Kiosk mới, luôn ưu tiên tích hợp SDK bản mới (`com.sunmi:printerlibrary:1.0.23` trở lên) để đảm bảo khả năng tương thích ngược và mở rộng in tem nhãn/Cloud Printer về sau.
