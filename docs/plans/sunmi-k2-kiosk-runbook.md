# Kế Hoạch Triển Khai & Kiểm Thử Kiosk Sunmi K2 (Runbook)

- **Thời gian tạo (Created)**: 2026-09-29 15:05:00 (GMT+7)
- **Cập nhật lần cuối (Last Updated)**: 2026-09-29 15:05:00 (GMT+7)
- **Trạng thái**: ĐÃ HOÀN THÀNH
- **Thiết bị mục tiêu**: Kiosk Sunmi K2 / Sunmi K2 mini (Android 7.1 / 11) + Máy in nhiệt 80mm tích hợp + Đầu đọc NFC tích hợp

---

## 1. Mục tiêu

1. Chuyển đổi toàn bộ logic điều khiển từ `MainActivity.kt` dạng WebView Bridge sang Expo Native Module chuẩn (`modules/expo-sunmi-k2`).
2. Tích hợp thư viện `sunmiperipher_sdk_v1.0.2.aar` và `com.sunmi:printerx:1.0.20` vào cấu hình Gradle Android.
3. Cung cấp API hướng đối tượng, Type-safe cho TypeScript để nhận diện thẻ NFC và in kết quả đo sinh trắc học trực tiếp trên máy Kiosk.
4. Đảm bảo 0 lỗi TypeScript, 0 lỗi linter và tài liệu đặc tả 3 tầng hoàn chỉnh.

---

## 2. Hiện trạng mã nguồn & Đã xử lý

- ✅ **Khởi tạo Native Module**: Đã tạo `modules/expo-sunmi-k2` thông qua `create-expo-module --local`.
- ✅ **Nạp AAR & Dependencies**: Đã sao chép `sunmiperipher_sdk_v1.0.2.aar` vào `modules/expo-sunmi-k2/android/libs/` và khai báo `com.sunmi:printerx:1.0.20` trong `build.gradle`.
- ✅ **Triển khai Kotlin Native (`SunmiK2Module.kt`)**:
  - Tích hợp `NfcManager` (AIDL SDK) & `NfcAdapter` (Android Foreground Dispatch với `FLAG_MUTABLE`).
  - Tích hợp `PrinterSdk` với `Align.CENTER`, `ImageAlgorithm.BINARIZATION` (128) và `autoOut()` cắt giấy.
  - Quản lý đầy đủ vòng đời: `OnCreate`, `OnResume`, `OnPause`, `OnNewIntent`, `OnDestroy`.
- ✅ **Giao diện TypeScript**: Xuất các hàm `addNFCScanListener`, `printReceiptAsync`, `feedPaperAsync`, `cutPaperAsync`, `getPrinterStatusAsync`.
- ✅ **Web Fallback**: Cung cấp `SunmiK2Module.web.ts` an toàn khi chạy trên Simulator / Browser.

---

## 3. Hướng dẫn thực thi từng bước (Step-by-Step)

### Bước 1: Kiểm tra cấu hình và Biên dịch TypeScript

Thực thi lệnh kiểm tra type check trên toàn dự án:

```bash
npx tsc --noEmit
```

- **Tiêu chí đạt (Acceptance Criteria)**: Kết quả trả về `0 errors`, toàn bộ types của module `expo-sunmi-k2` được phân giải chính xác.

---

### Bước 2: Kiểm tra Linter dự án

Thực thi lệnh kiểm tra mã nguồn:

```bash
npm run lint
```

- **Tiêu chí đạt (Acceptance Criteria)**: Mã nguồn tuân thủ coding conventions, không có cảnh báo nghiêm trọng.

---

### Bước 3: Cài đặt và Chạy Thử Nghiệm trên Kiosk Sunmi K2 Thật

1. Kết nối Kiosk Sunmi K2 với máy tính qua cáp USB Debug / Mạng LAN (ADB over TCP).
2. Chạy ứng dụng chế độ phát triển:

```bash
npm run android
```

3. **Kiểm thử tính năng Quét Thẻ NFC**:
   - Chạm thẻ NFC hoặc Căn cước công dân gắn chip vào vùng cảm biến NFC Kiosk.
   - **Tiêu chí đạt (Acceptance Criteria)**: Logcat hiển thị `onNFCScanned` với UID dạng Hex (VD: `04A2B3C4D5E6`), giao diện ứng dụng tự động nhận diện và chuyển màn hình.
4. **Kiểm thử tính năng In Hóa Đơn / Phiếu Khám**:
   - Nhấn "In Kết Quả" trên màn hình Tổng hợp kết quả.
   - **Tiêu chí đạt (Acceptance Criteria)**: Máy in nhiệt Kiosk phát ra âm thanh in, phiếu in ra đều nét, QR code rõ ràng và dao cắt kích hoạt tự động.

---

## 4. Danh mục Kiểm tra nhanh (Checklist)

- [x] Thư viện AAR `sunmiperipher_sdk_v1.0.2.aar` đã được đặt trong `modules/expo-sunmi-k2/android/libs/`.
- [x] Đã cấu hình `flatDir { dirs 'libs' }` và `printerx:1.0.20` trong `android/build.gradle`.
- [x] Đã khai báo quyền `android.permission.NFC` trong `AndroidManifest.xml`.
- [x] Đã triển khai đầy đủ `SunmiK2Module.kt` với cơ chế nhận NFC kép và in ảnh binarize.
- [x] Đã xuất Type definitions đầy đủ trong `src/SunmiK2.types.ts` và `src/index.ts`.
- [x] Đã bổ sung tài liệu đặc tả phần cứng tại `docs/hard-ware/sunmi-k2-kiosk-spec.md`.
- [x] Đã bổ sung Runbook triển khai tại `docs/plans/sunmi-k2-kiosk-runbook.md`.
- [x] Đã cập nhật `docs/hard-ware/README.md`.
