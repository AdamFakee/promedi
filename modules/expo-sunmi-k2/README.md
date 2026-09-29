# expo-sunmi-k2

> Expo Native Module tích hợp trọn bộ phần cứng Kiosk Sunmi K2 / Sunmi K2 mini (Đầu đọc thẻ NFC kép & Máy in nhiệt tích hợp khổ 80mm).

⚠️ **Đoạn Cảnh báo & Phân biệt**:

- Mô-đun này điều khiển phần cứng nội tại trên Kiosk Sunmi K2 (đầu đọc NFC qua Sunmi SDK `NfcManager` + Android OS Foreground Dispatch, và máy in nhiệt qua `com.sunmi:printerx`).
- **Phân biệt với mô-đun USB Serial**: Các thiết bị y tế bên ngoài (InBody 260S, Máy đo huyết áp BPBIO 750) kết nối qua cáp USB-to-UART được quản lý độc lập bởi mô-đun [`expo-usb-serial-bridge`](file:///d:/promedi/modules/expo-usb-serial-bridge/README.md).

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Tài liệu Đặc Tả Kỹ Thuật & Giao Thức Kiosk Sunmi K2**: [`docs/hard-ware/sunmi-k2-kiosk-spec.md`](file:///d:/promedi/docs/hard-ware/sunmi-k2-kiosk-spec.md)
- **Runbook Triển Khai & Kiểm Thử Máy Thật**: [`docs/plans/sunmi-k2-kiosk-runbook.md`](file:///d:/promedi/docs/plans/sunmi-k2-kiosk-runbook.md)
- **Kiến trúc Tổng thể Hệ thống**: [`docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md`](file:///d:/promedi/docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md)
- **Thư viện AAR Gốc**: `modules/expo-sunmi-k2/android/libs/sunmiperipher_sdk_v1.0.2.aar`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                                                                                   | Trách nhiệm                                                                                                    | Chạm Vào/Ra (I/O)                                                          |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| [`android/src/main/java/expo/modules/sunmik2/SunmiK2Module.kt`](file:///d:/promedi/modules/expo-sunmi-k2/android/src/main/java/expo/modules/sunmik2/SunmiK2Module.kt) | Cầu nối Native Kotlin triển khai Expo Modules API v2, quản lý lifecycle, kết nối `NfcManager` và `PrinterSdk`. | ⚠️ Native Hardware I/O (NFC AIDL, Thermal Printer Service, Android Intent) |
| [`android/build.gradle`](file:///d:/promedi/modules/expo-sunmi-k2/android/build.gradle)                                                                               | Cấu hình Gradle Android: Nạp thư viện cục bộ `sunmiperipher_sdk_v1.0.2.aar` và `com.sunmi:printerx:1.0.20`.    | ❌ Build Configuration                                                     |
| [`android/src/main/AndroidManifest.xml`](file:///d:/promedi/modules/expo-sunmi-k2/android/src/main/AndroidManifest.xml)                                               | Khai báo quyền phần cứng `android.permission.NFC` và hardware features.                                        | ❌ Manifest Declaration                                                    |
| [`src/SunmiK2.types.ts`](file:///d:/promedi/modules/expo-sunmi-k2/src/SunmiK2.types.ts)                                                                               | Định nghĩa TypeScript Interfaces, sự kiện `NFCScanEvent`, tùy chọn in `PrintBitmapOptions`.                    | ❌ Logic thuần / Type Contracts                                            |
| [`src/SunmiK2Module.ts`](file:///d:/promedi/modules/expo-sunmi-k2/src/SunmiK2Module.ts)                                                                               | Nạp Native Module từ `expo-modules-core`.                                                                      | ⚠️ Native Bridge                                                           |
| [`src/SunmiK2Module.web.ts`](file:///d:/promedi/modules/expo-sunmi-k2/src/SunmiK2Module.web.ts)                                                                       | Fallback an toàn khi chạy trên môi trường Web / Mock Simulator.                                                | ❌ Zero I/O Mock                                                           |
| [`src/index.ts`](file:///d:/promedi/modules/expo-sunmi-k2/src/index.ts)                                                                                               | Cung cấp hàm tiện ích `addNFCScanListener`, `printReceiptAsync`, `feedPaperAsync`, `cutPaperAsync`.            | ⚠️ Event Emitter & Async Bridge                                            |
| [`index.ts`](file:///d:/promedi/modules/expo-sunmi-k2/index.ts)                                                                                                       | Root barrel export của module.                                                                                 | ❌ Barrel Index                                                            |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Cơ chế Nhận Thẻ NFC Kép (Dual-Channel NFC Intake)**:
   - _Kênh 1 (Sunmi Peripheral SDK)_: Lắng nghe qua AIDL `INfcListener` từ module NFC tích hợp sâu trên bo mạch K2.
   - _Kênh 2 (Android Foreground Dispatch)_: Bắt trực tiếp `ACTION_TAG_DISCOVERED`, `ACTION_TECH_DISCOVERED` từ Android OS với cờ `FLAG_MUTABLE` (tương thích Android 12+), đảm bảo không bỏ sót thẻ từ các đầu đọc USB ngoài.
2. **Loại bỏ Hoàn toàn WebView Bridge**:
   - Chuyển từ mô hình inject Javascript `webView.evaluateJavascript` sang React Native `EventEmitter` đa nền tảng (`onNFCScanned`), giúp UI phản hồi tức thì với độ trễ 0ms.
3. **In Ảnh Nhiệt Tối Ưu Binarization (Thuật toán nhị phân hóa ảnh 128)**:
   - Chuyển chuỗi Base64 thành Bitmap, áp dụng `ImageAlgorithm.BINARIZATION` với giá trị ngưỡng 128 và căn giữa `Align.CENTER` để biên nhận in rõ nét, chống mờ nhòe chữ và mã QR.
4. **An toàn Bộ nhớ & Vòng đời Kiosk 24/7**:
   - `OnDestroy` chủ động gọi `NfcManager.unregisterNfcListener` và `NfcManager.destroy(context)` để giải phóng kết nối Service AIDL ngầm, ngăn chặn rò rỉ bộ nhớ khi Kiosk hoạt động liên tục.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

### Lắng nghe sự kiện quét thẻ NFC

```typescript
import { addNFCScanListener, printReceiptAsync } from 'modules/expo-sunmi-k2'

// Đăng ký nhận UID thẻ
const sub = addNFCScanListener((event) => {
  console.log('Quét thành công thẻ UID:', event.cardUid, 'Nguồn:', event.source)
})

// Hủy đăng ký khi unmount
sub.remove()
```

### In biên nhận kết quả khám

```typescript
await printReceiptAsync(receiptBase64Image)
```

### Kiểm tra TypeScript & Linter

```bash
npx tsc --noEmit
npm run lint
```
