# SUNMI JavaScript SDK (sunmi-js-sdk) Integration & Architecture Specification

## Proposed Seam

- **SunmiJsSdk Seam (`ISunmiJsService`)**: Seam nằm ở phần khởi tạo bất đồng bộ `sunmi.launchPrinterService()`. Seam này bao bọc toàn bộ các lời gọi API in ấn bằng JavaScript (React, Vue, Angular, H5 Web Apps) đến app nền "JS USDK" trên thiết bị SUNMI, cho phép mock trạng thái dịch vụ và kiểm thử kết quả in ấn trong unit test / web integration test mà không cần phần cứng thật.

## Problem Statement

Các ứng dụng web H5, ứng dụng Hybrid (Cordova, Capacitor, Electron, React Native), và Web POS chạy trên trình duyệt web thiết bị SUNMI cần gọi máy in nhiệt built-in mà không muốn viết các Native Java Bridge / Cordova Plugin phức tạp. Nếu không cài đặt ứng dụng nền "JS USDK" từ SUNMI App Store hoặc không khởi tạo dịch vụ bất đồng bộ `launchPrinterService()` đúng cách, các lời gọi JS SDK sẽ bị thất bại âm thầm hoặc báo lỗi kết nối.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `SUNMI JavaScript SDK` (`sunmi-js-sdk`). Tài liệu hướng dẫn bước chuẩn bị môi trường (Cài ứng dụng "JS USDK"), cách cài đặt SDK qua `npm` hoặc nhúng thẻ `<script>` UMD, quy trình khởi tạo dịch vụ `launchPrinterService()`, tổng quan 4 bộ Sub-API (`QueryApi`, `CommandApi`, `LineApi`, `CanvasApi`), và mã nguồn mẫu JavaScript ES6 & HTML UMD hoàn chỉnh.

## User Stories

1. As a Web POS Developer, I want to install `sunmi-js-sdk` via npm or link UMD script, so that my React/Vue single-page web app can trigger receipt prints directly from web pages.
2. As a Web Application Architect, I want to initialize the printer service asynchronously using `launchPrinterService().then(...)`, so that print operations are ready before users click checkout.
3. As a Hybrid Mobile Developer, I want a unified JavaScript interface (`LineApi` & `CanvasApi`), so that receipt and label rendering logic is identical between native and web builds.

## Implementation Decisions

### 1. Chuẩn Bị Môi Trường Trái Đất (Prerequisites)

- **Bước 1**: Mở **SUNMI App Store** trên màn hình thiết bị SUNMI.
- **Bước 2**: Tìm kiếm ứng dụng tên **`JS USDK`** và tiến hành **Cài đặt (Install)**. Ứng dụng này đóng vai trò làm WebSocket/AIDL Bridge kết nối giữa môi trường JavaScript Web Browser và Service In phần cứng thiết bị.

---

### 2. Tích hợp SDK qua npm hoặc UMD Link

#### Cách 1: Cài đặt qua `npm` (Dành cho React / Vue / Angular / Node)

```bash
npm install sunmi-js-sdk --save
```

#### Cách 2: Nhúng trực tiếp UMD trong HTML (`bundle.umd.js`)

```html
<script src="https://sunmi-static.oss-cn-hangzhou.aliyuncs.com/h5/printer-sdk/dist/bundle.umd.js"></script>
```

---

### 3. Danh sách Sub-APIs Khả Dụng Trong JavaScript SDK

| Tên Sub-API    | Tương thích Java SDK   | Mô tả Chức năng trong JavaScript                      |
| :------------- | :--------------------- | :---------------------------------------------------- |
| **QueryApi**   | `printer.queryApi()`   | Tra cứu trạng thái sẵn sàng và thông tin máy in       |
| **CommandApi** | `printer.commandApi()` | Gửi mảng lệnh thô ESC/POS hoặc TSPL dạng Byte/Array   |
| **LineApi**    | `printer.lineApi()`    | In hóa đơn bán hàng theo từng dòng (Thermal Receipts) |
| **CanvasApi**  | `printer.canvasApi()`  | Vẽ và in tem nhãn theo tọa độ Canvas 2D (Labels)      |

---

### 4. Sample Code - Khởi tạo Dịch vụ In & In Hóa đơn bằng JavaScript (ES6 & UMD)

#### 4.1 Khởi tạo dịch vụ trong ES6 / React / Vue:

```javascript
import SUNMI from 'sunmi-js-sdk'

class WebPrinterService {
  constructor() {
    this.sunmi = new SUNMI()
    this.isReady = false
  }

  async initPrinter() {
    try {
      // Khởi tạo kết nối bất đồng bộ tới ứng dụng nền JS USDK
      const res = await this.sunmi.launchPrinterService()
      this.sunmi.init()
      this.isReady = true
      console.log('SUNMI JS-SDK Printer Service Initialized Successfully!')
    } catch (error) {
      console.error('Failed to launch SUNMI JS Printer Service:', error)
    }
  }

  printTestReceipt() {
    if (!this.isReady) {
      alert('Printer service not ready yet!')
      return
    }

    // Sử dụng LineApi để in văn bản
    this.sunmi.lineApi.initLine()
    this.sunmi.lineApi.printText('CỬA HÀNG WEB POS DEMO\n')
    this.sunmi.lineApi.printText('Hóa đơn bán hàng: #1001\n')
    this.sunmi.lineApi.autoOut()
  }
}

export default new WebPrinterService()
```

#### 4.2 Khởi tạo dịch vụ trong môi trường HTML UMD Thuần:

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <title>SUNMI JS-SDK UMD Demo</title>
    <!-- Nhúng file UMD JS-SDK -->
    <script src="https://sunmi-static.oss-cn-hangzhou.aliyuncs.com/h5/printer-sdk/dist/bundle.umd.js"></script>
  </head>
  <body>
    <h1>Trang In Web POS SUNMI</h1>
    <button id="btnPrint" onclick="handlePrint()">In Hóa Đơn Web</button>

    <script>
      let umd_sunmi = null

      // Tự động khởi tạo khi trang nạp xong
      window.addEventListener('DOMContentLoaded', () => {
        umd_sunmi = new SUNMI()
        umd_sunmi
          .launchPrinterService()
          .then((res) => {
            umd_sunmi.init()
            console.log('JS USDK Bridge Ready')
          })
          .catch((err) => {
            console.error('Lỗi kết nối JS USDK:', err)
          })
      })

      function handlePrint() {
        if (!umd_sunmi) return

        // In tiêu đề hóa đơn căn giữa
        umd_sunmi.lineApi.printText('CẢM ƠN QUÝ KHÁCH!\n')
        umd_sunmi.lineApi.autoOut()
      }
    </script>
  </body>
</html>
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử luồng `launchPrinterService().then()` xử lý đúng promise resolve/reject trong trình duyệt web.
- **Modules Kiểm thử**: `WebPrinterService`, `JsSdkIntegrationTester`.
- **Seam Strategy**: Giả lập đối tượng `SUNMI` để mock kết quả `launchPrinterService()` trong các bài test Jest/Cypress cho Web App.

## Out of Scope

- Tự động cài đặt ứng dụng "JS USDK" từ xa mà không thông qua thao tác của người dùng trên SUNMI App Store.
- Gọi các tính năng phần cứng ngoài máy in (như thanh toán NFC hay quét mã vạch qua JS SDK này).

## Further Notes

- **Demo tham khảo chính thức**: https://h5.sunmi.com/printer-sdk/demo.html
