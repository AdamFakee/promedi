# SUNMI Customer API - Log Management Module Specification

## Proposed Seam

- **LogcatManager Seam (`ILogcatManager`)**: Seam nằm ở interface `sTmsApi.getLogcatManager()`. Interface này bao bọc 8 API quản lý log hệ thống và log ứng dụng (Bật/Tắt AppLog function, Thêm/Xóa package ghi log, Đóng gói log ra file ZIP/TXT theo loại hoặc theo khoảng thời gian). Seam giúp giả lập quá trình đóng gói log và callback `IResultCallback` trong unit test mà không phải đọc file log thật từ hệ điều hành.

## Problem Statement

Các ứng dụng thương mại POS/Kiosk và dịch vụ hỗ trợ kỹ thuật từ xa (Remote Troubleshooting) cần khả năng bật tính năng ghi nhật ký (`enableAppLogFunction`), đăng ký danh sách các package ứng dụng cần thu thập log (`addPackageNameToAppLog`), nén các file log hệ thống (Logcat `syslog`, Kernel `klog`, Modem log) thành file ZIP (`packLogsByType`), và trích xuất nhật ký theo khoảng ngày chỉ định (`getSysLogByDate`). Việc thiếu tài liệu đặc tả và mã nguồn mẫu chuẩn sẽ gây ra lỗi phân quyền (SecurityException mã lỗi `-45` do UID <= 10000) hoặc lỗi lưu file không đúng đường dẫn bộ nhớ ngoài.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `Log Management Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 8 APIs, quy định điều kiện cấp quyền ứng dụng (UID > 10000), bảng mã các loại log (1: devicelog, 48: syslog, 49: klog), lưu ý đường dẫn xuất file nén (`/sdcard/Download/...`), và cung cấp mã nguồn mẫu Java cho toàn bộ các hàm.

## User Stories

1. As a Technical Support Engineer, I want to add my application package name to the log output list (`addPackageNameToAppLog`), so that application runtime logs are recorded automatically.
2. As a Remote Diagnostics System, I want to package system and kernel logs into a ZIP file (`packLogsByType`), so that technicians can download log archives for offline analysis.
3. As a Quality Assurance Auditor, I want to export system logs by date range (`getSysLogByDate`), so that store incidents occurring on specific days can be investigated.

## Implementation Decisions

### 1. Phân nhóm 8 APIs thuộc `Log Management Module`

#### Group 1: Bật/Tắt & Quản lý Danh sách Package Ghi Log (App Log Whitelist & Function Toggle)

- `enableAppLogFunction(boolean enable)`: Bật/Tắt công tắc lưu nhật ký ứng dụng vào applog.
- `isAppLogFunctionEnabled()`: Kiểm tra trạng thái công tắc AppLog.
- `addPackageNameToAppLog(String packageName)`: Thêm package ứng dụng thường vào danh sách thu thập log (Yêu cầu UID > 10000).
- `deletePackageNameFromAppLog(String packageName)`: Xóa package khỏi danh sách thu thập log.
- `getPackageNameFromAppLog()`: Đọc danh sách package đang được thu thập log.

#### Group 2: Đóng gói & Trích xuất Log (Log Packaging & Export)

- `packAppLog(IResultCallback callBack)`: Đóng gói toàn bộ app log và trả về đường dẫn file nén.
- `packLogsByType(List<String> types, String outputPath, IResultCallback callback)`: Đóng gói log theo phân loại vào file ZIP trên `/sdcard/`.
- `getSysLogByDate(startDate, endDate, outputPath, callback)`: Trích xuất log hệ thống theo khoảng ngày `yyyy-MM-dd` ra file `.txt`.

---

### 2. Bảng Tra Cứu Loại Log (`packLogsByType`)

| Mã Type | Tên Loại Log | Mô tả chi tiết                                                      |
| :------ | :----------- | :------------------------------------------------------------------ |
| `1`     | `devicelog`  | Toàn bộ nhật ký Logcat thiết bị (Nén từ `/data/sunmilog/devicelog`) |
| `2`     | `modemlog`   | Log modem di động (Mặc định không bật)                              |
| `3`     | `netlog`     | Log mạng (Chưa hỗ trợ)                                              |
| `4`     | `btlog`      | Log Bluetooth (Chưa hỗ trợ)                                         |
| `5`     | `sphslog`    | Log mô-đun L1                                                       |
| `48`    | `syslog`     | Log hệ thống Android                                                |
| `49`    | `klog`       | Log Kernel hệ điều hành                                             |

---

### 3. Sample Code - Mã nguồn mẫu Chi tiết

#### 3.1 Bật tính năng AppLog & Đăng ký Package ghi log (`addPackageNameToAppLog`)

```java
try {
    // 1. Bật công tắc AppLog function
    int enableResult = sTmsApi.getLogcatManager().enableAppLogFunction(true);

    // 2. Thêm package name ứng dụng vào danh sách ghi log (Yêu cầu UID > 10000)
    int addResult = sTmsApi.getLogcatManager().addPackageNameToAppLog("com.example.pos");
    if (addResult == 0) {
        // Thêm package thành công
    }

    // 3. Truy vấn danh sách package đang ghi log
    List<String> logPackages = sTmsApi.getLogcatManager().getPackageNameFromAppLog();
} catch (SecurityException e) {
    // Ném SecurityException nếu ứng dụng không có quyền gọi API này
    e.printStackTrace();
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.2 Đóng gói App Log hệ thống (`packAppLog`)

```java
try {
    sTmsApi.getLogcatManager().packAppLog(new IResultCallback.Stub() {
        @Override
        public void onCall(Bundle bundle) throws RemoteException {
            if (bundle != null) {
                int result = bundle.getInt("result"); // 0: Thành công
                String zipPath = bundle.getString("path"); // Đường dẫn file log nén
            }
        }
    });
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.3 Nén Log theo Loại ra file ZIP (`packLogsByType`)

```java
try {
    // Nén Logcat thiết bị ("1") và System log ("48")
    List<String> types = new ArrayList<>(Arrays.asList("1", "48"));

    // BẮT BUỘC: File xuất ra phải nằm trong bộ nhớ ngoài /sdcard/
    String outputPath = "/sdcard/Download/system_logs.zip";

    sTmsApi.getLogcatManager().packLogsByType(types, outputPath, new IResultCallback.Stub() {
        @Override
        public void onCall(Bundle bundle) throws RemoteException {
            if (bundle != null) {
                int resultCode = bundle.getInt("result");
                if (resultCode == 0) {
                    // Đóng gói file ZIP log thành công tại outputPath
                }
            }
        }
    });
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.4 Trích xuất System Log theo Khoảng ngày (`getSysLogByDate`)

```java
try {
    String startDate  = "2026-01-01"; // Từ ngày (yyyy-MM-dd)
    String endDate    = "2026-01-05"; // Đến ngày (yyyy-MM-dd)
    String outputPath = "/sdcard/Download/syslog_export.txt";

    sTmsApi.getLogcatManager().getSysLogByDate(startDate, endDate, outputPath, new IResultCallback.Stub() {
        @Override
        public void onCall(Bundle bundle) throws RemoteException {
            if (bundle != null) {
                int result = bundle.getInt("result");
                if (result == 0) {
                    // Xuất file text log thành công
                }
            }
        }
    });
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi các callback `IResultCallback` trả về `result = 0` và chuỗi `path` không rỗng.
- **Modules Kiểm thử**: `LogcatManagerController`, `LogExporter`.
- **Seam Strategy**: Giả lập `ILogcatManager` để test các trường hợp mã lỗi `-45` (Không có quyền gọi API) hoặc `-2` (Dung lượng bộ nhớ không đủ nén log) trong Unit Test.

## Out of Scope

- Trích xuất nhật ký ứng dụng mã nguồn hệ thống (System Apps UID <= 10000).
- Sửa đổi nội dung dòng log gốc bên trong hệ thống Linux Kernel.

## Further Notes

- **Phân quyền UID**: API ghi log chỉ áp dụng cho ứng dụng thường có UID > 10000 trên các dòng máy hỗ trợ (như P3H / P3H-A11).
