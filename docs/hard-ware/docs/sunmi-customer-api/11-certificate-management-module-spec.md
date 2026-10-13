# SUNMI Customer API - Certificate Management Module Specification

## Proposed Seam

- **CertificateManager Seam (`ICertificateManager`)**: Seam nằm ở interface `sTmsApi.getCertificateManager()`. Interface này bao bọc 3 API quản lý chứng chỉ xác minh chữ ký ứng dụng (Cập nhật chứng chỉ signature, Đọc thông tin chứng chỉ hiện tại, Đọc chuỗi chứng chỉ tin cậy Cert Chain). Seam cho phép giả lập các phản hồi JSON chứng chỉ và kết quả cập nhật trong unit test mà không làm thay đổi keystone phần cứng thật.

## Problem Statement

Các ứng dụng tài chính và Kiosk bảo mật cao trên dòng máy SUNMI (như P-series) yêu cầu xác minh chữ ký phần mềm nghiêm ngặt thông qua chứng chỉ hệ thống. Việc cập nhật chứng chỉ (`updateCertificate`), đọc trạng thái chế độ chứng chỉ (`CertState`), cũng như lấy thông tin vân tay (`fingerprint`) và chuỗi chứng chỉ tin cậy (`C2CertChain`) đòi hỏi đường dẫn file lưu trữ hợp lệ và hiểu rõ cấu trúc JSON trả về. Việc thiếu tài liệu đặc tả và mã nguồn mẫu chuẩn sẽ gây lỗi cấp quyền (Permission Denied error code 4) khi đọc file chứng chỉ.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `Certificate Management Module` thuộc SUNMI Customer API SDK. Tài liệu phân loại 3 APIs, hướng dẫn định dạng file CRT, quy định lưu ý lưu file trong thư mục dùng chung `/sdcard/` thay vì thư mục private, mô tả đầy đủ JSON Schema phản hồi, và cung cấp mã nguồn mẫu Java cho toàn bộ các hàm.

## User Stories

1. As a Security Engineer, I want to update the app's signature verification certificate (`updateCertificate`), so that expired or revoked certificates are renewed safely on financial terminals.
2. As an Audit Compliance Officer, I want to query current certificate metadata (`getCertificateInfo`), so that I can inspect the certificate state (`CertState`), issuer, subject, and fingerprint.
3. As a Cryptographic Manager, I want to retrieve trusted certificate chain details (`getTrustedFileCertChain`), so that multi-level certificate validation (`C2CertChain`) is verified before running sensitive operations.

## Implementation Decisions

### 1. Phân nhóm 3 APIs thuộc `Certificate Management Module`

#### 1. Cập nhật Chứng chỉ Chữ ký App (`updateCertificate`)

- **Prototype**: `int updateCertificate(String certPath)`
- **Mục đích**: Cập nhật file chứng chỉ xác minh chữ ký ứng dụng (`.crt`).
- **Giá trị trả về**: `0` nếu thành công; các mã khác đại diện cho lỗi (Xem bảng mã lỗi Certificate tại Spec 1).
- **Lưu ý Cấp quyền**: Không lưu file `.crt` trong thư mục private (`/data/data/...`) vì sẽ bị lỗi cấp quyền **Error Code 4**; bắt buộc lưu file tại thư mục bộ nhớ ngoài `/sdcard/` hoặc `/sdcard/Download/`.

#### 2. Lấy Thông tin Chứng chỉ Hiện tại (`getCertificateInfo`)

- **Prototype**: `String getCertificateInfo()`
- **Mục đích**: Trả về chuỗi JSON chứa thông tin chi tiết về chứng chỉ chữ ký ứng dụng hiện tại.
- **Giá trị CertState**: `1` (Manufacturer Mode), `2` (Intermediate Mode), `3` (Single-certificate Mode), `4` (Multi-certificate Mode).

#### 3. Lấy Chuỗi Chứng chỉ Tin cậy (`getTrustedFileCertChain`)

- **Prototype**: `String getTrustedFileCertChain()`
- **Mục đích**: Trả về chuỗi JSON chứa chuỗi chứng chỉ tin cậy (`C2CertChain`).

---

### 2. Cấu trúc JSON Response Schema

#### 2.1 JSON Schema cho `getCertificateInfo()`:

```json
{
  "Code": 0,
  "CertState": 3,
  "C1Cert": "MIIBzzCCAXagAwIBAgIU...",
  "C2Cert": "MIIBvTCCAQCgAwIBAgIU...",
  "subject": "CN=SUNMI_APP_CERT, O=SUNMI",
  "issuer": "CN=SUNMI_ROOT_CA, O=SUNMI",
  "fingerprint": "A1:B2:C3:D4:E5:F6:78:90:12:34:56:78:90:AB:CD:EF",
  "level": 2
}
```

#### 2.2 JSON Schema cho `getTrustedFileCertChain()`:

```json
{
  "Code": 0,
  "CertState": 3,
  "C2CertChain": "MIIBzzCCAXagAwIBAgIU...-----END CERTIFICATE-----...MIIBvTCCAQCgAwIBAgIU..."
}
```

---

### 3. Sample Code - Mã nguồn mẫu Chi tiết

#### 3.1 Cập nhật Chứng chỉ Chữ ký App (`updateCertificate`)

```java
try {
    // BẮT BUỘC: File chứng chỉ phải nằm trong /sdcard/ hoặc /sdcard/Download/
    // Nếu để trong /data/data/private directory sẽ trả về Error Code 4 (Permission Denied)
    String certPath = "/sdcard/Download/test_UpdateCertificate.crt";

    int resultCode = sTmsApi.getCertificateManager().updateCertificate(certPath);
    if (resultCode == 0) {
        // Cập nhật chứng chỉ thành công
    } else {
        // Cập nhật thất bại (Tra cứu Bảng Mã Lỗi Certificate 4.4 tại Spec 1)
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.2 Đọc Thông tin Chứng chỉ & Parse JSON (`getCertificateInfo`)

```java
try {
    String jsonInfo = sTmsApi.getCertificateManager().getCertificateInfo();
    if (jsonInfo != null && !jsonInfo.isEmpty()) {
        JSONObject json = new JSONObject(jsonInfo);
        int code = json.optInt("Code");
        if (code == 0) {
            int certState = json.optInt("CertState"); // 1: Manufacturer, 2: Intermediate, 3: Single, 4: Multi
            String subject = json.optString("subject");
            String issuer = json.optString("issuer");
            String fingerprint = json.optString("fingerprint");
            String c1Cert = json.optString("C1Cert");
        }
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

#### 3.3 Đọc Chuỗi Chứng chỉ Tin cậy (`getTrustedFileCertChain`)

```java
try {
    String jsonChain = sTmsApi.getCertificateManager().getTrustedFileCertChain();
    if (jsonChain != null && !jsonChain.isEmpty()) {
        JSONObject json = new JSONObject(jsonChain);
        int code = json.optInt("Code");
        if (code == 0) {
            int certState = json.optInt("CertState");
            String certChain = json.optString("C2CertChain"); // Chuỗi PEM/Base64 Cert Chain
        }
    }
} catch (Exception e) {
    e.printStackTrace();
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `updateCertificate` khi truyền đường dẫn file không tồn tại trả về mã lỗi `-1000` (File does not exist).
- **Modules Kiểm thử**: `CertificateManagerController`, `CertificateJsonParser`.
- **Seam Strategy**: Giả lập `ICertificateManager` để return mẫu JSON `CertState = 3` và `Code = 0` trong Unit Test.

## Out of Scope

- Ghi đè khóa Root CA phần cứng cấp thấp trong Chip bảo mật PCI của thiết bị P-Series.
- Tạo hoặc tự phát hành chứng chỉ số mà không qua trung tâm chứng thực của SUNMI.

## Further Notes

- **Quyền đọc File**: Khi gọi `updateCertificate()`, nếu file `.crt` nằm trong thư mục app private (`/data/data/com.xxx.xxx/...`), hệ thống sẽ báo lỗi `Code 4` (Permission Denied). Bắt buộc phải sao chép file ra thư mục `/sdcard/Download/` bằng lớp `FileStorageUtil` trước khi tiến hành cập nhật.
