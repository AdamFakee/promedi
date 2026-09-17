# Mô-đun Kích hoạt Thiết bị (Activation Feature)

Mô-đun quản lý giao diện form nhập Mã thiết bị & Mã kích hoạt và gọi API kích hoạt Kiosk Sunmi K2 mini tại cơ sở y tế (Màn 0).

---

⚠️ **Cảnh báo & Phân biệt**:

- Mô-đun này dành riêng cho **Admin / Kỹ thuật viên** thực hiện kích hoạt ban đầu khi lắp đặt Kiosk tại phòng khám.
- Phân biệt với mô-đun Định danh khách hàng (`identification`) dành cho bệnh nhân tự nhập thông tin khám.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Nhóm 2 - Runbook Nghiệm Thu**: [activation-runbook.md](../../../docs/plans/activation-runbook.md) _(Kế hoạch kích hoạt & nghiệm thu Kiosk)_
- **Nhóm 3 - Đặc tả Use Case**: [usecase-specification-v4.0.md](../../../docs/specs/usecase-specification-v4.0.md#uc-00-k%C3%8Dch-ho%E1%BA%A0t-thi%E1%BA%BEt-b%E1%BB%8B-kiosk-admin-activation---b%E1%BA%AEt-b%E1%BB%90c) _(UC-00 & BR-ACT-01)_
- **Màn hình sử dụng Form**: `src/app/(auth)/device-activation.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                                         | Trách nhiệm                                            | Chạm Vào/Ra (I/O)             |
| :-------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :---------------------------- |
| [`index.ts`](file:///d:/promedi/src/features/activation/index.ts)                                                           | Barrel File xuất ra Public API cho mô-đun              | ❌ Logic thuần                |
| [`components/activation-form.tsx`](file:///d:/promedi/src/features/activation/components/activation-form.tsx)               | Form nhập Mã thiết bị & Mã kích hoạt Kiosk             | 🌐 UI / State React Hook Form |
| [`api/activate-device.ts`](file:///d:/promedi/src/features/activation/api/activate-device.ts)                               | Hook `useActivateDevice` gọi API REST kích hoạt        | 🌐 REST API / Axios client    |
| [`validations/activate-device.schema.ts`](file:///d:/promedi/src/features/activation/validations/activate-device.schema.ts) | Valibot validation schema cho form Kích hoạt           | ❌ Logic thuần                |
| [`types/activation.types.ts`](file:///d:/promedi/src/features/activation/types/activation.types.ts)                         | Định nghĩa TypeScript Interfaces cho payload Kích hoạt | ❌ Logic thuần                |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Bắt buộc Kích hoạt (BR-ACT-01)**:
   - Ứng dụng Kiosk kiểm tra cờ `is_activated` từ bộ nhớ cục bộ (MMKV/SQLite). Nếu chưa kích hoạt, khóa toàn bộ ứng dụng tại Màn 0.
   - Khi kích hoạt thành công, tự động lưu thông tin cấu hình chi nhánh/cơ sở y tế và mở khóa chuyển sang Màn 1 (Video chờ).

2. **Quy chuẩn API 1 File = 1 Endpoint**:
   - `activate-device.ts` chứa `useActivateDevice` custom mutation hook và `activateDeviceQueryKey`.

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
