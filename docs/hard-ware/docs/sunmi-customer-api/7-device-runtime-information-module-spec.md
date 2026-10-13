# SUNMI Customer API - Device Runtime Information Module Specification

## Proposed Seam

- **DeviceRunningInfo Seam (`IDeviceRunningInfo`)**: Seam nằm ở interface `sTmsApi.getDeviceRunningInfo()`. Interface này bao bọc 9 API theo dõi thông số vận hành thiết bị theo thời gian thực (GPS Location, Battery Capacity, RAM/ROM Usage, CPU Usage, Device Uptime). Seam cho phép giả lập các chỉ số vận hành phần cứng trong unit test mà không cần phần cứng thực tế.

## Problem Statement

Các ứng dụng POS/Kiosk và hệ thống giám sát hiệu năng thiết bị (MDM Dashboard) cần theo dõi liên tục mức độ tiêu thụ tài nguyên hệ thống (tỷ lệ phần trăm Pin, mức chiếm dụng RAM/ROM, phần trăm CPU usage), thời gian thiết bị hoạt động liên tục từ lúc bật máy (`getTurnOnMills`), cũng như truy xuất tọa độ GPS chính xác (Kinh độ, Vĩ độ, Độ cao, Tốc độ, Hướng di chuyển) để phục vụ định vị thiết bị cửa hàng. Việc thiếu đặc tả kỹ thuật tập trung và mã nguồn mẫu chuẩn sẽ làm chậm tiến độ tích hợp các dịch vụ giám sát.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `Device Runtime Information Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 9 APIs, quy định cấu trúc dữ liệu Map vị trí GPS (`LocationInfoConstant`), cơ chế xử lý callback định vị bất đồng bộ (`GPSLocationListener`), và cung cấp mã nguồn mẫu Java chi tiết cho từng API.

## User Stories

1. As a Store Logistics Manager, I want to query real-time GPS location (`getGPSLocationWithTimeout`) and cached location (`getGPSLocation`), so that lost or relocated POS terminals can be tracked.
2. As an MDM Dashboard Engineer, I want to monitor RAM usage (`getRamUsedSize` / `getRamTotalSize`), storage space (`getRomUsedSize` / `getRomTotalSize`), and CPU usage (`getCpuUsage`), so that memory leaks or performance degradation are detected early.
3. As a Power Management Service, I want to check current battery percentage (`getBatteryCapacity`) and total boot uptime (`getTurnOnMills`), so that automated low-battery alerts or scheduled maintenance restarts are triggered.

## Implementation Decisions

### 1. Phân nhóm 9 APIs thuộc `Device Runtime Information Module`

#### Group 1: Vị trí & Định vị GPS (GPS Location Services)

- `getGPSLocation()`: Lấy vị trí GPS cached gần nhất dạng `Map<String, String>` (Synchronous).
- `getGPSLocationWithTimeout(listener, timeout)`: Lấy vị trí GPS thời gian thực bất đồng bộ có cài đặt thời gian chờ (Timeout ms).

#### Group 2: Năng lượng & Trạng thái Hoạt động (Battery & System Uptime)

- `getBatteryCapacity()`: Lấy phần trăm dung lượng pin hiện tại (Chuỗi % ví dụ "85").
- `getTurnOnMills()`: Lấy thời gian thiết bị đã bật máy kể từ lần boot gần nhất (Milliseconds).

#### Group 3: Bộ nhớ & Hiệu năng Hệ thống (RAM, ROM & CPU Metrics)

- `getRamTotalSize()`: Tổng dung lượng RAM hệ thống (Bytes).
- `getRamUsedSize()`: Dung lượng RAM đang sử dụng (Bytes).
- `getRomTotalSize()`: Tổng dung lượng bộ nhớ trong ROM (Bytes).
- `getRomUsedSize()`: Dung lượng bộ nhớ trong ROM đang sử dụng (Bytes).
- `getCpuUsage()`: Tỷ lệ sử dụng CPU theo phần trăm (Float ví dụ 10.0 = 10%).

---

### 2. Cấu trúc Tra cứu Khóa Định vị GPS (`LocationInfoConstant`)

Dữ liệu trả về từ hàm lấy GPS dạng `Map<String, String>` chứa các key tiêu chuẩn:

- `longitude`: Kinh độ
- `latitude`: Vĩ độ
- `altitude`: Độ cao so với mực nước biển
- `speed`: Tốc độ di chuyển
- `bearing`: Góc hướng di chuyển (Azimuth)

---

### 3. Sample Code - Mã nguồn mẫu cho từng API

#### 3.1 Truy xuất Tọa độ GPS Cached gần nhất (`getGPSLocation`)

```java
try {
    Map<String, String> gpsMap = sTmsApi.getDeviceRunningInfo().getGPSLocation();

    if (gpsMap != null && gpsMap.size() > 0 && !"null".equals(gpsMap.toString())) {
        String longitude = gpsMap.get("longitude"); // Kinh độ
        String latitude  = gpsMap.get("latitude");  // Vĩ độ
        String altitude  = gpsMap.get("altitude");  // Độ cao
        String speed     = gpsMap.get("speed");     // Tốc độ
        String bearing   = gpsMap.get("bearing");   // Hướng di chuyển
    } else {
        // GPS Cache null: Cần bật Location switch hoặc di chuyển ra khu vực trống ngoài trời
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.2 Lấy Tọa độ GPS Thời gian thực với Timeout (`getGPSLocationWithTimeout`)

```java
try {
    long timeoutMs = 10000; // Thời gian chờ 10 giây

    sTmsApi.getDeviceRunningInfo().getGPSLocationWithTimeout(new GPSLocationListener.Stub() {
        @Override
        public void onGPSLocationChanged(Map gpsLocationMap) throws RemoteException {
            if (gpsLocationMap != null && gpsLocationMap.size() > 0) {
                String lng = (String) gpsLocationMap.get("longitude");
                String lat = (String) gpsLocationMap.get("latitude");
                // Cập nhật tọa độ thời gian thực lên bản đồ cửa hàng
            }
        }
    }, timeoutMs);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.3 Đọc Mức Pin & Thời gian Bật máy (Uptime & Battery)

```java
try {
    // 1. Đọc phần trăm Pin hiện tại (Ví dụ: "85")
    String batteryLevel = sTmsApi.getDeviceRunningInfo().getBatteryCapacity();

    // 2. Đọc tổng thời gian máy hoạt động liên tục (Milliseconds)
    long uptimeMs = sTmsApi.getDeviceRunningInfo().getTurnOnMills();
    long uptimeMinutes = uptimeMs / (1000 * 60);
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.4 Đọc Thông số Tài nguyên RAM, ROM Storage & Mức tải CPU (`getCpuUsage`)

```java
try {
    // 1. Đọc RAM (Bytes)
    long totalRam = sTmsApi.getDeviceRunningInfo().getRamTotalSize();
    long usedRam  = sTmsApi.getDeviceRunningInfo().getRamUsedSize();
    double ramUsagePercent = ((double) usedRam / totalRam) * 100;

    // 2. Đọc ROM Storage (Bytes)
    long totalRom = sTmsApi.getDeviceRunningInfo().getRomTotalSize();
    long usedRom  = sTmsApi.getDeviceRunningInfo().getRomUsedSize();

    // 3. Đọc % CPU Usage hiện tại (Float)
    float cpuUsage = sTmsApi.getDeviceRunningInfo().getCpuUsage(); // Ví dụ: 12.5f (12.5%)
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Đảm bảo các hàm đo lường RAM/ROM trả về dung lượng `totalSize > 0` và `usedSize <= totalSize`.
- **Modules Kiểm thử**: `GpsLocationResolver`, `SystemResourceMonitor`, `BatteryRuntimeChecker`.
- **Seam Strategy**: Giả lập `IDeviceRunningInfo` để return các giá trị mock (ví dụ: `cpuUsage = 95.0f` hoặc `batteryCapacity = "5"`) để kiểm thử phản ứng cảnh báo tài nguyên của ứng dụng trong Unit Test.

## Out of Scope

- Định vị thiết bị khi thiết bị tắt nguồn hoàn toàn.
- Thay đổi hoặc can thiệp thuật toán tính toán dung lượng RAM/ROM của hệ điều hành Android kernel.

## Further Notes

- Nếu `getGPSLocation()` trả về `null`, hãy kiểm tra: (1) Công tắc Location thông báo đã bật chưa, (2) Thiết bị đã từng định vị ngoài trời thành công trước đó chưa.
