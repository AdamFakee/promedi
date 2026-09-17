# Mô-đun Tổng hợp Kết quả & Đếm lùi Bảo mật (Summary Feature)

Mô-đun quản lý giao diện Bảng hiển thị kết quả khám tổng hợp (Màn 6) bao gồm thông tin cá nhân, kết quả đo Huyết áp / InBody, mã QR lưu kết quả và Thanh đếm ngược 60s xóa sạch dữ liệu bảo mật (BR-PRIVACY-01).

---

⚠️ **Cảnh báo & Phân biệt**:

- Mô-đun này xử lý **Tổng kết phiên khám** và **Tự động xóa dữ liệu tạm phiên** sau 60 giây rảnh rỗi hoặc khi bấm "KẾT THÚC".

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Nhóm 2 - Runbook Nghiệm Thu**: [summary-runbook.md](../../../docs/plans/summary-runbook.md)
- **Nhóm 3 - Đặc tả Use Case**: [usecase-specification-v4.0.md](../../../docs/specs/usecase-specification-v4.0.md#uc-06-b%E1%BA%A2ng-hi%E1%BB%82n-th%E1%BB%8A-k%E1%BA%BEt-qu%E1%BA%A2-t%E1%BB%95ng-h%E1%BB%A2p--qu%C3%89t-m%C3%83-qr-summary-dashboard) _(UC-06, UC-07 & BR-PRIVACY-01)_
- **Màn hình sử dụng Component**: `src/app/(kiosk)/result-summary.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                                    | Trách nhiệm                                  | Chạm Vào/Ra (I/O)       |
| :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------- | :---------------------- |
| [`index.ts`](file:///d:/promedi/src/features/summary/index.ts)                                                         | Barrel File xuất ra Public API cho mô-đun    | ❌ Logic thuần          |
| [`components/privacy-countdown-bar.tsx`](file:///d:/promedi/src/features/summary/components/privacy-countdown-bar.tsx) | Thanh đếm ngược 60s animated bảo mật dữ liệu | 🌐 UI / State Component |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Bảo mật Quyền riêng tư (BR-PRIVACY-01)**:
   - Thanh đếm lùi 60 giây hiển thị nổi bật ở chân trang.
   - Khi đếm còn $\le 10$ giây, đổi màu sang trạng thái cảnh báo đỏ `border-red-400 bg-red-50`.
   - Mọi thao tác chạm màn hình đều phát ra event reset timer về 60s.

2. **Dùng biểu tượng SVG Nội bộ**:
   - Sử dụng `SvgClockIcon` từ `@/shared/components/ui` thay cho biểu tượng `lucide-react-native`.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

- **Kiểm tra TypeScript Strict**:
  ```bash
  npm run check-type
  ```
- **Kiểm tra Linter**:
  ```bash
  npm run lint
  ```
