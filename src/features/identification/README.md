# Mô-đun Định danh Khách hàng (Identification Feature)

Mô-đun quản lý giao diện Popup Modal nhập thông tin định danh khách hàng (Họ và tên, Số CCCD 12 chữ số, Số tuổi & Giới tính) phục vụ luồng tự khám sức khỏe tại Kiosk và truyền dữ liệu cho máy InBody 260S.

---

⚠️ **Cảnh báo & Phân biệt**:

- Mô-đun này xử lý **Định danh khách hàng** qua Popup Modal căn giữa tại Màn hình rảnh rỗi (Idle screen).
- Thông tin định danh thu thập **Họ và tên (bắt buộc)**, **Số CCCD 12 chữ số (bắt buộc)**, **Số tuổi (1-120, bắt buộc)** và **Giới tính ('M' | 'F', bắt buộc)**. Dữ liệu này được truyền trực tiếp xuống State Machine và nạp vào máy InBody 260S qua lệnh Open Protocol `INFO (0x75)`.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Nhóm 2 - Runbook Nghiệm Thu**: [identification-runbook.md](../../../docs/plans/identification-runbook.md) _(Kế hoạch thực thi & nghiệm thu Kiosk)_
- **Nhóm 3 - Đặc tả Use Case**: [usecase-specification-v4.0.md](../../../docs/specs/usecase-specification-v4.0.md#uc-02-nh%E1%BA%ADp-th%C3%B4ng-tin-%C4%91%E1%BB%8Bnh-danh-identification) _(UC-02 & BR-IDENT-01)_
- **Nhóm 3 - Kiến trúc FSM**: [fsm-2-layer-architecture.md](../../../docs/specs/fsm-2-layer-architecture.md)
- **Màn hình sử dụng Modal**: `src/app/(kiosk)/idle.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                                                                                                           | Trách nhiệm                                                     | Chạm Vào/Ra (I/O)             |
| :---------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- | :---------------------------- |
| [`index.ts`](file:///d:/promedi/src/features/identification/index.ts)                                                         | Barrel File xuất ra Public API cho mô-đun                       | ❌ Logic thuần                |
| [`components/identification-modal.tsx`](file:///d:/promedi/src/features/identification/components/identification-modal.tsx)   | Form Popup căn giữa nhập Họ tên, Tuổi, Giới tính & Số CCCD      | 🌐 UI / State React Hook Form |
| [`validations/identification.schema.ts`](file:///d:/promedi/src/features/identification/validations/identification.schema.ts) | Valibot validation schema cho Họ tên, CCCD, Số tuổi & Giới tính | ❌ Logic thuần                |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Ràng buộc Định danh Bắt buộc (Mandatory Identification Fields)**:
   - Các trường **Họ và tên** (không trống), **Số CCCD** (đúng 12 chữ số `/^\d{12}$/`), **Số tuổi** (từ 1 đến 120) và **Giới tính** (`'M' | 'F'`) đều là **bắt buộc**.
   - Lựa chọn giới tính sử dụng Base Component `SegmentedControl` kết hợp Controller từ `react-hook-form` để đảm bảo UI chuẩn Kiosk Touch và phục vụ chính xác thuật toán đo cơ/mỡ InBody. Giới tính không được chọn mặc định từ đầu.
   - Hiệu ứng phản hồi tương tác (Micro-interaction): Khi người dùng bấm submit mà chưa chọn giới tính, hệ thống kích hoạt hiệu ứng Reanimated **rung lắc ngang (shake)** dứt khoát và hiển thị thông báo lỗi qua Base Component `InputError`.
   - Sử dụng Valibot Schema kết hợp `react-hook-form` với `mode: 'onSubmit'` để chỉ validate khi người dùng bấm "Bắt đầu kiểm tra sức khỏe".

2. **Dữ liệu Đồng bộ Phần cứng InBody**:
   - Dữ liệu tuổi (`age`), giới tính (`gender`), số CCCD (`id`) và họ tên từ Modal được chuyển tiếp vào `submitIdentification` và truyền tự động qua máy InBody 260S khi bắt đầu đo qua lệnh `INFO (0x75)`.

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
