# Mô-đun: Trạng Thái Ứng Dụng Cốt Lõi (App Lifecycle Engine)

Mô-đun quản lý phiên làm việc toàn cục của ứng dụng, kết hợp giữa **XState v5 (`app.machine.ts`)** và **Zustand Store (`use-app-store.ts`)** để điều phối 7 trạng thái vòng đời ứng dụng (Khởi tạo, Xác thực, Kích hoạt máy, Chế độ ngoại tuyến).

⚠️ **Cảnh báo & Ranh giới Phạm vi (Scope & Boundaries)**:

- **QUẢN LÝ PHIÊN TOÀN CỤC**: Mô-đun này điều khiển luồng chuyển cảnh gốc giữa `(auth)` và `(tab)` trong Expo Router.
- **KHÔNG CHỨA LOGIC NGHIỆP VỤ TÀI SẢN**: Nghiệp vụ tài sản (Nhập, Xuất, Kiểm kê) thuộc về `src/core/asset-engine/`.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- **Đặc tả Kỹ thuật**: [docs/specs/0001-auth-device-activation.md](../../../docs/specs/0001-auth-device-activation.md)
- **Root Navigation Layout**: [src/app/\_layout.tsx](../../app/_layout.tsx)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                        | Trách nhiệm                                                          |         Chạm Vào / Ra (I/O)          |
| :------------------------- | :------------------------------------------------------------------- | :----------------------------------: |
| `machines/app.machine.ts`  | XState v5 State Machine quản lý 7 trạng thái phiên làm việc          | ❌ **Pure State Machine** (Zero I/O) |
| `store/use-app-store.ts`   | Zustand Store kết nối UI với XState Actor                            |    ❌ **State Store** (Zero I/O)     |
| `hooks/use-app-context.ts` | Custom hook cung cấp Device Context và Employee Session cho toàn app |     ❌ **Pure Hook** (Zero I/O)      |
| `types/app-state.types.ts` | Định nghĩa kiểu dữ liệu Context, Events và States                    |     ❌ **Pure Types** (Zero I/O)     |
| `index.ts`                 | Barrel file xuất khẩu Store và Hooks                                 |          📦 Module Exports           |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Kiến trúc Actor Pattern XState v5**:
   - _Lý do_: Đảm bảo trạng thái phiên đăng nhập (Đang refresh token, mất mạng, hết hạn phiên) được chuyển đổi chính xác, không bị race condition.
2. **Khôi phục Phiên Ngoại Tuyến (Offline Session Restore)**:
   - _Lý do_: Khi thiết bị mất Wi-Fi trong khuôn viên bệnh viện, app vẫn duy trì phiên làm việc cho nhân viên tiếp tục kiểm kê offline.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# 1. Kiểm tra Type TypeScript
npx tsc --noEmit

# 2. Kiểm tra Lint
npm run lint
```
