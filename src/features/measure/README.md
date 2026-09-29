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

| Tệp                                 | Trách nhiệm                                                                                                                                     | Chạm Vào/Ra (I/O)            |
| :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------- |
| `components/bp-instruction.tsx`     | Hiển thị màn hình hướng dẫn với chữ phóng to 100%, trạng thái đang đo pulse nhịp tim và hoàn tất đo huyết áp tự động.                           | 🌐 React UI & Audio Guidance |
| `components/inbody-instruction.tsx` | Hiển thị màn hình hướng dẫn tư thế đứng InBody kèm màn hình scan sinh học tia laser chạy dọc trên mô hình `SvgDetailedBody`.                    | 🌐 React UI & Reanimated     |
| `components/result-summary.tsx`     | Hiển thị bảng tổng hợp kết quả 6 chỉ số, biểu đồ cơ thể chi tiết (`SvgDetailedBody`), mã QR lookup (`react-native-qrcode-svg`) và nút Hoàn tất. | 🌐 React UI & Session Reset  |
| `components/svg-detailed-body.tsx`  | Component SVG minh họa cấu trúc cơ thể người với các điểm chỉ báo phân tích vùng cơ và mỡ.                                                      | ❌ Pure SVG Rendering        |
| `hooks/use-bp-measurement.ts`       | Hook cầu nối `bpbioSessionMachine` XState v5, quản lý lifecycle kết nối Serial và chuyển bước.                                                  | ⚠️ Hardware & FSM Bridge     |
| `hooks/use-inbody-measurement.ts`   | Hook cầu nối `inbodySessionMachine` XState v5, quản lý kết nối USB Serial và nạp thông tin khách hàng.                                          | ⚠️ Hardware & FSM Bridge     |
| `components/index.ts`               | Barrel File gom và re-export toàn bộ components đo đạc.                                                                                         | ❌ Barrel Re-export          |
| `hooks/index.ts`                    | Barrel File gom và re-export toàn bộ measurement hooks.                                                                                         | ❌ Barrel Re-export          |
| `index.ts`                          | Root Feature Barrel File re-export cho callers ngoài feature.                                                                                   | ❌ Barrel Re-export          |

---

## 2. Các Quyết Định Đã Chốt & Lý Giải Kỹ Thuật (HOW & WHY)

1. **Bộ Đếm Thời Gian Độc Lập Cho Từng Bước (Per-Step Countdown Timers):**
   - **Bước 0 (Huyết áp)**: `60s`
   - **Bước 1 (InBody)**: `90s`
   - **Bước 2 (Kết quả)**: `90s`
   - Khi thiết bị bắt đầu đo (`status === 'measuring'`), bộ đếm đếm ngược tự động **tạm dừng và ẩn đi** để tránh gây áp lực cho người khám. Ở bước Kết quả, bộ đếm chạy liên tục 90s để đảm bảo quyền riêng tư và tự động dọn dẹp dữ liệu về màn hình chờ.
2. **Màn Hình Quét Sinh Học InBody (Laser Scan over SvgDetailedBody):**
   - Thay thế overlay cũ bằng màn hình quét sinh học chuyên biệt: Mô hình người `SvgDetailedBody` kết hợp tia laser đỏ `LinearGradient` chạy quét lên xuống liên tục bằng GPU Reanimated.
3. **Phóng To Cỡ Chữ Chuẩn Kiosk Touch (+100%):**
   - Toàn bộ tiêu đề bước (`text-2xl font-black`) và mô tả thao tác (`text-lg font-bold`) được tăng gấp đôi kích thước giúp người dùng đọc rõ ràng từ khoảng cách đứng khám 1m.
4. **Hiển thị Mã QR Không Viền Khung Rườm Rà:**
   - Mã QR kết quả truy xuất phiên khám sử dụng `react-native-qrcode-svg` (`SvgQrCode`) đặt trong ô nền trắng `rounded-xl`, hỗ trợ quét nhanh bằng Camera điện thoại, Zalo hoặc VNeID.
5. **Loại Bỏ Lỗi Android SVG Arrowhead Marker Crash:**
   - Không dùng `marker-end` hay `orient="auto-start-reverse"` của SVG (gây lỗi `java.lang.NumberFormatException` trên Android Native SVG). Toàn bộ đường chỉ dẫn vùng cơ mỡ sử dụng các thẻ `<Line>` tọa độ chuẩn.

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
