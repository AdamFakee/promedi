# SUNMI Customer API - Device Software Information Module Specification

## Proposed Seam

- **PackageCTPA Seam (`IPackageCTPA`)**: Seam nằm ở interface `sTmsApi.getPackageCTPA()`. Interface này bao bọc hàm `getSystemAllPackageInfo()` dùng để liệt kê và truy xuất thống kê dung lượng bộ nhớ của toàn bộ ứng dụng hệ thống dưới dạng chuỗi JSON. Seam giúp mock dữ liệu chuỗi JSON danh sách package trong môi trường Unit Test mà không cần quét hệ thống thật.

## Problem Statement

Các giải pháp quản trị MDM và ứng dụng dọn dẹp dung lượng hệ thống trên máy SUNMI cần thống kê danh sách tất cả các ứng dụng cài sẵn, dung lượng file cài đặt (`codeSize`), bộ nhớ dữ liệu (`dataSize`), và dung lượng cache (`cachesSize`) để phát hiện các app chiếm dụng tài nguyên bất thường. Việc gọi API này trực tiếp trên Main UI Thread có thể làm đứng hoặc lag ứng dụng do khối lượng dữ liệu JSON lớn.

## Solution

Cung cấp đặc tả kỹ thuật chuẩn hóa cho `Device Software Information Module` thuộc SUNMI Customer API SDK. Tài liệu hướng dẫn định dạng cấu trúc JSON trả về, cơ chế parse dữ liệu bằng `JSONArray`/`JSONObject`, và mẫu mã nguồn Java bắt buộc chạy trên Background Thread (Worker Thread) để đảm bảo trải nghiệm ứng dụng mượt mà.

## User Stories

1. As an MDM Inventory Audit Manager, I want to retrieve a JSON list of all installed system packages (`getSystemAllPackageInfo`), so that I can audit software versions and storage consumption across device fleets.
2. As a System Optimizer App, I want to parse `appSize`, `codeSize`, `dataSize`, and `cachesSize` for each package, so that users can view detailed storage breakdowns per application.
3. As an Application Developer, I want to execute `getPackageCTPA()` asynchronously in a background thread, so that the main UI thread remains responsive during heavy system queries.

## Implementation Decisions

### 1. Chi tiết API `getSystemAllPackageInfo()`

- **Prototype**: `String getSystemAllPackageInfo()`
- **Interface Binder**: `sTmsApi.getPackageCTPA()`
- **Mô tả**: Trả về chuỗi JSON mảng các đối tượng chứa thông tin dung lượng bộ nhớ và tên package của tất cả ứng dụng hệ thống đã cài đặt.
- **Phạm vi ứng dụng**: General (Áp dụng cho tất cả dòng máy SUNMI).

---

### 2. Cấu trúc Schema JSON Trả về

```json
[
  {
    "packageName": "com.android.cts.priv.ctsshim",
    "appSize": 1048576, // Tổng dung lượng ứng dụng (Bytes)
    "codeSize": 524288, // Dung lượng file APK / code (Bytes)
    "dataSize": 262144, // Dung lượng dữ liệu người dùng (Bytes)
    "cachesSize": 262144 // Dung lượng bộ nhớ đệm Cache (Bytes)
  },
  {
    "packageName": "com.sunmi.pos",
    "appSize": 20971520,
    "codeSize": 15728640,
    "dataSize": 4194304,
    "cachesSize": 1048576
  }
]
```

---

### 3. Sample Code - Mã nguồn mẫu Chạy trên Background Thread & Parse JSON

```java
package com.sm.sdk.demo;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public class SystemPackageInfoManager {

    private static final String TAG = "PackageInfoManager";

    public static class PackageStorageInfo {
        public String packageName;
        public long appSize;
        public long codeSize;
        public long dataSize;
        public long cachesSize;
    }

    /**
     * BẮT BUỘC: Gọi API getSystemAllPackageInfo trên Background Thread để tránh đơ UI Thread
     */
    public void fetchSystemPackageInfoAsync(OnPackageInfoFetchedListener listener) {
        new Thread(() -> {
            try {
                // 1. Thực thi API truy vấn chuỗi JSON từ sTmsApi.getPackageCTPA()
                String jsonResult = SunmiTmsManager.getInstance().getTmsApi().getPackageCTPA().getSystemAllPackageInfo();

                List<PackageStorageInfo> packageList = new ArrayList<>();

                if (jsonResult != null && !jsonResult.isEmpty()) {
                    // 2. Parse chuỗi JSON trả về
                    JSONArray jsonArray = new JSONArray(jsonResult);
                    for (int i = 0; i < jsonArray.length(); i++) {
                        JSONObject item = jsonArray.getJSONObject(i);

                        PackageStorageInfo info = new PackageStorageInfo();
                        info.packageName = item.optString("packageName");
                        info.appSize     = item.optLong("appSize");
                        info.codeSize    = item.optLong("codeSize");
                        info.dataSize    = item.optLong("dataSize");
                        info.cachesSize  = item.optLong("cachesSize");

                        packageList.add(info);
                    }
                }

                // 3. Trả kết quả về Callback
                if (listener != null) {
                    listener.onSuccess(packageList);
                }

            } catch (Exception e) {
                Log.e(TAG, "Failed to fetch system package info", e);
                if (listener != null) {
                    listener.onError(e);
                }
            }
        }).start();
    }

    public interface OnPackageInfoFetchedListener {
        void onSuccess(List<PackageStorageInfo> packages);
        void onError(Exception e);
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử logic parse chuỗi JSON trả về từ `getSystemAllPackageInfo()` đảm bảo không bị crash khi có trường dữ liệu `optLong` bằng 0 hoặc null.
- **Modules Kiểm thử**: `SystemPackageInfoManager`, `PackageJsonParser`.
- **Seam Strategy**: Giả lập `IPackageCTPA` để return mẫu chuỗi JSON giả định trong Unit Test để kiểm tra hiệu năng lọc danh sách ứng dụng.

## Out of Scope

- Gỡ bỏ hoặc thay đổi dung lượng lưu trữ của ứng dụng hệ thống thông qua API truy vấn này.
- Quét các file rác tạm thời ngoài phạm vi quản lý của Android Package Manager.

## Further Notes

- API này xử lý lượng dữ liệu lớn và mất vài giây để hoàn tất. **Tuyệt đối không gọi trực tiếp trên Main Thread (UI Thread)** để tránh gây ra sự cố ứng dụng không phản hồi (ANR - Application Not Responding).
