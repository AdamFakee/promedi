# SUNMI JavaScript LineApi Thermal Receipt Printing Specification

## Proposed Seam

- **JsLineApiDriver Seam (`IJsLineApiDriver`)**: Seam nằm ở interface `sunmi.lineApi`. Interface này bao bọc 11 phương thức Promise-based dùng để in hóa đơn bán hàng nhiệt từ giao diện Web H5/React/Vue (`initLine`, `addText`, `printText`, `printTexts`, `printBarCode`, `printQrCode`, `printBitmap`, `printDividingLine`, `autoOut`, `enableTransMode`, `printTrans`). Seam hỗ trợ mock việc trả về Promise và kiểm thử các chuỗi logic in ấn Web POS trong unit test.

## Problem Statement

Các ứng dụng Web POS thương mại (Node, React, Vue, HTML5) chạy trên thiết bị SUNMI cần gửi dữ liệu in hóa đơn theo từng dòng trực tiếp từ JavaScript. Do đặc thù môi trường Web, tất cả các phương thức của `lineApi` đều trả về `Promise`. Việc xử lý không đúng chuỗi bất đồng bộ (Promise Chaining hoặc `async/await`), truyền sai ảnh Base64 cho `printBitmap`, hoặc quên tắt chế độ Transaction Mode (`enableTransMode(false)`) khi gặp ngoại lệ sẽ khiến máy in bị đè lệnh hoặc không phản hồi.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `LineApi` thuộc SUNMI JavaScript SDK (`sunmi-js-sdk`). Tài liệu chuẩn hóa 11 hàm Promise-based, hướng dẫn định dạng ảnh Base64, in bảng phân cột (`printTexts`), in hai màu đỏ/đen (`RenderColor.RED`), và cung cấp mã nguồn mẫu JavaScript ES6 `async/await` an toàn cho chế độ Transaction Mode.

## User Stories

1. As a React/Vue Web Developer, I want all `lineApi` calls to return Promises, so that I can use `async/await` syntax to write readable, sequential print flows.
2. As a Web POS Engineer, I want to print Base64 encoded logo images using `printBitmap(base64String, style)`, so that images loaded via Web APIs can be rendered on thermal receipts.
3. As a Financial Systems Lead, I want a bulletproof Transaction Mode wrapper function, so that `enableTransMode(false)` is guaranteed to execute in a `finally` block if a network error occurs during web checkout.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `sunmi.lineApi` (Promise-based)

| Phương thức JS API  | Tham số nạp vào                                            | Giá trị Trả về | Mô tả Chức năng                                       |
| :------------------ | :--------------------------------------------------------- | :------------- | :---------------------------------------------------- |
| `initLine`          | `(baseStyle: BaseStyle)`                                   | `Promise<res>` | Khởi tạo kiểu dòng cơ bản (Căn lề, lề trái, màu sắc). |
| `addText`           | `(text: string, style: TextStyle)`                         | `Promise<res>` | Nạp văn bản vào bộ đệm dòng (Chưa in trực tiếp).      |
| `printText`         | `(text: string, style: TextStyle)`                         | `Promise<res>` | Thực thi in trực tiếp dòng văn bản ra máy in.         |
| `printTexts`        | `(texts: string[], widths: number[], styles: TextStyle[])` | `Promise<res>` | In văn bản chia theo nhiều cột tỷ lệ cố định (Bảng).  |
| `printBarCode`      | `(code: string, style: BarcodeStyle)`                      | `Promise<res>` | In mã vạch Barcode (Code128, EAN13...).               |
| `printQrCode`       | `(code: string, style: QrStyle)`                           | `Promise<res>` | In mã vuông QR Code.                                  |
| `printBitmap`       | `(base64Image: string, style: BitmapStyle)`                | `Promise<res>` | In hình ảnh nạp từ chuỗi nén Base64.                  |
| `printDividingLine` | `(style: DividingLine, offset: number)`                    | `Promise<res>` | In đường kẻ phân cách (EMPTY, SOLID, DOTTED).         |
| `autoOut`           | `()`                                                       | `Promise<res>` | Tự động đẩy giấy ra cổng xé/cắt giấy.                 |
| `enableTransMode`   | `(enable: boolean)`                                        | `Promise<res>` | Bật/Tắt chế độ Transaction Mode lưu đệm lệnh ngầm.    |
| `printTrans`        | `()`                                                       | `Promise<res>` | Gửi toàn bộ bộ đệm Transaction Mode để in siêu tốc.   |

---

### 2. Sample Code - In Văn Bản & Bảng Hàng hóa Bằng `async/await` Trong JavaScript

```javascript
import SUNMI, { BaseStyle, TextStyle, Align } from 'sunmi-js-sdk'

export async function printReceiptWebFlow(sunmiInstance) {
  if (!sunmiInstance) return

  try {
    // 1. Khởi tạo dòng in căn giữa
    await sunmiInstance.lineApi.initLine(BaseStyle.getStyle().setAlign(Align.CENTER))

    // 2. In Tiêu đề Cửa hàng
    const titleStyle = TextStyle.getStyle().setTextSize(32).setEnableBold(true)
    await sunmiInstance.lineApi.printText('CỬA HÀNG WEB POS\n', titleStyle)

    // 3. Ghép nhiều kiểu chữ trên 1 dòng bằng addText
    const normalStyle = TextStyle.getStyle().setTextSize(24)
    const boldStyle = TextStyle.getStyle().setTextSize(24).setEnableBold(true)

    await sunmiInstance.lineApi.addText('Số HĐ: ', normalStyle)
    await sunmiInstance.lineApi.addText('#INV-8899 ', boldStyle)
    await sunmiInstance.lineApi.printText('(Đã TT)\n', normalStyle)

    // 4. In bảng danh sách món ăn phân cột 2:1:1
    const leftAlign = TextStyle.getStyle().setAlign(Align.LEFT)
    const centerAlign = TextStyle.getStyle().setAlign(Align.CENTER)
    const rightAlign = TextStyle.getStyle().setAlign(Align.RIGHT)

    await sunmiInstance.lineApi.printTexts(
      ['Tên Món', 'SL', 'Thành Tiền'],
      [2, 1, 1],
      [leftAlign, centerAlign, rightAlign],
    )

    await sunmiInstance.lineApi.printTexts(
      ['Cà Phê Muối', '2', '60.000'],
      [2, 1, 1],
      [leftAlign, centerAlign, rightAlign],
    )

    // 5. Đẩy giấy và hoàn tất
    await sunmiInstance.lineApi.autoOut()
  } catch (error) {
    console.error('Lỗi khi in hóa đơn Web POS:', error)
  }
}
```

---

### 3. Sample Code - In Ảnh Logo Base64 & Mã QR VietQR

```javascript
import { BitmapStyle, QrStyle, ImageAlgorithm, ErrorLevel, Align } from 'sunmi-js-sdk'

export async function printWebLogoAndQR(sunmiInstance, base64ImageString, qrUrl) {
  if (!sunmiInstance) return

  try {
    // 1. In ảnh Logo từ chuỗi mã hóa Base64
    const bitmapStyle = BitmapStyle.getStyle()
      .setAlgorithm(ImageAlgorithm.BINARIZATION)
      .setValue(200)
      .setAlign(Align.CENTER)

    await sunmiInstance.lineApi.printBitmap(base64ImageString, bitmapStyle)

    // 2. In Mã QR Code thanh toán
    const qrStyle = QrStyle.getStyle().setDot(8).setErrorLevel(ErrorLevel.M).setAlign(Align.CENTER)

    await sunmiInstance.lineApi.printQrCode(qrUrl, qrStyle)
    await sunmiInstance.lineApi.autoOut()
  } catch (error) {
    console.error('Lỗi khi in Logo/QR Code:', error)
  }
}
```

---

### 4. Sample Code - Chế Độ Transaction Mode Bất Đồng Bộ An Toàn (`Safe Transaction Wrapper`)

> [!WARNING]
> **CẢNH BÁO QUAN TRỌNG**: Nếu bật `enableTransMode(true)` mà ứng dụng bị lỗi dừng đột ngột hoặc không gọi `printTrans()`, máy in sẽ ngưng hoạt động ở các lần in sau. **Bắt buộc** gọi `enableTransMode(false)` trong khối `finally`.

```javascript
export async function safeBatchPrintTransaction(sunmiInstance) {
  if (!sunmiInstance) return

  try {
    // 1. Bật Transaction Mode
    await sunmiInstance.lineApi.enableTransMode(true)

    // 2. Nạp đệm chuỗi lệnh in
    await sunmiInstance.lineApi.addText('HÓA ĐƠN IN BATCH ĐỆM\n', TextStyle.getStyle())
    await sunmiInstance.lineApi.addText('Món A x1\n', TextStyle.getStyle())
    await sunmiInstance.lineApi.printText('Món B x2\n', TextStyle.getStyle())
    await sunmiInstance.lineApi.autoOut()

    // 3. Thực thi gửi toàn bộ đệm dữ liệu 1 lần
    const printResult = await sunmiInstance.lineApi.printTrans()
    console.log('Kết quả Transaction Print:', printResult)
  } catch (error) {
    console.error('Xảy ra lỗi trong Transaction Mode:', error)
  } finally {
    // 4. BẮT BUỘC: Luôn giải phóng tắt Transaction Mode trong khối finally
    await sunmiInstance.lineApi.enableTransMode(false)
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi các hàm `lineApi` luôn trả về một JS Promise hợp lệ có thể `.then()` hoặc `await`.
- **Modules Kiểm thử**: `WebPrinterService`, `ReceiptJsFormatter`, `SafeTransactionWrapper`.
- **Seam Strategy**: Giả lập `sunmi.lineApi` để mock kết quả Promise resolve trong các bài test tự động cho Web App.

## Out of Scope

- Tự động mã hóa ảnh từ thẻ `<img>` HTML sang chuỗi Base64 mà không qua Canvas/FileReader API.
- In hai màu đỏ/đen (`RenderColor.RED`) trên máy in nhiệt đơn sắc thông thường.

## Further Notes

- **Lưu ý in hai màu**: Thuộc tính `RenderColor.RED` chỉ hoạt động trên các dòng máy SUNMI hỗ trợ in hai màu kèm giấy in nhiệt chuyên dụng 2 màu tương thích.
