# Danh Mục Tài Liệu Phần Cứng & Thiết Bị Y Tế (Hardware Specifications)

Thư mục này chứa toàn bộ các đặc tả kỹ thuật, chuẩn giao thức kết nối phần cứng và hướng dẫn tích hợp thiết bị y tế cho hệ thống Kiosk **ProMedi**.

---

## 📚 Danh Mục Tài Liệu Chuẩn

1. **[Tài Liệu Giao Thức Mở InBody 260S Chuẩn Hãng (Open Protocol Spec)](file:///d:/promedi/docs/hard-ware/inbody260s-open-protocol-spec.md)**
   - **Tệp**: `inbody260s-open-protocol-spec.md`
   - **Mô tả**: Tài liệu giao thức mở nguyên bản của hãng InBody CO.,LTD (phiên bản v3.2). Định nghĩa cấu trúc khung truyền Hex/ASCII, mã lệnh điều khiển (`STATUS`, `INFO`, `RESULT`, `LOCK/UNLOCK`), bảng tra cứu 764 chỉ số BIA và quy trình thao tác phần cứng.
   - **Tệp Gốc PDF**: [`tài liệu máy inbody.pdf`](file:///d:/promedi/docs/hard-ware/t%C3%A0i%20li%E7%BF%87u%20m%C3%A1y%20inbody.pdf) (InBody 260S Open Protocol User Guide v3.2).

2. **[Tài Liệu Giao Thức Tích Hợp Máy Đo Huyết Áp BPBIO320/750 (Protocol Spec)](file:///d:/promedi/docs/hard-ware/bpbio320-750-protocol-spec.md)**
   - **Tệp**: `bpbio320-750-protocol-spec.md`
   - **Mô tả**: Tài liệu đặc tả giao thức kết nối Serial UART (9600 bps) cho các dòng máy đo huyết áp BPBIO320 / BPBIO750. Cấu trúc khung truyền 64 byte, 7 sự kiện phát sóng tự động, lệnh điều khiển chủ động Tx/Rx,Open Protocol rút dữ liệu áp suất thời gian thực & chỉ số lâm sàng (AX, IX).

3. **[Đặc Tả Kiến Trúc SDK Phần Mềm InBody 260S (Architecture Spec & ADR)](file:///d:/promedi/docs/specs/inbody-sdk-architecture.md)**
   - **Tệp**: `docs/specs/inbody-sdk-architecture.md`
   - **Mô tả**: Đặc tả kiến trúc phần mềm 4 lớp của SDK điều khiển InBody 260S trên Kiosk ProMedi. Giải trình lý do thiết kế, quy tắc mã hóa `latin1`, xử lý chuỗi tiếng Việt `sanitizeAscii`, Half-Duplex Mutex Lock, XState v5 Session Machine và bảng đối chiếu mã nguồn.

4. **[Đặc Tả Kỹ Thuật & Kiến Trúc Kiosk Sunmi K2 (Hardware Specification)](file:///d:/promedi/docs/hard-ware/sunmi-k2-kiosk-spec.md)**
   - **Tệp**: `sunmi-k2-kiosk-spec.md`
   - **Mô tả**: Tài liệu đặc tả tích hợp trọn bộ phần cứng Kiosk Sunmi K2 (Đầu đọc thẻ NFC kép qua AIDL & Android Foreground Dispatch, Máy in nhiệt 80mm qua PrinterSdk).
   - **Runbook Triển Khai**: [`docs/plans/sunmi-k2-kiosk-runbook.md`](file:///d:/promedi/docs/plans/sunmi-k2-kiosk-runbook.md).

---

## 🛠️ Mã Nguồn Cài Đặt Tương Ứng (Source Code References)

- **Native Module Sunmi K2**: [`modules/expo-sunmi-k2/`](file:///d:/promedi/modules/expo-sunmi-k2/)
- **Native Module USB Serial (InBody/BPBIO)**: [`modules/expo-usb-serial-bridge/`](file:///d:/promedi/modules/expo-usb-serial-bridge/)
- **Mô-đun SDK InBody 260S**: [`src/core/hardware/inbody/`](file:///d:/promedi/src/core/hardware/inbody/)
- **Transport TCP Socket (Port 2004)**: `src/core/hardware/inbody/transport/tcp-transport.ts`
- **Frame Codec & Commands**: `src/core/hardware/inbody/protocol/`
- **XState Session Machine**: `src/core/hardware/inbody/machine/inbody-session.machine.ts`
- **Device Adapter**: `src/core/hardware/inbody/device/inbody.device.ts`
- **React Native Hook**: `src/core/hardware/inbody/hooks/use-inbody-session.ts`
- **Tiện ích tiếng Việt**: `src/core/hardware/inbody/utils/sanitize-ascii.ts`
