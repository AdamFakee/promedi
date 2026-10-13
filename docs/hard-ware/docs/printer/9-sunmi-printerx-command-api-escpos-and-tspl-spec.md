# SUNMI PrinterX CommandApi ESC/POS & TSPL Instruction Sets Specification

## Proposed Seam

- **CommandApiDriver Seam (`ICommandApiDriver`)**: Seam nằm ở interface `printer.commandApi()`. Interface này bao bọc hai phương thức truyền lệnh thô: `sendEscCommand(byte[] esc)` và `sendTsplCommand(byte[] tspl)`. Seam cho phép bắt mảng byte dữ liệu lệnh, kiểm tra mã hóa bảng ký tự (GB18030 / US-ASCII / GBK), và mock kết quả truyền lệnh thô trong unit test mà không cần cổng nạp phần cứng máy in.

## Problem Statement

Nhiều ứng dụng bán hàng legacy và phần mềm quản lý kho đã xây dựng sẵn bộ sinh mã lệnh in thô (RAW Command Generators) bằng chuẩn ESC/POS (in hóa đơn nhiệt) hoặc chuẩn TSPL (in tem nhãn Zebra/TSC). Khi chuyển đổi sang hệ thống SUNMI PrinterX SDK, nhà phát triển cần phương thức truyền thẳng byte lệnh (Passthrough Mode) vào máy in mà không phải thông qua các API vẽ cao cấp (`LineApi` hay `CanvasApi`). Ngoài ra, việc gửi lệnh TSPL đòi hỏi kiểm tra khả năng hỗ trợ tem nhãn của thiết bị và đảm bảo máy in đã chuyển sang Label Mode.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CommandApi` thuộc SUNMI PrinterX SDK. Tài liệu giải thích cơ chế Passthrough cho lệnh `ESC/POS` và `TSPL`, quy định chuẩn mã hóa ký tự mặc định (`GB18030` cho ESC/POS), điều kiện chuyển đổi chế độ Label Mode cho máy in tích hợp SUNMI (như V2s, V2s Plus), và cung cấp mã nguồn mẫu Java hoàn chỉnh cho cả hai bộ lệnh.

## User Stories

1. As a Legacy POS Migrator, I want to send pre-compiled ESC/POS byte streams using `sendEscCommand()`, so that existing receipt templates require zero rewrites.
2. As a Warehouse Labeling Systems Developer, I want to transmit TSPL command strings via `sendTsplCommand()`, so that barcode shipping labels are rendered directly on SUNMI label printers.
3. As an International Integration Lead, I want to verify encoding settings (`GB18030` vs `UTF-8` vs `GBK`), so that multi-language characters and symbols are printed accurately without corrupting ESC formatting.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `CommandApi`

- `void sendEscCommand(byte[] esc)`: Gửi mảng byte lệnh chuẩn `ESC/POS` (Chuyên dụng in hóa đơn nhiệt).
- `void sendTsplCommand(byte[] tspl)`: Gửi mảng byte lệnh chuẩn `TSPL` (Chuyên dụng in tem nhãn nhiệt).

---

### 2. So sánh & Hạn chế Máy in (Service Restrictions)

| Bộ Lệnh (Instruction Set) | Máy in Tích hợp SUNMI (Built-in)                           | Máy in Ngoại vi (External Printers) | Mã hóa Ký tự Mặc định           |
| :------------------------ | :--------------------------------------------------------- | :---------------------------------- | :------------------------------ |
| **ESC/POS**               | Hỗ trợ tất cả các dòng máy                                 | Hỗ trợ                              | `GB18030` (Tự động băm văn bản) |
| **TSPL**                  | Hỗ trợ trên các dòng in tem nhãn (V2s, V2s Plus, S2LCC...) | Chưa hỗ trợ                         | `US-ASCII` / `GBK`              |

---

### 3. Sample Code - Truyền Lệnh In Hóa Đơn Nhiệt `ESC/POS` (`sendEscCommand`)

```java
package com.sm.sdk.demo.printerx;

import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;
import java.io.ByteArrayOutputStream;

public class EscPosCommandManager {

    /**
     * Gửi mảng byte lệnh ESC/POS in hóa đơn căn giữa và cắt giấy
     */
    public void printEscPosReceipt() {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null) return;

        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();

            // 1. Lệnh Khởi tạo máy in ESC @ (0x1B 0x40)
            bytes.write(new byte[]{0x1B, 0x40});

            // 2. Lệnh Căn giữa văn bản ESC a 1 (0x1B 0x61 0x01)
            bytes.write(new byte[]{0x1B, 0x61, 0x01});

            // 3. Nội dung văn bản in (Mã hóa GB18030)
            String text = "NHÀ HÀNG SUNMI POS\nĐC: 123 NGUYỄN TRÃI, Q.1\n\n";
            bytes.write(text.getBytes("GB18030"));

            // 4. Lệnh Cắt giấy tự động GS V 66 0 (0x1D 0x56 0x42 0x00)
            bytes.write(new byte[]{0x1D, 0x56, 0x42, 0x00});

            // 5. Gửi mảng byte ESC/POS vào CommandApi
            printer.commandApi().sendEscCommand(bytes.toByteArray());

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

---

### 4. Sample Code - Truyền Lệnh In Tem Nhãn Nhiệt `TSPL` (`sendTsplCommand`)

```java
package com.sm.sdk.demo.printerx;

import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;
import java.nio.charset.StandardCharsets;

public class TsplCommandManager {

    /**
     * Gửi chuỗi lệnh TSPL in tem nhãn sản phẩm (Yêu cầu thiết bị đã ở Label Mode)
     */
    public void printTsplLabel() {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null) return;

        try {
            // Chuỗi mã lệnh TSPL tiêu chuẩn
            StringBuilder tspl = new StringBuilder();
            tspl.append("SIZE 40 mm, 30 mm\n");                        // Kích thước nhãn 40x30mm
            tspl.append("GAP 2 mm, 0 mm\n");                            // Khoảng cách nhãn 2mm
            tspl.append("CLS\n");                                       // Xóa đệm canvas TSPL
            tspl.append("TEXT 30,20,\"TSS24.BF2\",0,1,1,\"TRA SUA O LONG\"\n"); // Văn bản tiếng Việt
            tspl.append("BARCODE 30,70,\"128\",50,1,0,2,2,\"893456789\"\n");    // Mã vạch Code128
            tspl.append("PRINT 1,1\n");                                 // In 1 bản

            // Mã hóa chuỗi lệnh TSPL dạng mảng byte (StandardCharsets.US_ASCII hoặc GBK)
            byte[] tsplBytes = tspl.toString().getBytes(StandardCharsets.US_ASCII);

            // Gửi mảng byte TSPL vào CommandApi
            printer.commandApi().sendTsplCommand(tsplBytes);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc truyền mảng byte rỗng hoặc null không ném ngoại lệ không mong muốn.
- **Modules Kiểm thử**: `EscPosCommandManager`, `TsplCommandManager`.
- **Seam Strategy**: Giả lập `ICommandApiDriver` để bắt và kiểm tra cấu trúc mảng byte nạp qua `sendEscCommand` và `sendTsplCommand` trong Unit Test.

## Out of Scope

- Tự động biên dịch cú pháp lệnh TSPL sai định dạng từ phía lập trình viên.
- Chuyển đổi qua lại giữa ESC/POS và TSPL trên các máy in ngoại vi không hỗ trợ.

## Further Notes

- **Lưu ý Label Mode cho V2s / V2s Plus**: Trước khi gọi `sendTsplCommand()`, bắt buộc đảm bảo ứng dụng đã kích hoạt chuyển chế độ máy in sang Label Mode (Xem hướng dẫn Intent tại Spec 6 - `CanvasApi`).
