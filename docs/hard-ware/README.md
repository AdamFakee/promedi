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

## 🤖 HƯỚNG DẪN BẮT BUỘC CHO AI AGENT KHI SETUP & LÀM VIỆC VỚI SUNMI K2 SDK

> [!IMPORTANT]
> **Quy tắc Tối Thượng**: Khi thực hiện bất kỳ task nào liên quan đến **Sunmi K2 Kiosk** (Setup K2 SDK, Máy in nhiệt 80mm, Đầu đọc NFC/CCCD, Barcode/QR Scanner, Cấu hình Kiosk Lockdown, Quản lý toàn màn hình Fullscreen, Quyền truy cập cổng USB ngoại vi), AI Agent **BẮT BUỘC PHẢI ĐỌC CÁC TÀI LIỆU TẠI THƯ MỤC [`docs/hard-ware/docs/`](file:///d:/promedi/docs/hard-ware/docs/)** trước khi viết hoặc sửa code!

### 🗺️ Bản Đồ Tài Liệu Sunmi K2 SDK (Tra cứu theo bài toán):

| Bài toán / Nhiệm vụ K2                             | Tài liệu Spec bắt buộc phải đọc                                                                                                                                        | Nội dung cốt lõi cần chú ý                                                                                                      |
| :------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Setup & Onboarding SDK**                         | [`docs/2-sunmi-developer-onboarding-and-setup-spec.md`](file:///d:/promedi/docs/hard-ware/docs/2-sunmi-developer-onboarding-and-setup-spec.md)                         | Gradle dependency (`com.sunmi:printerlibrary`), cơ chế bất đồng bộ `InnerPrinterCallback`, null-safety check, seam bind service |
| **Tổng quan Hệ sinh thái Sunmi**                   | [`docs/1-sunmi-ecosystem-integration-spec.md`](file:///d:/promedi/docs/hard-ware/docs/1-sunmi-ecosystem-integration-spec.md)                                           | Kiến trúc tổng thể SUNMI OS, phân vùng Partner Platform, quy chuẩn tương thích thiết bị Kiosk                                   |
| **Lấy Serial Number & Định danh máy**              | [`docs/3-sunmi-device-sn-and-identifier-acquisition-spec.md`](file:///d:/promedi/docs/hard-ware/docs/3-sunmi-device-sn-and-identifier-acquisition-spec.md)             | Lấy SN thiết bị qua Sunmi System Service, kiểm tra quyền truy cập và fallback định danh                                         |
| **Toàn màn hình & Khóa System UI (Kiosk)**         | [`docs/4-sunmi-fullscreen-and-system-ui-management-spec.md`](file:///d:/promedi/docs/hard-ware/docs/4-sunmi-fullscreen-and-system-ui-management-spec.md)               | Ẩn thanh điều hướng (Navigation Bar), trạng thái Immersive Sticky Mode, vô hiệu hóa vuốt mở thanh thông báo                     |
| **Duy trì quyền USB vĩnh viễn (Không bị hỏi lại)** | [`docs/5-sunmi-usb-peripheral-permission-persistence-spec.md`](file:///d:/promedi/docs/hard-ware/docs/5-sunmi-usb-peripheral-permission-persistence-spec.md)           | Cấp quyền tự động cho thiết bị USB (InBody, Máy đo huyết áp, ESP32) mà không hiện popup hỏi người dùng Kiosk                    |
| **Chống xóa dữ liệu ứng dụng (Security)**          | [`docs/6-sunmi-prevent-app-data-clearing-spec.md`](file:///d:/promedi/docs/hard-ware/docs/6-sunmi-prevent-app-data-clearing-spec.md)                                   | Chính sách Device Owner / Kiosk Lock, bảo vệ dữ liệu SQLite và bộ đếm offline                                                   |
| **Chống giật/chớp màn hình khi cắm rút USB**       | [`docs/7-sunmi-prevent-usb-flicker-config-changes-spec.md`](file:///d:/promedi/docs/hard-ware/docs/7-sunmi-prevent-usb-flicker-config-changes-spec.md)                 | Cấu hình `android:configChanges` trong AndroidManifest tránh tái tạo lại Activity khi USB reconnect                             |
| **Chống xung đột Scanner với Bàn phím ảo**         | [`docs/8-sunmi-prevent-scanner-ime-corruption-spec.md`](file:///d:/promedi/docs/hard-ware/docs/8-sunmi-prevent-scanner-ime-corruption-spec.md)                         | Ngăn đầu đọc mã vạch / QR Code kích hoạt bàn phím ảo IME làm che khuất giao diện Kiosk                                          |
| **Tùy biến phím âm lượng làm phím tắt**            | [`docs/9-sunmi-customize-volume-keys-shortcut-spec.md`](file:///d:/promedi/docs/hard-ware/docs/9-sunmi-customize-volume-keys-shortcut-spec.md)                         | Chặn phím vật lý hoặc ánh xạ thành shortcut bảo trì kỹ thuật cho Kiosk                                                          |
| **Xử lý sự cố & Troubleshooting SUNMI OS**         | [`docs/10-sunmi-faq-platform-security-and-troubleshooting-spec.md`](file:///d:/promedi/docs/hard-ware/docs/10-sunmi-faq-platform-security-and-troubleshooting-spec.md) | Bảng mã lỗi thường gặp, cách phân tích log ADB trên phần cứng thật Sunmi K2                                                     |

---

### 🖨️ Tài Liệu Máy In Nhiệt Sunmi K2 (Thư mục [`docs/hard-ware/docs/printer/`](file:///d:/promedi/docs/hard-ware/docs/printer/))

Khi làm việc với máy in nhiệt 80mm trên Kiosk Sunmi K2, Agent **bắt buộc tra cứu các tài liệu chuyên sâu**:

1. **Tổng quan & Cài đặt**: [`1-sunmi-printer-sdk-overview-spec.md`](file:///d:/promedi/docs/hard-ware/docs/printer/1-sunmi-printer-sdk-overview-spec.md) — Kiến trúc máy in, AIDL service, kết nối.
2. **Nâng cấp SDK**: [`2-sunmi-printer-sdk-upgrade-guide-spec.md`](file:///d:/promedi/docs/hard-ware/docs/printer/2-sunmi-printer-sdk-upgrade-guide-spec.md) — Hướng dẫn chuyển đổi giữa các phiên bản SDK.
3. **PrinterX SDK**: [`3-sunmi-printerx-sdk-overview-spec.md`](file:///d:/promedi/docs/hard-ware/docs/printer/3-sunmi-printerx-sdk-overview-spec.md) — Thế hệ SDK in ấn mới hỗ trợ đa nền tảng.
4. **In hóa đơn/phiếu khám dạng dòng**: [`5-sunmi-printerx-line-api-thermal-receipts-spec.md`](file:///d:/promedi/docs/hard-ware/docs/printer/5-sunmi-printerx-line-api-thermal-receipts-spec.md) — In văn bản, bảng cột chỉ số y tế, căn chỉnh lề, cắt giấy tự động.
5. **In đồ họa & Biểu đồ y tế (Canvas API)**: [`6-sunmi-printerx-canvas-api-label-printing-spec.md`](file:///d:/promedi/docs/hard-ware/docs/printer/6-sunmi-printerx-canvas-api-label-printing-spec.md) — Vẽ đồ họa trực tiếp, nhị phân hóa ảnh nhiệt (Image Binarization) in QR Code / Logo / Biểu đồ InBody.
6. **Truy vấn trạng thái máy in (Query API)**: [`8-sunmi-printerx-query-api-status-and-info-spec.md`](file:///d:/promedi/docs/hard-ware/docs/printer/8-sunmi-printerx-query-api-status-and-info-spec.md) — Kiểm tra hết giấy, kẹt giấy, mở nắp máy in, quá nhiệt đầu in.
7. **Lệnh thô ESC/POS & TSPL**: [`9-sunmi-printerx-command-api-escpos-and-tspl-spec.md`](file:///d:/promedi/docs/hard-ware/docs/printer/9-sunmi-printerx-command-api-escpos-and-tspl-spec.md) — Gửi lệnh byte trực tiếp khi cần tùy biến sâu.

---

### 📋 Checklist 4 Bước Dành Cho Agent Khi Làm Việc Với K2 SDK:

- [ ] **Bước 1**: Đọc tài liệu spec tương ứng trong `docs/hard-ware/docs/` trước khi chạm vào code.
- [ ] **Bước 2**: Đối chiếu với Expo Native Module hiện tại tại [`modules/expo-sunmi-k2/`](file:///d:/promedi/modules/expo-sunmi-k2/).
- [ ] **Bước 3**: Tuyệt đối không gọi trực tiếp API Android SDK trong React component; phải tuân thủ kiến trúc HAL qua Interface Contract tại `src/core/hardware/`.
- [ ] **Bước 4**: Luôn kiểm tra cơ chế Asynchronous Service Binding (`InnerPrinterCallback`) và xử lý đầy đủ các trạng thái lỗi/mất kết nối (Safe Null Checks & Try-Catch).

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
