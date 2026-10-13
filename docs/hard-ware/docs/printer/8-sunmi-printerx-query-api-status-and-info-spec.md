# SUNMI PrinterX QueryApi Printer Status & Hardware Info Specification

## Proposed Seam

- **QueryApiDriver Seam (`IQueryApiDriver`)**: Seam nằm ở interface `printer.queryApi()`. Interface này bao bọc hai phương thức `getStatus()` và `getInfo(PrinterInfo)`. Seam giúp giả lập các trạng thái lỗi/cảnh báo phần cứng máy in (`Status.ERR_PAPER_OUT`, `Status.ERR_COVER`, `Status.WARN_THERMAL_PAPER`) và thông số metadata (`PrinterInfo.DISTANCE`, `CUTTER`) trong unit test mà không cần phần cứng thực tế.

## Problem Statement

Các ứng dụng POS/Kiosk cần theo dõi liên tục trạng thái sẵn sàng của máy in nhiệt trước khi đẩy dữ liệu in (tránh trường hợp in dở dang do hết giấy hoặc mở nắp), giám sát tuổi thọ linh kiện (tổng số mm giấy đã in, số lần cắt của dao cắt, số lần quá nhiệt), và nhận thông báo sự kiện phần cứng theo thời gian thực (Broadcast Receivers). Việc gọi `getStatus()` trực tiếp trên Main Thread có thể gây giật lag ứng dụng do thời gian phản hồi I/O chậm.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `QueryApi` thuộc SUNMI PrinterX SDK. Tài liệu tổng hợp toàn bộ bảng mã trạng thái lỗi (`ERR_*`) và cảnh báo (`WARN_*`), quy định nguyên tắc bắt buộc gọi `getStatus()` trên Background Thread, hướng dẫn đăng ký Broadcast Receiver cho 15 sự kiện máy in, và liệt kê các thông số kỹ thuật tra cứu qua `getInfo(PrinterInfo)`.

## User Stories

1. As a POS Checkout Service, I want to check `getStatus()` on a worker thread before printing a receipt, so that the user is alerted to reload paper (`ERR_PAPER_OUT`) or close the cover (`ERR_COVER`) before the print job starts.
2. As a Hardware Maintenance Service, I want to query cutter usage (`PrinterInfo.CUTTER`) and total print distance (`PrinterInfo.DISTANCE`), so that preventative maintenance is scheduled.
3. As a Kiosk UI Manager, I want to register a BroadcastReceiver for printer events (`woyou.aidlservice.jiuv5.*`), so that real-time status banners update instantly on screen.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `QueryApi`

- `Status getStatus()`: Truy vấn trạng thái phần cứng thời gian thực (Bắt buộc chạy trên Background Thread).
- `String getInfo(PrinterInfo info)`: Tra cứu thông tin cấu hình và thông số kỹ thuật của máy in.

---

### 2. Bảng Tra Cứu Trạng Thái Phần Cứng Máy In (`Status`)

#### a. Mã Trạng Thái Lỗi (ERR\_ Status - Ngăn cản việc in)

| Mã Trạng Thái Return          | Ý Nghĩa Chi Tiết                                     |
| :---------------------------- | :--------------------------------------------------- |
| `Status.READY`                | Máy in sẵn sàng hoạt động bình thường.               |
| `Status.OFFLINE`              | Máy in ngoại tuyến / Lỗi kết nối.                    |
| `Status.COMM`                 | Lỗi truyền thông giao tiếp với máy in.               |
| `Status.ERR_PAPER_OUT`        | Máy in bị hết giấy.                                  |
| `Status.ERR_PAPER_JAM`        | Kẹt giấy trong máy in.                               |
| `Status.ERR_PRINTER_HOT`      | Đầu in nhiệt bị quá nhiệt.                           |
| `Status.ERR_MOTOR_HOT`        | Mô-tơ máy in bị quá nhiệt.                           |
| `Status.ERR_COVER`            | Nắp khay chứa giấy đang mở.                          |
| `Status.ERR_COVER_INCOMPLETE` | Nắp khay giấy chưa được đóng kín hoàn toàn.          |
| `Status.ERR_CUTTER`           | Dao cắt tự động bị lỗi/kẹt (Dành cho máy có cutter). |

#### b. Mã Trạng Thái Cảnh Báo (WARN\_ Status - Không chặn việc in)

| Mã Trạng Thái Return        | Ý Nghĩa Chi Tiết                                                  |
| :-------------------------- | :---------------------------------------------------------------- |
| `Status.WARN_THERMAL_PAPER` | Giấy in nhiệt sắp hết (Cảnh báo vạch đỏ trên cuộn giấy).          |
| `Status.WARN_PICK_PAPER`    | Tem nhãn in xong chưa được bóc ra khỏi cảm biến (Dành cho S2LCC). |

---

### 3. Bảng Tra Cứu Thông Số Máy In (`PrinterInfo`)

| Tham số `PrinterInfo`  | Ý Nghĩa Thông Số                      | Ghi chú Trả về                                                     |
| :--------------------- | :------------------------------------ | :----------------------------------------------------------------- |
| `PrinterInfo.ID`       | Mã phiên bản phần cứng máy in         | Chuỗi ID phần cứng                                                 |
| `PrinterInfo.VERSION`  | Số phiên bản Firmware máy in          | Firmware version (Built-in only)                                   |
| `PrinterInfo.DISTANCE` | Tổng độ dài giấy đã in từ khi bật máy | Đơn vị: `mm`                                                       |
| `PrinterInfo.CUTTER`   | Tổng số lần dao cắt đã thực hiện      | Đếm số lần cắt (Cutter printers only)                              |
| `PrinterInfo.HOT`      | Số lần đầu in bị quá nhiệt            | Đếm số lần ném lỗi quá nhiệt                                       |
| `PrinterInfo.DENSITY`  | Mức độ đậm hiện tại                   | Đơn vị % (`70%` đến `130%`)                                        |
| `PrinterInfo.TYPE`     | Loại chế độ máy in hiện tại           | `0`: Thermal, `1`: Black mark, `2`: Label, `3`: Stylus, `4`: Laser |
| `PrinterInfo.PAPER`    | Khổ giấy hỗ trợ hiện tại              | Trả về chuỗi `"58mm"` hoặc `"80mm"`                                |

---

### 4. Sample Code - Truy vấn Trạng thái Máy In trên Background Thread

```java
package com.sm.sdk.demo.printerx;

import android.util.Log;
import com.sunmi.printerx.PrinterSdk;
import com.sunmi.printerx.Printer;
import com.sunmi.printerx.enums.Status;
import com.sunmi.printerx.enums.PrinterInfo;

public class PrinterQueryManager {

    private static final String TAG = "PrinterQuery";

    /**
     * BẮT BUỘC: Kiểm tra trạng thái máy in trên Worker Thread trước khi in
     */
    public void checkPrinterStatusAsync(OnStatusCheckedListener listener) {
        new Thread(() -> {
            Printer printer = PrinterSdk.getInstance().getPrinter();
            if (printer == null) {
                if (listener != null) listener.onStatus(Status.OFFLINE);
                return;
            }

            try {
                // 1. Gọi getStatus() trên Background Thread
                Status status = printer.queryApi().getStatus();
                Log.d(TAG, "Printer Real-time Status: " + status.name());

                if (listener != null) {
                    listener.onStatus(status);
                }

            } catch (Exception e) {
                Log.e(TAG, "Failed to query printer status", e);
                if (listener != null) listener.onStatus(Status.OFFLINE);
            }
        }).start();
    }

    /**
     * Truy vấn thông số tuổi thọ máy in (Độ dài đã in mm, Số lần cắt cutter)
     */
    public void queryPrinterMetadata() {
        Printer printer = PrinterSdk.getInstance().getPrinter();
        if (printer == null) return;

        try {
            String distance = printer.queryApi().getInfo(PrinterInfo.DISTANCE); // e.g. "12500" mm
            String cuts     = printer.queryApi().getInfo(PrinterInfo.CUTTER);   // e.g. "450"
            String paper    = printer.queryApi().getInfo(PrinterInfo.PAPER);    // e.g. "80mm"
            String density  = printer.queryApi().getInfo(PrinterInfo.DENSITY);  // e.g. "100%"

            Log.d(TAG, "Print Distance: " + distance + "mm, Cutter Usage: " + cuts + " times");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public interface OnStatusCheckedListener {
        void onStatus(Status status);
    }
}
```

---

### 5. Sample Code - Đăng Ký Broadcast Receiver Nhận Sự Kiện Trực Tiếp

```java
package com.sm.sdk.demo.printerx;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.widget.Toast;

public class PrinterEventReceiver extends BroadcastReceiver {

    public static IntentFilter getIntentFilter() {
        IntentFilter filter = new IntentFilter();
        filter.addAction("woyou.aidlservice.jiuv5.NORMAL_ACTION");
        filter.addAction("woyou.aidlservice.jiuv5.OUT_OF_PAPER_ACTION");
        filter.addAction("woyou.aidlservice.jiuv5.COVER_OPEN_ACTION");
        filter.addAction("woyou.aidlservice.jiuv5.OVER_HEATING_ACITON");
        filter.addAction("woyou.aidlservice.jiuv5.KNIFE_ERROR_ACTION_1");
        return filter;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        switch (action) {
            case "woyou.aidlservice.jiuv5.NORMAL_ACTION":
                // Máy in sẵn sàng
                break;
            case "woyou.aidlservice.jiuv5.OUT_OF_PAPER_ACTION":
                Toast.makeText(context, "Cảnh báo: Máy in đã hết giấy!", Toast.LENGTH_LONG).show();
                break;
            case "woyou.aidlservice.jiuv5.COVER_OPEN_ACTION":
                Toast.makeText(context, "Cảnh báo: Nắp khay giấy đang mở!", Toast.LENGTH_LONG).show();
                break;
        }
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc parse mã trả về từ `getStatus()` phản ánh đúng nhóm `ERR_*` hoặc `WARN_*`.
- **Modules Kiểm thử**: `PrinterQueryManager`, `PrinterEventReceiver`.
- **Seam Strategy**: Giả lập `IQueryApiDriver` để return `Status.ERR_PAPER_OUT` hoặc `Status.ERR_COVER` trong Unit Test.

## Out of Scope

- Sửa đổi trực tiếp dữ liệu đếm kilomet in `DISTANCE` lưu trong phần cứng NVRAM.
- Khôi phục máy in từ lỗi kẹt dao cắt cứng ngoài việc thao tác cơ học.

## Further Notes

- **Lưu ý hiệu năng**: Hàm `getStatus()` thực thi các phép đo đọc cổng I/O phần cứng tốn thời gian. **Tuyệt đối không gọi liên tục trong vòng lặp (Polling loop) trên Main UI Thread**.
