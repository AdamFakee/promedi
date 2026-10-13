# SUNMI JavaScript QueryApi Status & Printer Info Specification

## Proposed Seam

- **JsQueryApiDriver Seam (`IJsQueryApiDriver`)**: Seam nằm ở interface `sunmi.queryApi`. Interface này bao bọc hai phương thức Promise-based: `getStatus()` và `getInfo(PrinterInfo)`. Seam giúp mock dữ liệu trạng thái máy in (`Status.ERR_PAPER_OUT`, `Status.ERR_COVER`) và các thuộc tính thông số phần cứng (`PrinterInfo.DISTANCE`, `CUTTER`) trong unit test trên môi trường Web POS.

## Problem Statement

Các ứng dụng Web POS (React, Vue, Angular, Node) chạy trên thiết bị SUNMI cần kiểm tra trạng thái máy in trước khi người dùng thực hiện giao dịch thanh toán trên trình duyệt web. Nếu máy in đang hết giấy (`ERR_PAPER_OUT`), mở nắp (`ERR_COVER`), hoặc bị lỗi truyền thông (`COMM`), ứng dụng web cần hiển thị thông báo lỗi trên UI thay vì gửi lệnh in bị thất bại. Ngoài ra, việc đọc các thông số tuổi thọ máy in (`DISTANCE`, `CUTTER`) đòi hỏi hàm `getInfo()` hoạt động chính xác qua JS Promise.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `QueryApi` thuộc SUNMI JavaScript SDK (`sunmi-js-sdk`). Tài liệu quy định các giá trị trả về của `getStatus()` (Phân biệt nhóm lỗi `ERR_*` và cảnh báo `WARN_*`), định nghĩa các trường thuộc tính `PrinterInfo` (ID, NAME, VERSION, DISTANCE, CUTTER, DENSITY, TYPE, PAPER), và cung cấp mã nguồn mẫu JavaScript ES6 `async/await` hoàn chỉnh.

## User Stories

1. As a Web POS Checkout Service, I want to call `await sunmi.queryApi.getStatus()` before printing, so that UI banners warn cashiers if paper is out or cover is open.
2. As a Web Fleet Manager, I want to query printer distance and cutter usage using `getInfo(PrinterInfo.DISTANCE)` and `getInfo(PrinterInfo.CUTTER)`, so that maintenance status is displayed in web dashboards.
3. As an Application Lead, I want status checks to resolve asynchronously via JS Promises, so that web UI responsiveness is never blocked by hardware queries.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `sunmi.queryApi` (Promise-based)

- `getStatus(): () => Promise<Status>`: Truy vấn trạng thái phần cứng máy in theo thời gian thực.
- `getInfo(info: PrinterInfo): (info: PrinterInfo) => Promise<string>`: Tra cứu thông số thông tin phần cứng máy in.

---

### 2. Bảng Trạng Thái Máy In Trong JavaScript (`Status`)

#### a. Nhóm Lỗi Phần Cứng Ngăn Cản Việc In (`ERR_*`)

- `Status.READY`: Máy in sẵn sàng hoạt động bình thường.
- `Status.OFFLINE`: Máy in ngoại tuyến / Hỏng hóc.
- `Status.COMM`: Lỗi giao tiếp truyền thông.
- `Status.ERR_PAPER_OUT`: Máy in hết giấy.
- `Status.ERR_PAPER_JAM`: Kẹt giấy trong khay máy in.
- `Status.ERR_PAPER_MISMATCH`: Sai loại giấy in.
- `Status.ERR_PRINTER_HOT`: Đầu in nhiệt quá nhiệt.
- `Status.ERR_MOTOR_HOT`: Mô-tơ máy in quá nhiệt.
- `Status.ERR_COVER`: Nắp khay giấy đang mở.
- `Status.ERR_COVER_INCOMPLETE`: Nắp khay giấy chưa đóng kín.
- `Status.ERR_CUTTER`: Dao cắt tự động bị kẹt/lỗi.

#### b. Nhóm Cảnh Báo Không Chặn Việc In (`WARN_*`)

- `Status.WARN_THERMAL_PAPER`: Giấy in nhiệt sắp hết.
- `Status.WARN_PICK_PAPER`: Tem nhãn in xong chưa được bóc khỏi cảm biến.

---

### 3. Bảng Thuộc Tính Thông Số Máy In (`PrinterInfo`)

| Thuộc tính `PrinterInfo` | Ý Nghĩa Thông Số Tra Cứu    | Giá trị Trả về                                                    |
| :----------------------- | :-------------------------- | :---------------------------------------------------------------- |
| `PrinterInfo.ID`         | Mã ID phần cứng máy in      | Chuỗi ID phần cứng                                                |
| `PrinterInfo.NAME`       | Tên của máy in              | Chuỗi tên máy in mặc định / custom                                |
| `PrinterInfo.VERSION`    | Số phiên bản Firmware       | Chuỗi phiên bản Firmware                                          |
| `PrinterInfo.DISTANCE`   | Tổng độ dài giấy đã in      | Đơn vị `mm`                                                       |
| `PrinterInfo.CUTTER`     | Số lần dao cắt đã thực hiện | Đếm số lần cắt                                                    |
| `PrinterInfo.HOT`        | Số lần quá nhiệt recorded   | Đếm số lần                                                        |
| `PrinterInfo.DENSITY`    | Mức độ đậm hiện tại         | Khoảng `70%` đến `130%`                                           |
| `PrinterInfo.TYPE`       | Loại chế độ máy in          | `"thermal printer"`, `"black mark printer"`, `"label printer"`... |
| `PrinterInfo.PAPER`      | Khổ giấy hỗ trợ hiện tại    | `"58mm"` hoặc `"80mm"`                                            |

---

### 4. Sample Code - Truy vấn Trạng thái & Thông số Máy In Trong JavaScript ES6

```javascript
import SUNMI, { PrinterInfo, Status } from 'sunmi-js-sdk'

export class WebPrinterStatusMonitor {
  constructor(sunmiInstance) {
    this.sunmi = sunmiInstance
  }

  /**
   * Kiểm tra trạng thái máy in trước khi thanh toán trên Web POS
   */
  async verifyPrinterReady() {
    if (!this.sunmi) return { ready: false, message: 'SDK chưa kết nối' }

    try {
      // 1. Lấy trạng thái thời gian thực qua Promise
      const status = await this.sunmi.queryApi.getStatus()
      console.log('Trạng thái máy in Web:', status)

      if (status === Status.READY) {
        return { ready: true, message: 'Máy in sẵn sàng' }
      } else if (status === Status.ERR_PAPER_OUT) {
        return { ready: false, message: 'Cảnh báo: Máy in bị hết giấy!' }
      } else if (status === Status.ERR_COVER) {
        return { ready: false, message: 'Cảnh báo: Nắp khay giấy đang mở!' }
      } else {
        return { ready: false, message: `Máy in gặp sự cố: ${status}` }
      }
    } catch (error) {
      console.error('Lỗi khi đọc trạng thái máy in:', error)
      return { ready: false, message: error.message || 'Lỗi giao tiếp' }
    }
  }

  /**
   * Đọc thông số metadata tuổi thọ máy in
   */
  async getPrinterMetadata() {
    if (!this.sunmi) return null

    try {
      const distance = await this.sunmi.queryApi.getInfo(PrinterInfo.DISTANCE)
      const cuts = await this.sunmi.queryApi.getInfo(PrinterInfo.CUTTER)
      const paper = await this.sunmi.queryApi.getInfo(PrinterInfo.PAPER)
      const type = await this.sunmi.queryApi.getInfo(PrinterInfo.TYPE)

      return {
        printedDistanceMm: distance,
        cutterCount: cuts,
        paperSize: paper,
        printerType: type,
      }
    } catch (error) {
      console.error('Lỗi khi đọc thông số máy in:', error)
      return null
    }
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `getStatus()` và `getInfo()` trả về Promise resolve chứa đúng chuỗi trạng thái hoặc thuộc tính.
- **Modules Kiểm thử**: `WebPrinterStatusMonitor`, `PrinterInfoJsParser`.
- **Seam Strategy**: Giả lập `sunmi.queryApi` để mock kết quả `getStatus() = Status.READY` hoặc `Status.ERR_PAPER_OUT` trong bài test Jest/Cypress cho Web App.

## Out of Scope

- Đăng ký Android Broadcast Receivers trực tiếp từ mã nguồn JavaScript thuần (Quy trình này cần ứng dụng nền JS USDK hỗ trợ hoặc thông qua Native Android Bridge).
- Thay đổi thông số `DENSITY` hay `TYPE` thông qua các hàm tra cứu `queryApi`.

## Further Notes

- **Lưu ý tần suất gọi**: Mặc dù chạy bất đồng bộ qua JS Promise, việc gọi `getStatus()` liên tục với tần suất cao (polling) vẫn tốn tài nguyên phần cứng I/O. Chỉ nên gọi trước mỗi lần bấm in hoặc khi mở màn hình thanh toán.
