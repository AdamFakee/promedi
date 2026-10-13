# SUNMI Platform Security, Virtual Bluetooth & Troubleshooting FAQ Specification

## Proposed Seam

- **VirtualBluetoothPrinter Seam (`IVirtualBluetoothPrinter`)**: Interface bọc kết nối máy in Bluetooth ảo `InnerPrinter`. Seam này giả lập luồng giao tiếp Bluetooth SPP với thiết bị in nội bộ, hỗ trợ chạy unit/integration test ứng dụng in ấn mà không cần phần cứng Bluetooth thật.

## Problem Statement

Trong quá trình vận hành và triển khai ứng dụng trên diện rộng, các nhà phát triển gặp các câu hỏi phổ biến liên quan đến: bảo mật thiết bị (gỡ root, khóa cài đặt ứng dụng trái phép), in ấn qua Bluetooth ảo (`InnerPrinter`), tùy biến giao diện khởi động (boot logo, default launcher), quy trình tranh chấp/đòi lại bản quyền ứng dụng (App Claim), và các sự cố lỗi khi upload file APK lên SUNMI Partner Platform.

## Solution

Cung cấp bộ hướng dẫn kỹ thuật và đặc tả xử lý sự cố chuẩn hóa (FAQ & Troubleshooting) cho nền tảng SUNMI. Giải pháp làm rõ cơ chế bảo mật hệ thống, hướng dẫn kết nối máy in ảo `InnerPrinter`, cấu hình đóng gói APK hợp chuẩn (ARM libs, V2/V3 signature, `versionCode`), và quy trình thủ tục Claim quyền sở hữu App.

## User Stories

1. As an Enterprise Security Admin, I want to restrict app installation strictly through the SUNMI App Market and lock USB debugging behind OTP authorization, so that unauthorized sideloading or tampering on field devices is prevented.
2. As a POS Developer, I want to connect to the internal printer using the "InnerPrinter" Virtual Bluetooth signal, so that my legacy Bluetooth printing codebase works without major refactoring.
3. As a Release Engineer, I want clear APK packaging guidelines (ARM libs, signatures, versionCode increment), so that my APK uploads to the SUNMI Partner Platform succeed on the first try.
4. As an App Owner, I want a defined email claim procedure, so that I can reclaim unauthorized uploads of my application package name by third parties.

## Implementation Decisions

### 1. Máy in Bluetooth Ảo (SUNMI Virtual Bluetooth Print - `InnerPrinter`)

- SUNMI OS cung cấp tín hiệu Bluetooth ảo đặt tên là `InnerPrinter` biểu diễn cho máy in nhiệt tích hợp sẵn.
- Ứng dụng xử lý `InnerPrinter` tương tự như một máy in Bluetooth SPP (Serial Port Profile) thông thường.

#### Sample Code - Bluetooth Socket Connection cho `InnerPrinter`:

```java
package com.sm.sdk.demo;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import java.util.Set;
import java.util.UUID;

public class VirtualBluetoothPrinterHelper {

    // UUID chuẩn cho Bluetooth SPP (Serial Port Profile)
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    public static BluetoothDevice findInnerPrinter() {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) return null;

        Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
        for (BluetoothDevice device : pairedDevices) {
            // Nhận diện tín hiệu Bluetooth ảo InnerPrinter
            if ("InnerPrinter".equals(device.getName())) {
                return device;
            }
        }
        return null;
    }

    public static BluetoothSocket connectToInnerPrinter(BluetoothDevice device) throws Exception {
        if (device == null) return null;
        BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
        socket.connect();
        return socket; // Trả về socket để ghi dữ liệu in ESC/POS
    }
}
```

### 2. Yêu cầu Đóng gói APK Hợp lệ (APK Packaging Checklist)

Tránh lỗi parse APK hoặc upload thất bại trên SUNMI Partner Platform:

- **ARM Native Libraries**: Phải chứa các file thư viện `.so` hỗ trợ kiến trúc ARM (ví dụ: `armeabi-v7a`, `arm64-v8a`).
- **APK Signature**: Phải được ký release với Signature Scheme V2 hoặc V3.
- **Version Code**: Giá trị `versionCode` phải luôn tăng so với bản upload trước đó.

#### Sample Code - Module `build.gradle` Configuration:

```groovy
android {
    defaultConfig {
        applicationId "com.example.pos"
        minSdkVersion 28
        targetSdkVersion 33
        versionCode 101 // Luôn tăng số này khi release bản mới
        versionName "1.0.1"

        // Bắt buộc hỗ trợ ABI cho kiến trúc chip ARM
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a'
        }
    }

    signingConfigs {
        release {
            storeFile file("keystore/release.jks")
            storePassword "password"
            keyAlias "alias"
            keyPassword "password"
            v2SigningEnabled true // Kích hoạt V2 Signature
            v3SigningEnabled true // Kích hoạt V3 Signature
        }
    }
}
```

### 3. Chính sách Bảo mật & Root thiết bị

- **Root Policy**: SUNMI OS **KHÔNG hỗ trợ cấp quyền Root** nhằm đảm bảo an toàn thiết bị thương mại và chứng nhận thanh toán PCI.
- **Khóa Debug & Sideload**: Cấu hình tại Partner Backstage:
  1. Chỉ cho phép cài đặt App thông qua App Market.
  2. Bắt buộc xác thực OTP (Mobile/Email) để bật USB Debugging.

### 4. Quy trình Claim Quyền Sở Hữu App (App Claim Email Template)

Nếu ứng dụng trùng `package_name` bị bên thứ 3 upload trước, gửi email yêu cầu khiếu nại:

- **Tiêu đề**: `claim App`
- **Nội dung**: Tên App bị trùng, Package Name, Người liên hệ, Thông tin liên lạc.
- **Đính kèm**: Giấy phép đăng ký kinh doanh của công ty và Giấy chứng nhận bản quyền phần mềm.

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc quét và kết nối với thiết bị Bluetooth `InnerPrinter` thông qua BluetoothAdapter mock.
- **Modules Kiểm thử**: `VirtualBluetoothPrinterHelper`, `ApkPackagingValidator`.
- **Seam Strategy**: Sử dụng `IVirtualBluetoothPrinter` để giả lập dữ liệu trả về của Bluetooth socket trong môi trường test.

## Out of Scope

- Yêu cầu cấp quyền Root trên các thiết bị SUNMI OS chính thức.
- Tranh chấp bản quyền ngoài hệ thống App Store chính thức của SUNMI.

## Further Notes

- Hệ thống SUNMI OS hỗ trợ tùy biến giao diện doanh nghiệp (Boot logo, Launcher mặc định, default apps) trực tiếp tại trang quản trị SUNMI Partner Backstage mà không cần sửa code ứng dụng.
