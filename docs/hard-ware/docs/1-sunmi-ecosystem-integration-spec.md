# SUNMI Ecosystem Integration & Hardware SDK Specification

## Proposed Seam

- **DeviceManagerAdapter Seam**: Interface trừu tượng hóa các lời gọi phần cứng (Printer, Scanner, EDC Payment, NFC) và IPC service của SUNMI OS, cho phép chạy unit/integration test với Mock Drivers mà không cần thiết bị vật lý.

## Problem Statement

Các nhà phát triển ứng dụng và đối tác tích hợp hệ thống gặp khó khăn khi kết nối và đồng bộ giữa các tầng thiết bị SUNMI (hardware drivers: máy in, máy quét, EDC thanh toán, NFC), hệ điều hành SUNMI OS và dịch vụ đám mây (Cloud OpenAPI, Max Program). Thiếu một khung đặc tả tích hợp tập trung dẫn đến việc triển khai giải pháp thương mại (Business 4.0) bị phân tán và thiếu tính đồng bộ.

## Solution

Xây dựng khung đặc tả phần mềm và SDK tích hợp chuẩn hóa cho hệ sinh thái SUNMI. Giải pháp cung cấp các lớp trừu tượng hóa phần cứng (HAL) phục vụ giao tiếp thiết bị ngoại vi, quản lý phân phối ứng dụng qua SUNMI App Store, và chuẩn hóa mô hình dữ liệu dựa trên thuật ngữ SUNMI Glossary.

## User Stories

1. As an Application Developer, I want standardized SDK interfaces for hardware peripherals (printer, scanner, NFC, EDC), so that I can process transactions across all SUNMI terminals.
2. As a SaaS Developer, I want to use SUNMI Max Program and H5 frameworks, so that I can build and deploy custom IoT commercial applications.
3. As a System Integrator, I want OpenAPI and WebSocket event connectivity, so that cloud services can sync store data and hardware states in real time.
4. As a Solutions Engineer, I want detailed hardware specifications and port standards, so that I can evaluate device compatibility during selection.
5. As a Platform Partner, I want private App Store management capabilities, so that I can distribute custom apps to bound devices without standard review delays.
6. As a Channel Partner, I want to configure targeted App Store catalogs, so that managed merchants only access approved software.
7. As an Operations Admin, I want standard SOPs and SUNMI OS bulletins, so that fleet updates and configurations remain compliant and stable.
8. As an Application Developer, I want hardware status callbacks and error handling, so that transaction flows handle paper-out or timeout gracefully.
9. As a Merchant, I want omni-channel Business 4.0 services, so that online and offline orders integrate smoothly.
10. As a Security Auditor, I want EDC payment processing isolated in compliant sandboxes, so that transaction data meets PCI-DSS standards.

## Implementation Decisions

- **Hardware Abstraction Layer (HAL)**: Định nghĩa các interface dịch vụ ngoại vi (Printer, Scanner, EDC, NFC) giao tiếp qua asynchronous IPC promises với SUNMI OS.
- **Event Pipeline**: Event emitter trung tâm để broadcast trạng thái thiết bị (hết giấy, đọc barcode, EDC phản hồi, pin) tới ứng dụng.
- **Domain Vocabulary**: Sử dụng chuẩn thuật ngữ trong SUNMI Glossary (BIoT, SUNMI OS, Business 4.0, Platform/Channel Partner, Developers).
- **Cloud OpenAPI Client**: Cung cấp REST/WebSocket client hỗ trợ đồng bộ dữ liệu, heartbeat thiết bị và Max Program APIs.
- **App Store Policy Parser**: Module xử lý phân quyền phân phối ứng dụng theo vai trò Partner.

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử dựa trên hành vi bên ngoài qua Seam, không kiểm thử private state của driver.
- **Modules Kiểm thử**: `DeviceManager`, `PrinterDriverAdapter`, `ScannerDriverAdapter`, `EdcPaymentAdapter`, `SunmiCloudApiClient`.
- **Seam Strategy**: Giả lập toàn bộ thao tác phần cứng thông qua `MockPrinterDriver`, `MockEdcDriver` tại lớp `DeviceManagerAdapter`.

## Out of Scope

- Tùy chỉnh kernel ROM hoặc flash firmware mức thấp cho SUNMI OS.
- Thiết kế/sửa đổi phần cứng vật lý và bo mạch (PCB).
- Logic quyết toán (settlement) của cổng thanh toán bên ngoài giao thức EDC standard.

## Further Notes

- Để đẩy spec lên hệ thống quản lý task (GitHub Issues/Jira), chạy lệnh `/setup-matt-pocock-skills` để cấu hình issue tracker và triage labels.
