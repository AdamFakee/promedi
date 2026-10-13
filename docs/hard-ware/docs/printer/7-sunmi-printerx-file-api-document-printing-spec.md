# SUNMI PrinterX FileApi PDF & Document Printing Specification

## Proposed Seam

- **FileApiDriver Seam (`IFileApiDriver`)**: Seam nằm ở interface `printer.fileApi()`. Interface này bao bọc các hàm in tài liệu trực tiếp (`printFile`). Seam hỗ trợ giả lập việc xử lý file (Local path, URI, Network HTTP URL), nạp tham số `FileStyle`, và mock kết quả callback `PrintResult` trong unit test mà không cần kết nối tới máy in văn phòng thật.

## Problem Statement

Các ứng dụng doanh nghiệp, ngân hàng và văn phòng trên hệ sinh thái SUNMI cần in trực tiếp các file văn bản PDF, tài liệu báo cáo, hoặc ảnh JPEG mà không muốn tự viết bộ chuyển đổi từng trang PDF thành Bitmap thủ công. Việc in file trực tiếp yêu cầu hỗ trợ nhiều nguồn file (Local File, Content URI, HTTP URL), thiết lập số bản in (Copies), chế độ in 2 mặt (Duplex), in chia bộ (Collate), và chọn khoảng trang in (`setFileStart` đến `setFileEnd`).

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `FileApi` thuộc SUNMI PrinterX SDK. Tài liệu liệt kê danh sách phần cứng máy in văn phòng được hỗ trợ (PANTUM P3017D/CP1100/BP5126DN, HPRT U100), định dạng đường dẫn file linh hoạt (Local, URI, URL mạng), các hàm cấu hình `FileStyle`, và mã nguồn mẫu Java in tài liệu PDF đa trang hoàn chỉnh.

## User Stories

1. As an Enterprise App Developer, I want to pass a public HTTP URL or local file path to `printFile()`, so that remote PDF invoices can be printed directly on connected office printers.
2. As an Office Manager, I want to configure multi-copy collation (`setFileCollate`), page range selection (`setFileStart` to `setFileEnd`), and duplex printing (`setFileDuplex`), so that large PDF reports are printed neatly.
3. As a Mobile Worker, I want asynchronous execution callbacks (`PrintResult`), so that the app receives immediate confirmation when file rendering succeeds or fails.

## Implementation Decisions

### 1. Phạm vi Phần cứng Hỗ trợ (Hardware Coverage)

`FileApi` chuyên dụng tương thích với các dòng máy in văn phòng kết nối với thiết bị SUNMI:

- **Dòng máy in PANTUM**: P3017D, CP1100, BP5126DN.
- **Dòng máy in HPRT**: U100.

---

### 2. Các Loại Đường Dẫn File Nạp vào (`Path Types`)

Hàm `printFile(path, style, listener)` chấp nhận 3 định dạng đường dẫn:

1. **Đường dẫn file tuyệt đối cục bộ**: `/sdcard/Download/invoice.pdf`
2. **Local URI**: `content://com.android.providers.downloads.documents/document/12`
3. **HTTP/HTTPS Network URL**: `https://example.com/docs/report.pdf` (SDK sẽ tự động tải file ngầm trước khi gửi tới máy in).

---

### 3. Bảng Tham số Cấu hình `FileStyle`

| Phương thức trong `FileStyle`      | Mô tả Chức năng                                 | Giá trị Tham số                                     | Mặc định         |
| :--------------------------------- | :---------------------------------------------- | :-------------------------------------------------- | :--------------- |
| `setFileCopies(int copies)`        | Thiết lập số bản copy cần in                    | Số nguyên > 0                                       | `1` copy         |
| `setFileDuplex(FileDuplex duplex)` | Thiết lập in 1 mặt hoặc 2 mặt tự động           | `SINGLE` (1 mặt), `DUPLEX` (2 mặt)                  | `SINGLE`         |
| `setFileRotate(Rotate rotate)`     | Thiết lập hướng xoay trang in                   | `ROTATE_0`, `ROTATE_90`, `ROTATE_180`, `ROTATE_270` | `ROTATE_0`       |
| `setFileCollate(boolean collate)`  | In chia bộ theo từng bản copy (PDF nhiều trang) | `true` (In từng bộ 1..N), `false` (In lặp trang)    | `true`           |
| `setFileStart(int startPage)`      | Trang bắt đầu in (1-based index)                | Số trang >= 1                                       | `0` (Trang đầu)  |
| `setFileEnd(int endPage)`          | Trang kết thúc in                               | Số trang >= 1                                       | `0` (Trang cuối) |

---

### 4. Sample Code - In File PDF Từ Đường Dẫn Cục Bộ Hoặc Network URL

```java
package com.sm.sdk.demo.printerx;

import android.os.RemoteException;
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;
import com.sunmi.printerx.style.FileStyle;
import com.sunmi.printerx.enums.Rotate;
import com.sunmi.printerx.enums.FileDuplex;
import com.sunmi.printerx.api.PrintResult;

public class PdfDocumentPrintManager {

    /**
     * In file PDF tài liệu với cấu hình 4 bản copy, in từ trang 1 đến trang 4, in 1 mặt
     *
     * @param filePath Đường dẫn file tuyệt đối hoặc HTTP URL (https://...)
     */
    public void printPdfDocument(String filePath) {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null || filePath == null) return;

        try {
            // 1. Cấu hình FileStyle
            FileStyle fileStyle = FileStyle.getStyle()
                .setFileCopies(4)                        // In 4 bản copy
                .setFileStart(1)                         // Bắt đầu từ trang 1
                .setFileEnd(4)                           // Kết thúc ở trang 4
                .setFileCollate(true)                    // In chia bộ từng bản
                .setFileRotate(Rotate.ROTATE_0)          // Không xoay hướng trang
                .setFileDuplex(FileDuplex.SINGLE);       // In 1 mặt

            // 2. Thực thi in file và nhận callback kết quả
            printer.fileApi().printFile(filePath, fileStyle, new PrintResult() {
                @Override
                public void onResult(int resultCode, String message) throws RemoteException {
                    if (resultCode == 0) {
                        // In file PDF thành công
                    } else {
                        // Lỗi khi in file (e.g. Không mở được file, sai định dạng, máy in mất kết nối)
                    }
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc truyền đường dẫn file rỗng `""` hoặc null ném ra xử lý lỗi an toàn không crash app.
- **Modules Kiểm thử**: `PdfDocumentPrintManager`, `FileStyleConfigurator`.
- **Seam Strategy**: Giả lập `IFileApiDriver` để mock kết quả `onResult(0, "Success")` trong Unit Test.

## Out of Scope

- Chỉnh sửa nội dung văn bản bên trong file PDF trước khi in.
- In trực tiếp trên các dòng máy in không tương thích thuộc danh mục unsupported hardware.

## Further Notes

- **Tải file ngầm khi truyền URL**: Khi truyền đường dẫn `https://...`, SDK sẽ thực hiện tải file về bộ nhớ tạm trước khi nạp vào máy in. Đảm bảo ứng dụng có quyền `INTERNET` trong `AndroidManifest.xml`.
