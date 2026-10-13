# SUNMI Prevent Barcode Scanner Data Corruption via IME Specification

## Proposed Seam

- **ScannerInputFilter Seam (`IScannerInputFilter`)**: Interface lọc và định dạng chuỗi dữ liệu quét từ đầu đọc mã vạch. Seam này giúp bọc logic xử lý chuỗi nhập thô (raw string) trước khi đổ vào `EditText` và hỗ trợ kiểm thử tính chính xác của dữ liệu trong unit test.

## Problem Statement

Khi quét mã vạch hoặc mã QR bằng đầu đọc mã vạch (Scanner phần cứng hoặc USB Scanner giả lập bàn phím HID), dữ liệu ký tự quét được đẩy vào `EditText` thông qua Bộ gõ ứng dụng (IME / Input Method Editor như Telex, Pinyin, Gboard). Bộ gõ hệ thống có thể tự động biến đổi ký tự (ví dụ: gõ lặp `aa` thành `â`, bỏ sót ký tự, hoặc gợi ý từ) làm cho dữ liệu quét bị sai lệch so me với mã gốc trên sản phẩm.

## Solution

Tận dụng đặc tính bộ gõ Android không tự động chuyển đổi ký tự đối với các ô nhập mật khẩu. Bằng cách thiết lập thuộc tính `android:inputType="textVisiblePassword"` kết hợp với chuỗi ký tự hợp lệ `android:digits`, dữ liệu quét mã vạch sẽ được truyền nguyên bản (raw data) trực tiếp vào ô nhập liệu mà không bị nhiễu bởi IME.

## User Stories

1. As a Store Cashier, I want scanned barcode data (e.g. SKU numbers, QR tokens) to be entered accurately into the checkout screen without missing or transformed characters, so that inventory items are matched instantly.
2. As an Application Developer, I want a reliable `EditText` configuration for barcode scanning inputs, so that I don't need to force users to change their system keyboard settings.

## Implementation Decisions

### 1. Cấu hình XML Layout cho `EditText` quét mã vạch

Đặt `android:inputType="textVisiblePassword"` và định nghĩa danh sách ký tự được phép chấp nhận trong `android:digits`:

#### Sample Code - XML Layout:

```xml
<EditText
    android:id="@+id/et_barcode_input"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:hint="Quét mã vạch sản phẩm tại đây..."
    android:inputType="textVisiblePassword"
    android:digits="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@.-_:"
    app:layout_constraintTop_toTopOf="parent"
    app:layout_constraintLeft_toLeftOf="parent"
    app:layout_constraintRight_toRightOf="parent" />
```

### 2. Sample Code - Cấu hình bằng lập trình (Programmatic Java/Kotlin)

Trường hợp tạo `EditText` bằng code động:

```java
package com.sm.sdk.demo;

import android.text.InputType;
import android.text.method.DigitsKeyListener;
import android.widget.EditText;

public class ScannerInputHelper {

    public static void configureForScanner(EditText editText) {
        if (editText == null) return;

        // 1. Chuyển sang dạng Password hiển thị rõ để bypass bộ gõ IME
        editText.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);

        // 2. Thiết lập danh sách ký tự hợp lệ (Chữ cái, số và ký tự đặc biệt phổ biến trong Barcode)
        String allowedDigits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@.-_:";
        editText.setKeyListener(DigitsKeyListener.getInstance(allowedDigits));
    }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử chuỗi ký tự quét ngõ vào (Input stream) đảm bảo 100% khớp với chuỗi đầu ra (Output text) kể cả khi bật các bộ gõ tiếng Việt/Trung.
- **Modules Kiểm thử**: `ScannerInputHelper`, `BarcodeFormActivity`.
- **Seam Strategy**: Sử dụng `IScannerInputFilter` để truyền các chuỗi barcode phức tạp (chứa ký tự đặc biệt `@`, `.`, `-`) vào test case để xác nhận tính toàn vẹn ký tự.

## Out of Scope

- Xử lý mã vạch bị mờ, rách hoặc hỏng vật lý làm máy quét phần cứng đọc sai ký tự ngay từ đầu.
- Thay đổi cấu hình bàn phím mặc định của toàn bộ hệ điều hành SUNMI OS.

## Further Notes

- Đây là thủ thuật (best practice) chuẩn nhất trên Android giúp khắc phục lỗi trôi ký tự do IME khi làm việc với thiết bị Pos/Kiosk mà không cần can thiệp quyền Root hoặc đổi bàn phím hệ thống.
