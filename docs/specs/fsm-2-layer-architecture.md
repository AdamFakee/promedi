# KIẾN TRÚC FSM 2 LỚP — KIOSK KHÁM SỨC KHỎE TỰ ĐỘNG (PROMEDI)

- **Mã tài liệu**: PROMEDI-ARCH-FSM-2L
- **Phiên bản**: 1.0
- **Ngày tạo**: 2026-09-17
- **Phạm vi**: Kiến trúc điều phối luồng Kiosk (Session Orchestrator FSM & Device Adapter Layer)

---

## 1. WHAT — KIẾN TRÚC LÀ GÌ

Luồng khám được điều phối bởi 2 lớp tách biệt, nối nhau qua dữ liệu thay vì gọi cứng:

- **Lớp 1 — Session Orchestrator (FSM):** Quyết định _màn nào tiếp theo_ (`activation → idle → identification → serviceSelection → measurementQueue → summary`). Không biết gì về phần cứng cụ thể.
- **Lớp 2 — Device Adapter:** Quyết định _đo như thế nào_ trên từng thiết bị thật (BPBIO 750, InBody 270/380...). Không biết gì về flow màn hình.
- **Cầu nối — Registry + Config:** Orchestrator tra `deviceId` (đọc từ config) qua registry để lấy adapter tương ứng; config quyết định thiết bị nào bật và thứ tự chạy.

---

## 2. WHY — VÌ SAO CHỌN KIẾN TRÚC NÀY

- **Thêm thiết bị đo mới**: Viết 1 adapter + đăng ký vào registry + thêm 1 row config — **Không cần sửa FSM**.
- **Admin đổi thứ tự đo hoặc bật/tắt dịch vụ**: Quản trị viên điều chỉnh cấu hình từ xa (Remote Config) trên Cloud Admin Portal — **Không cần thao tác tại máy Kiosk, không cần build lại app**.
- **Tách rõ trách nhiệm**: Điều hướng màn hình (orchestrator) và logic phần cứng (adapter) không phụ thuộc lẫn nhau, dễ unit test độc lập.

---

## 3. WHO — THÀNH PHẦN / ACTOR LIÊN QUAN

| Thành phần               | Vai trò                                                                                            |
| :----------------------- | :------------------------------------------------------------------------------------------------- |
| **Khách hàng**           | Tương tác UI, phát sinh sự kiện cho FSM (chạm, xác nhận, bỏ qua...)                                |
| **Admin/Kỹ thuật viên**  | Cấu hình từ xa (Remote Config) qua Web Portal Admin Cloud: bật/tắt dịch vụ, sắp thứ tự các bước đo |
| **Session Orchestrator** | Máy trạng thái chính, điều hướng màn hình                                                          |
| **Device Adapter**       | Thực thi đo trên 1 thiết bị cụ thể (BPBIO 750, InBody 270/380, thiết bị tương lai)                 |
| **Registry**             | Bảng tra `deviceId → adapter`, điểm nối duy nhất giữa 2 lớp                                        |
| **Backend/DB**           | Lưu phiên khám, đồng bộ kết quả, xác thực kích hoạt, quản lý Remote Config                         |

---

## 4. WHERE — VỊ TRÍ TRONG CODEBASE

```
features/
  kiosk-session/        # FSM + điều phối màn hình
    kiosk-session.machine.ts
    kiosk-session.types.ts
  device-adapters/       # 1 thư mục con / thiết bị, cùng implement 1 interface chung
    device-adapter.types.ts
    device-adapter.registry.ts
    bpbio750/
    inbody270-380/
  admin-config/           # Quản lý & đồng bộ Remote Config từ Backend Server Cloud (lưu cache offline SQLite/MMKV)
```

---

## 5. HOW — HOẠT ĐỘNG NHƯ THẾ NÀO

1. **Flow trạng thái phân cấp (2-Level State Machine):**
   - **Tầng 1 — App Machine (`appMachine`):** Quản lý trạng thái vòng đời Kiosk: `initializing` $\rightarrow$ `refreshingToken` (`refreshTokenFlow` actor) / `deviceInactive` (kích hoạt thiết bị ở Màn 0) $\rightarrow$ `authenticated` (sẵn sàng vận hành Kiosk).
   - **Tầng 2 — Session Orchestrator (`healthSessionMachine`):** Điều phối phiên khám cá nhân: `idle` (Màn 1 - Video rảnh rỗi) $\rightarrow$ `identification` (Màn 2 - Định danh CCCD 12 số) $\rightarrow$ `serviceSelection` (Màn 3 - Chọn dịch vụ) $\rightarrow$ `measureBp` / `measureInBody` (Màn 4 & 5) $\rightarrow$ `summary` (Màn 6 - Tổng hợp & đếm ngược 60s) $\rightarrow$ reset về `idle`.
2. **Quản lý Token Kiosk Độc Lập (Pure Device Token Management):** Khi nhận `DEVICE_ACTIVATED`, `appMachine` lưu bộ đôi `accessToken` & `refreshToken` vào MMKV storage. Không dùng tài khoản đăng nhập cá nhân của nhân viên. Khi khởi động ứng dụng hoặc khôi phục mạng (`NETWORK_RESTORED`), `refreshTokenFlow` làm mới token tự động hoặc duy trì phiên làm việc ngoại tuyến.
3. **Dựng hàng đợi runtime:** Khi vào `measurementQueue`, hệ thống sử dụng Remote Config từ Backend Cloud (đã cache local SQLite/MMKV) được lọc theo `selectedServices` (dịch vụ khách chọn ở Màn 3) và sắp theo `order` — không hard-code thứ tự BP/InBody.
4. **Chạy từng bước:** Mỗi bước gọi adapter tương ứng qua registry; kết quả ghi vào `context.results` dạng map generic `{ stepId: result }`, không có field đặt tên riêng cho từng loại đo.
5. **Summary độc lập & Privacy Timeout:** Đọc `results` generic, không gắn cứng theo loại thiết bị. Chạm màn hình reset lại đếm 60s (self-transition); thoát khỏi `summary` sẽ xóa sạch `context` theo BR-PRIVACY-01.

---

## 6. RULE ↔ NƠI ENFORCE

| Rule                                               | Enforce ở đâu                                                          |
| :------------------------------------------------- | :--------------------------------------------------------------------- |
| **BR-ACT-01 (Kích hoạt thiết bị độc lập)**         | App State Machine (`appMachine`) chặn chuyển cảnh nếu `deviceInactive` |
| **BR-IDENT-01 (Định danh đúng chuẩn)**             | Validate ở UI trước khi bắn sự kiện vào FSM                            |
| **BR-FLOW-01 (Tối đa 3 bước, linh hoạt dịch vụ)**  | Hàng đợi dựng runtime từ config, không hard-code                       |
| **BR-VOICE-01/02 (Chính sách giọng nói)**          | Side-effect gắn theo từng state, tách khỏi logic chuyển trạng thái     |
| **BR-MED-01/02 (Công thức, ngưỡng cảnh báo y tế)** | Tầng tính toán riêng, ngoài phạm vi orchestrator                       |
| **BR-PRIVACY-01 (Đếm 60s, xóa dữ liệu)**           | Self-transition reset timer + exit action xóa context ở `summary`      |
