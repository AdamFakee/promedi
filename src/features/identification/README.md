# Mô-đun Định danh Khách hàng (Identification Feature)

Mô-đun quản lý giao diện Popup Modal nhập thông tin định danh bệnh nhân (Họ và tên & Số Căn cước công dân 12 chữ số) phục vụ luồng tự khám sức khỏe tại Kiosk.

---

⚠️ **Cảnh báo & Phân biệt**:

- Mô-đun này xử lý **Định danh khách hàng** qua Popup Modal căn giữa tại Màn hình rảnh rỗi (Idle screen).
- Thông tin định danh chỉ thu thập **Họ và tên (bắt buộc)** và **Số CCCD 12 chữ số (bắt buộc)**. Phân biệt với mô-đun Kích hoạt thiết bị (`activation`) dành cho Admin Kiosk.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Nhóm 2 - Runbook Nghiệm Thu**: [identification-runbook.md](../../../docs/plans/identification-runbook.md) _(Kế hoạch thực thi & nghiệm thu Kiosk)_
- **Nhóm 3 - Đặc tả Use Case**: [usecase-specification-v4.0.md](../../../docs/specs/usecase-specification-v4.0.md#uc-02-nh%E1%BA%ADp-th%C3%B4ng-tin-%C4%91%E1%BB%8Bnh-danh-identification) _(UC-02 & BR-IDENT-01)_
- **Nhóm 3 - Kiến trúc FSM**: [fsm-2-layer-architecture.md](../../../docs/specs/fsm-2-layer-architecture.md)
- **Màn hình sử dụng Modal**: `src/app/(kiosk)/idle.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                                           | Trách nhiệm                                     | Chạm Vào/Ra (I/O)             |
| :---------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- | :---------------------------- |
| [`index.ts`](file:///d:/promedi/src/features/identification/index.ts)                                                         | Barrel File xuất ra Public API cho mô-đun       | ❌ Logic thuần                |
| [`components/identification-modal.tsx`](file:///d:/promedi/src/features/identification/components/identification-modal.tsx)   | Form Popup căn giữa nhập Họ tên & Số CCCD       | 🌐 UI / State React Hook Form |
| [`components/virtual-numpad.tsx`](file:///d:/promedi/src/features/identification/components/virtual-numpad.tsx)               | Bàn phím số ảo tích hợp phím Xóa                | ⚠️ Native Haptics Feedback    |
| [`validations/identification.schema.ts`](file:///d:/promedi/src/features/identification/validations/identification.schema.ts) | Valibot validation schema cho 2 trường bắt buộc | ❌ Logic thuần                |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Ràng buộc Định danh Bắt buộc (Mandatory Both Fields)**:
   - Cả 2 trường **Họ và tên** (không trống) và **Số CCCD** (đúng 12 chữ số `/^\d{12}$/`) đều là **bắt buộc**.
   - Sử dụng Valibot Schema kết hợp `react-hook-form` với `mode: 'onSubmit'` để chỉ validate khi người dùng bấm "Bắt đầu kiểm tra sức khỏe".

2. **Tối ưu Hiệu năng Bấm phím 60fps (Zero Waterfalls & Re-render Elimination)**:
   - Loại bỏ `watch('identityCode')` ở Modal cha. Sử dụng `getValues('identityCode')` trong `useCallback` để ngắt kết nối re-render toàn bộ Modal khi gõ phím.
   - Bọc `VirtualNumpad` bằng `React.memo` giúp 11 nút bấm phím không bị re-render lại khi giá trị input thay đổi.
   - Truyền `{ shouldValidate: false }` khi gọi `setValue` từ phím bấm Numpad để không trigger Valibot schema validation đồng bộ trên từng keystroke.

3. **An toàn Haptics Bridge**:
   - Bọc `Haptics.impactAsync(...).catch(() => {})` giúp tránh nghẽn thread bridge trên thiết bị Kiosk Android không có haptic motor.

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
