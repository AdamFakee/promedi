# Danh Mục Tài Liệu Phần Cứng & Thiết Bị Y Tế (Hardware Specifications)

Thư mục này chứa toàn bộ các đặc tả kỹ thuật, chuẩn giao thức kết nối phần cứng và hướng dẫn tích hợp thiết bị y tế cho hệ thống Kiosk **ProMedi**.

---

## 📚 Danh Mục Tài Liệu Chuẩn

1. **[Tài Liệu Giao Thức Mở InBody 260S Chuẩn Hãng (Open Protocol Spec)](file:///d:/promedi/docs/hard-ware/inbody260s-open-protocol-spec.md)**
   - **Tệp**: `inbody260s-open-protocol-spec.md`
   - **Mô tả**: Tài liệu giao thức mở nguyên bản của hãng InBody CO.,LTD (phiên bản v3.2). Định nghĩa cấu trúc khung truyền Hex/ASCII, mã lệnh điều khiển (`STATUS`, `INFO`, `RESULT`, `LOCK/UNLOCK`), bảng tra cứu 764 chỉ số BIA và quy trình thao tác phần cứng.
   - **Tệp Gốc PDF**: [`tài liệu máy inbody.pdf`](file:///d:/promedi/docs/hard-ware/t%C3%A0i%20li%E7%BF%87u%20m%C3%A1y%20inbody.pdf) (InBody 260S Open Protocol User Guide v3.2).

2. **[Đặc Tả Kiến Trúc SDK Phần Mềm InBody 260S (Architecture Spec & ADR)](file:///d:/promedi/docs/specs/inbody-sdk-architecture.md)**
   - **Tệp**: `docs/specs/inbody-sdk-architecture.md`
   - **Mô tả**: Đặc tả kiến trúc phần mềm 4 lớp của SDK điều khiển InBody 260S trên Kiosk ProMedi. Giải trình lý do thiết kế, quy tắc mã hóa `latin1`, xử lý chuỗi tiếng Việt `sanitizeAscii`, Half-Duplex Mutex Lock, XState v5 Session Machine và bảng đối chiếu mã nguồn.

---

## 🛠️ Mã Nguồn Cài Đặt Tương Ứng (Source Code References)

- **Mô-đun SDK InBody 260S**: [`src/core/hardware/inbody/`](file:///d:/promedi/src/core/hardware/inbody/)
- **Transport TCP Socket (Port 2004)**: `src/core/hardware/inbody/transport/tcp-transport.ts`
- **Frame Codec & Commands**: `src/core/hardware/inbody/protocol/`
- **XState Session Machine**: `src/core/hardware/inbody/machine/inbody-session.machine.ts`
- **Device Adapter**: `src/core/hardware/inbody/device/inbody.device.ts`
- **React Native Hook**: `src/core/hardware/inbody/hooks/use-inbody-session.ts`
- **Tiện ích tiếng Việt**: `src/core/hardware/inbody/utils/sanitize-ascii.ts`
