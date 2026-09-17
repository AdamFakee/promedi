# Theme & Dynamic Runtime Scaling System

Mô-đun quản lý Single Source of Truth cho Design Tokens (màu sắc, khoảng cách, font chữ, đổ bóng) và tự động tính toán hệ số co giãn động K (Visual Scaling Factor) lúc runtime dựa trên thông số vật lý của màn hình Kiosk và khoảng cách nhìn.

⚠️ **Đoạn Cảnh báo & Phân biệt**:

- Mô-đun này **KHÔNG** quản lý trạng thái giao diện tạm thời (React State / Redux / Zustand), cũng **KHÔNG** phụ thuộc vào hằng số build-time hay CSS tĩnh.
- Tất cả kích thước (spacing, fontSize, borderRadius, borderWidth) được tính toán động qua hệ số K và bơm vào ứng dụng dưới dạng CSS Variables (`--sp-*`, `--fs-*`) tương thích với NativeWind v4 (`react-native-css-interop`).

### Danh sách Tham chiếu (Reference Links)

- [Đặc tả Kiến trúc & Design Rationale](../../../docs/specs/theme-system.md)
- [Tailwind Config](../../../tailwind.config.js)
- [Root Layout Provider](../../app/_layout.tsx)

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                          | Trách nhiệm                                                                                                 | Chạm Vào/Ra (I/O)                                      |
| :------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| [`design-tokens.ts`](./design-tokens.ts)     | Nguồn token thiết kế duy nhất (Colors, Shadows, Base Spacing, Typography, Base Radius).                     | ❌ Logic thuần (Zero I/O)                              |
| [`scale.ts`](./scale.ts)                     | Thuật toán tính toán K theo góc nhìn vật lý, làm tròn nấc 0.05, kiểm tra sàn vùng chạm tối thiểu 19mm.      | ❌ Logic thuần (Zero I/O, đọc Dimensions / PixelRatio) |
| [`scale-provider.tsx`](./scale-provider.tsx) | React Context Provider sử dụng `useWindowDimensions()` và bơm CSS variables qua `vars()` của NativeWind v4. | 🌐 React Context & Native Dynamic Stylesheet           |
| [`index.ts`](./index.ts)                     | Barrel file public API xuất khẩu tất cả các hàm, types và tokens của mô-đun Theme.                          | ❌ Barrel File (Pure Exports)                          |

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Giữ nguyên Góc nhìn Vật lý (Physical Visual Angle)**:
   - Một dòng chữ cao 2.54mm cầm ở khoảng cách 350mm (Smartphone) cần được hiển thị cao 4.7mm ở khoảng cách 650mm (Kiosk đứng).
   - Công thức tính K:
     $$K = \text{comfort} \times \frac{\text{viewDistance}}{350} \times \frac{\text{ppi}}{160 \times \text{pixelRatio}}$$
2. **Làm tròn nấc 0.05 (Quantization)**:
   - Đảm bảo K không rơi vào chuỗi số thực tự do gây lệch layout giữa các lần render và để mọi máy trong cùng một fleet Kiosk có giao diện nhất quán.
3. **Sàn Vùng Chạm Tối Thiểu 19mm (Touch Target Floor)**:
   - Khi Kiosk ở chế độ thao tác đứng, vùng chạm của nút bấm được đảm bảo $\ge 19\text{mm}$ vật lý kể cả khi K bị làm tròn xuống hoặc OEM báo sai độ phân giải.
4. **NativeWind Dynamic CSS Variables**:
   - Thay vì truyền inline style phức tạp, tất cả token kích thước được bơm vào biến CSS (`--sp-md`, `--fs-body`, `--r-button`, `--sp-touch`). Tailwind utility classes (`p-md`, `text-body`, `rounded-button`, `min-h-touch`) tự động ăn theo hệ số K lúc runtime.

## 3. Hướng dẫn kiểm thử & Chạy lệnh

- **Kiểm tra TypeScript**:
  ```bash
  npx tsc --noEmit
  ```
- **Kiểm tra Linter**:
  ```bash
  npm run lint
  ```
