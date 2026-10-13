# SUNMI PrinterX CashDrawerApi Cash Drawer Control Specification

## Proposed Seam

- **CashDrawerApiDriver Seam (`ICashDrawerApiDriver`)**: Seam nằm ở interface `printer.cashDrawerApi()`. Interface này bao bọc hai phương thức điều khiển két tiền thu ngân: `open(PrintResult)` và `isOpen()`. Seam cho phép giả lập việc bật két tiền và mock trạng thái đóng/mở của két tiền trong unit test mà không cần cắm két tiền phần cứng qua cổng RJ11/RJ12.

## Problem Statement

Các điểm bán hàng (POS) siêu thị, nhà hàng, và cửa hàng bán lẻ trên máy SUNMI cần tự động mở két tiền thu ngân (Cash Drawer) ngay sau khi hoàn tất giao dịch thanh toán bằng tiền mặt (Cash Payment). Đồng thời, ứng dụng cần khả năng phát hiện xem két tiền đang ở trạng thái đóng hay mở (`isOpen()`) để đưa ra cảnh báo cho thu ngân đóng két tiền nhằm đảm bảo an toàn tài sản. Gọi API này trên các thiết bị không có cổng cắm két tiền phần cứng có thể ném ra ngoại lệ.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CashDrawerApi` thuộc SUNMI PrinterX SDK. Tài liệu giải thích cơ chế xung điện kích mở két qua cổng RJ11/RJ12, hướng dẫn sử dụng callback `PrintResult` để nhận thông tin kích mở thành công hay thất bại, kiểm tra trạng thái đóng/mở công tắc cảm biến két tiền, và cung cấp mã nguồn mẫu Java cho luồng thanh toán POS.

## User Stories

1. As a Cashier POS App, I want to trigger `cashDrawerApi().open()` automatically after printing a cash payment receipt, so that the physical cash drawer opens immediately for change distribution.
2. As a Store Security Manager, I want to query `isOpen()`, so that cashiers receive a warning toast or sound alert if the cash drawer is left open for too long.
3. As an Application Developer, I want asynchronous execution callbacks (`PrintResult`), so that potential hardware pulse failures are caught cleanly.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `CashDrawerApi`

- `void open(PrintResult resultListener)`: Kích hoạt xung điện mở két tiền thu ngân kết nối qua cổng RJ11/RJ12.
- `boolean isOpen()`: Truy vấn trạng thái đóng/mở thời gian thực của két tiền (`true`: Đang mở, `false`: Đã đóng).

---

### 2. Hạn chế Phần cứng & Thiết bị Hỗ trợ (Service Restrictions)

- **Cổng kết nối RJ11 / RJ12**: Tính năng điều khiển két tiền yêu cầu thiết bị SUNMI (như dòng máy để bàn T2, T3, D2, D3...) có tích hợp cổng cắm két tiền chuẩn RJ11/RJ12.
- **Xử lý Ngoại lệ**: Trên các dòng máy POS cầm tay không có cổng cắm két tiền (như V2, V2s, P2...), việc gọi `cashDrawerApi()` có thể ném ngoại lệ SDK Exception. Bắt buộc bao bọc lệnh gọi trong khối `try-catch`.

---

### 3. Sample Code - Mở Két Tiền & Xử lý Kết quả Callback (`open`)

```java
package com.sm.sdk.demo.printerx;

import android.os.RemoteException;
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;
import com.sunmi.printerx.api.PrintResult;

public class CashDrawerManager {

    /**
     * Mở két tiền thu ngân và nhận callback kết quả
     */
    public void triggerOpenCashDrawer(OnCashDrawerOpenedListener listener) {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null) return;

        try {
            // Truyền callback PrintResult để nhận thông tin kích mở
            printer.cashDrawerApi().open(new PrintResult() {
                @Override
                public void onResult(int resultCode, String message) throws RemoteException {
                    if (resultCode == 0) {
                        // Kích mở két tiền thành công
                        if (listener != null) listener.onSuccess();
                    } else {
                        // Kích mở thất bại (Do thiết bị không hỗ trợ hoặc lỗi phần cứng)
                        if (listener != null) listener.onFailure(resultCode, message);
                    }
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
            if (listener != null) listener.onFailure(-1, e.getMessage());
        }
    }

    public interface OnCashDrawerOpenedListener {
        void onSuccess();
        void onFailure(int resultCode, String message);
    }
}
```

---

### 4. Sample Code - Truy vấn Trạng thái Đóng/Mở Két Tiền (`isOpen`)

```java
package com.sm.sdk.demo.printerx;

import android.content.Context;
import android.widget.Toast;
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;

public class CashDrawerStatusChecker {

    /**
     * Kiểm tra két tiền đang mở hay đóng
     */
    public void checkAndAlertDrawerStatus(Context context) {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null) return;

        try {
            // Đọc trạng thái đóng/mở két tiền thời gian thực
            boolean isOpen = printer.cashDrawerApi().isOpen();

            if (isOpen) {
                Toast.makeText(context, "Cảnh báo: Két tiền đang MỞ! Vui lòng đóng két.", Toast.LENGTH_LONG).show();
            } else {
                Toast.makeText(context, "Trạng thái: Két tiền đang ĐÓNG an toàn.", Toast.LENGTH_SHORT).show();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `isOpen()` không ném ngoại lệ khi mock trạng thái trả về `true` hoặc `false`.
- **Modules Kiểm thử**: `CashDrawerManager`, `CashDrawerStatusChecker`.
- **Seam Strategy**: Giả lập `ICashDrawerApiDriver` để mock hai phương thức `open()` và `isOpen()` trong Unit Test.

## Out of Scope

- Tự động thay đổi điện áp xung (12V / 24V) của cổng cắm két tiền phần cứng.
- Điều khiển các két tiền cơ học độc lập không cắm qua cổng RJ11/RJ12 của máy SUNMI.

## Further Notes

- **Khuyến nghị POS**: Trong luồng thanh toán bằng tiền mặt, nên kết hợp lệnh in hóa đơn `autoOut()` với lệnh `cashDrawerApi().open()` để tối ưu tốc độ phục vụ khách hàng.
