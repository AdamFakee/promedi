# Configs Module (Cấu hình Toàn cục)

Quản lý cấu hình toàn cục của hệ thống ProMedi, bao gồm cấu hình môi trường ứng dụng và bộ thiết lập truy vấn React Query.

⚠️ **Đoạn Cảnh báo & Phân biệt**:
Mô-đun này cung cấp cấu hình tĩnh (static compile-time / TS constants) cho toàn bộ ứng dụng. Không chứa logic runtime thay đổi theo phiên khám (Session State) hay lưu trữ bí mật của người dùng (Token/CCCD).

## Danh sách Tham chiếu (Reference Links)

- [environment-configuration-spec.md](../../../docs/specs/environment-configuration-spec.md): Đặc tả kiến trúc cấu hình môi trường hệ thống.
- [usecase-specification-v4.0.md](../../../docs/specs/usecase-specification-v4.0.md): Đặc tả luồng nghiệp vụ tổng quan Kiosk.

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp               | Trách nhiệm                                                                                | Chạm Vào/Ra (I/O)         |
| :---------------- | :----------------------------------------------------------------------------------------- | :------------------------ |
| `env.config.ts`   | Khai báo hằng số môi trường (`uat`, `prod`), API Base URL, Timeout, Logger flag            | ❌ Logic thuần (Zero I/O) |
| `query.config.ts` | Thiết lập các presets cho React Query (`DEFAULT`, `STATIC`, `REALTIME`, `OFFLINE_PERSIST`) | ❌ Logic thuần (Zero I/O) |
| `index.ts`        | Barrel file re-export toàn bộ cấu hình ra ngoài module                                     | ❌ Logic thuần (Zero I/O) |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Dùng Pure TypeScript thay vì File `.env`**:
   - Tránh phụ thuộc vào plugin phân giải biến môi trường phức tạp của bundler (Metro/Expo) trên Kiosk Android.
   - 100% Type-Safe và tự động gợi ý autocomplete qua `ENV.*`.
2. **Gộp UAT và DEV là một**:
   - Tối giản hóa quy trình chuyển đổi: Lập trình viên chỉ cần đổi `ACTIVE_ENV = 'uat' | 'prod'`.
   - Cung cấp đồng thời cờ `isUat` và alias `isDev` để tương thích linh hoạt với các đoạn kiểm tra điều kiện.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npx tsc --noEmit

# Kiểm tra Linter
npm run lint
```
