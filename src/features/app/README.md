# Mô-đun: Trạng Thái Ứng Dụng Cốt Lõi (App Lifecycle Engine)

Mô-đun quản lý phiên làm việc toàn cục của thiết bị Kiosk, kết hợp giữa **XState v5 (`app.machine.ts`)** và **Zustand Store (`use-app-store.ts`)** để điều phối vòng đời ứng dụng Kiosk (Khởi tạo, Kích hoạt thiết bị Kiosk, Duy trì trạng thái đã kích hoạt).

⚠️ **Cảnh báo & Ranh giới Phạm vi (Scope & Boundaries)**:

- **QUẢN LÝ THIẾT BỊ TOÀN CỤC**: Mô-đun này điều khiển luồng chuyển cảnh gốc giữa `(auth)` (Device Activation) và `(kiosk)` trong Expo Router.
- **KHÔNG DÙNG ĐĂNG NHẬP NHÂN VIÊN**: Kiosk vận hành độc lập theo cơ chế Kích hoạt thiết bị (`DEVICE_ACTIVATED`), tự động nhận token khi kích hoạt và chuyển trực tiếp tới màn hình Kiosk (`/kiosk/idle`).

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Đặc tả Use Case**: [docs/specs/usecase-specification-v4.0.md](../../../docs/specs/usecase-specification-v4.0.md)
- **Root Navigation Layout**: [src/app/\_layout.tsx](../../app/_layout.tsx)
- **App Gate Routing Hook**: [src/shared/hooks/use-app-gate.ts](../../shared/hooks/use-app-gate.ts)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                        | Trách nhiệm                                                 |         Chạm Vào / Ra (I/O)          |
| :------------------------- | :---------------------------------------------------------- | :----------------------------------: |
| `machines/app.machine.ts`  | XState v5 State Machine quản lý trạng thái kích hoạt Kiosk  | ❌ **Pure State Machine** (Zero I/O) |
| `store/use-app-store.ts`   | Zustand Store lưu vết persistent session qua storage (MMKV) |   🌐 **Local Storage I/O** (MMKV)    |
| `hooks/use-app-context.ts` | Custom hook cung cấp Device Context và Token cho toàn app   |     ❌ **Pure Hook** (Zero I/O)      |
| `types/app.types.ts`       | Định nghĩa kiểu dữ liệu Context, Events và States           |     ❌ **Pure Types** (Zero I/O)     |
| `index.ts`                 | Barrel file xuất khẩu Store, Machine và Hooks               |          📦 Module Exports           |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Cơ chế Pure Device Activation (Không Login Nhân viên)**:
   - _Lý do_: Kiosk Sumi K2 mini là thiết bị phục vụ tự động cho người dân/bệnh nhân. Việc đăng nhập nhân viên là không cần thiết và rườm rà. Khi kích hoạt thiết bị thành công (`DEVICE_ACTIVATED`), hệ thống nhận `accessToken` & `refreshToken` trực tiếp để gọi API.
2. **Kiến trúc Actor Pattern XState v5**:
   - _Lý do_: Đảm bảo trạng thái thiết bị (`initializing` -> `deviceInactive` / `authenticated`) luôn chính xác, đồng bộ với router navigation qua `useAppGate()`.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# 1. Kiểm tra Type TypeScript
npx tsc --noEmit

# 2. Kiểm tra Lint
npm run lint
```
