# Feature: Quy Trình Khám & Đo Sức Khỏe (Measure Feature)

Mô-đun quản lý giao diện hiển thị 3 bước đo sức khỏe tuyến tính trên Kiosk Sumi mini K2: **Bước 1: Đo Huyết Áp**, **Bước 2: Đo Chỉ Số Cơ Thể (InBody)**, và **Bước 3: Màn Hình Tổng Hợp Kết Quả & Quét Mã QR**.

---

## ⚠️ Đoạn Cảnh báo & Phân biệt

- **Chỉ phục vụ Hiển thị UI & Phân tích Chỉ số**: Mô-đun này không chứa business logic điều phối FSM hoặc kết nối trực tiếp cổng Serial/Bluetooth. Mọi trạng thái phiên khám đều thông qua custom hook `useHealthSession()`.
- **Thiết kế Chống Card Bao Trùng Lặp**: Màn hình Kết quả (`result-summary.tsx`) áp dụng thiết kế phẳng kết hợp khung thẻ `rounded-2xl` mờ tinh tế, không bọc các card lồng card rườm rà.
- **Chuẩn hóa Thuật ngữ Tiếng Việt**: Sử dụng thuật ngữ thân thiện (_Cân Nặng, Khối Lượng Cơ, Tỷ Lệ Mỡ Cơ Thể, Chỉ Số BMI, Tuổi Cơ Thể, Mỡ Nội Tạng, Nước Cơ Thể, Điểm Sức Khỏe_).

---

## Danh sách Tham chiếu (Reference Links)

- [Đặc tả Use Case V4.0](file:///d:/promedi/docs/specs/usecase-specification-v4.0.md)
- [Màn hình Đo Huyết Áp & InBody Route](file:///d:/promedi/src/app/%28kiosk%29/measure.tsx)
- [Voice Engine Core](file:///d:/promedi/src/core/voice-engine/README.md)

---

## 1. Bảng Danh mục Tệp (Directory Catalog)

| Tệp                                 | Trách nhiệm                                                                                                                                      | Chạm Vào/Ra (I/O)            |
| :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- |
| `components/bp-instruction.tsx`     | Hiển thị màn hình hướng dẫn, trạng thái đang đo và hoàn tất đo huyết áp tự động.                                                                 | 🌐 React UI & Audio Guidance |
| `components/inbody-instruction.tsx` | Hiển thị màn hình hướng dẫn tư thế đứng đo phân tích chỉ số cơ thể (`inbody_guide_male.webp`) kèm overlay đo và báo lỗi.                         | 🌐 React UI & Image Loader   |
| `components/result-summary.tsx`     | Hiển thị bảng tổng hợp kết quả 6 chỉ số, biểu đồ cơ thể chi tiết (`SvgDetailedBody`), mã QR lookup (`react-native-qrcode-svg`) và đếm ngược 60s. | 🌐 React UI & Session Reset  |
| `components/svg-detailed-body.tsx`  | Component SVG minh họa cấu trúc cơ thể người với các điểm chỉ báo phân tích vùng cơ và mỡ.                                                       | ❌ Pure SVG Rendering        |
| `hooks/use-bp-measurement.ts`       | Hook cầu nối `bpbioSessionMachine` XState v5, quản lý lifecycle kết nối Serial và chuyển bước.                                                   | ⚠️ Hardware & FSM Bridge     |
| `hooks/use-inbody-measurement.ts`   | Hook cầu nối `inbodySessionMachine` XState v5, quản lý kết nối USB Serial và nạp thông tin khách hàng.                                           | ⚠️ Hardware & FSM Bridge     |
| `components/index.ts`               | Barrel File gom và re-export toàn bộ components đo đạc.                                                                                          | ❌ Barrel Re-export          |
| `hooks/index.ts`                    | Barrel File gom và re-export toàn bộ measurement hooks.                                                                                          | ❌ Barrel Re-export          |
| `index.ts`                          | Root Feature Barrel File re-export cho callers ngoài feature.                                                                                    | ❌ Barrel Re-export          |

---

## 2. Các Quyết Định Đã Chốt & Lý Giải Kỹ Thuật (HOW & WHY)

1. **Hiển thị Mã QR Không Viền Khung Rườm Rà:**
   - Mã QR kết quả truy xuất phiên khám sử dụng `react-native-qrcode-svg` (`SvgQrCode`) đặt trong ô nền trắng `rounded-xl`, hỗ trợ quét nhanh bằng Camera điện thoại, Zalo hoặc VNeID.
2. **Loại Bỏ Lỗi Android SVG Arrowhead Marker Crash:**
   - Không dùng `marker-end` hay `orient="auto-start-reverse"` của SVG (gây lỗi `java.lang.NumberFormatException` trên Android Native SVG). Toàn bộ đường chỉ dẫn vùng cơ mỡ sử dụng các thẻ `<Line>` tọa độ chuẩn.
3. **Quản lý Hết Giờ & Bảo Mật Privacy 60s:**
   - Màn hình kết quả liên kết với bộ đếm ngược 60 giây. Khi bấm **HOÀN TẤT**, hệ thống tự động xóa sạch dữ liệu tạm (`resetSession()`) và phát âm thanh cảm ơn trước khi quay về màn hình chờ (`idle`).

---

## 3. Hướng Dẫn Kiểm Thứ & Chạy Lệnh

- Kiểm tra TypeScript Strict Mode:
  ```bash
  npx tsc --noEmit
  ```
- Chạy Linter:
  ```bash
  npm run lint
  ```
