# SUNMI JavaScript CommandApi ESC/POS & TSPL Passthrough Specification

## Proposed Seam

- **JsCommandApiDriver Seam (`IJsCommandApiDriver`)**: Seam nằm ở interface `sunmi.commandApi`. Interface này bao bọc hai phương thức truyền lệnh thô bằng JavaScript: `sendEscCommand(hexArray)` và `sendTsplCommand(tsplString)`. Seam cho phép mock việc gửi mảng hex byte hoặc chuỗi TSPL từ Web POS và kiểm thử kết quả trả về của Promise trong unit test mà không cần đầu in phần cứng.

## Problem Statement

Các ứng dụng Web POS legacy, hệ thống thương mại điện tử H5, và ứng dụng Web in tem nhãn kho bãi cần khả năng truyền trực tiếp các chuỗi lệnh thô chuẩn ESC/POS (in hóa đơn) hoặc chuẩn TSPL (in tem nhãn) từ môi trường JavaScript trên trình duyệt. Việc gửi lệnh ESC/POS yêu cầu chuyển đổi chuỗi ký tự sang mảng mảng số Hex (`stringToHexByteArray`), còn lệnh TSPL yêu cầu định dạng đúng các ký tự ngắt dòng `\r\n` và đảm bảo thiết bị đã được kích hoạt ở chế độ Label Mode.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CommandApi` thuộc SUNMI JavaScript SDK (`sunmi-js-sdk`). Tài liệu hướng dẫn phương thức chuyển đổi chuỗi ký tự sang mảng mảng Hex byte cho `sendEscCommand`, định dạng chuỗi mã lệnh TSPL đa dòng cho `sendTsplCommand`, và cung cấp mã nguồn mẫu JavaScript ES6 `async/await` hoàn chỉnh.

## User Stories

1. As a Legacy Web POS Migrator, I want to convert text and ESC codes to hex byte arrays using a utility function (`stringToHexByteArray`), so that `sendEscCommand()` transmits RAW ESC/POS bytes safely from JavaScript.
2. As a Web Warehouse Systems Developer, I want to send raw TSPL string templates using `sendTsplCommand()`, so that multi-line label layouts with barcodes and QR codes print directly from web apps.
3. As a Web Application Lead, I want all `commandApi` calls to return Promises, so that print status feedback is handled seamlessly via `.then()` or `await`.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `sunmi.commandApi` (Promise-based)

- `sendEscCommand(hexArray: string[])`: Gửi mảng các giá trị Hex byte đại diện cho tập lệnh `ESC/POS` (In hóa đơn).
- `sendTsplCommand(tsplString: string)`: Gửi chuỗi mã lệnh `TSPL` đa dòng phân cách bởi `\r\n` (In tem nhãn).

---

### 2. Hàm Tiện Ích Chuyển Đổi Chuỗi sang Mảng Hex Byte (`stringToHexByteArray`)

Để nạp mảng dữ liệu cho `sendEscCommand()`, lập trình viên cần chuyển đổi ký tự hoặc lệnh thô thành mảng Hex:

```javascript
/**
 * Chuyển đổi chuỗi văn bản hoặc lệnh ESC thành mảng Hex Byte format ['0x48', '0x65', '0x6c', ...]
 */
export function stringToHexByteArray(str) {
  return Array.from(str, (char) => '0x' + char.charCodeAt(0).toString(16).padStart(2, '0'))
}
```

---

### 3. Sample Code - Gửi Lệnh ESC/POS Bằng JavaScript (`sendEscCommand`)

```javascript
import SUNMI from 'sunmi-js-sdk'
import { stringToHexByteArray } from './utils'

export async function sendWebEscPosCommand(sunmiInstance, textContent) {
  if (!sunmiInstance) return

  try {
    // 1. Chuyển đổi văn bản cần in sang mảng Hex Byte
    const rawHexArray = stringToHexByteArray(textContent)

    // 2. Chuyển định dạng mảng sang Hex String Array
    const hexArray = Array.from(rawHexArray, (byte) => {
      return byte.toString(16).padStart(2, '0')
    })

    // 3. Gửi mảng Hex byte ESC/POS vào JavaScript CommandApi
    const result = await sunmiInstance.commandApi.sendEscCommand(hexArray)
    console.log('Kết quả gửi lệnh ESC/POS thành công:', result)
  } catch (error) {
    console.error('Lỗi khi gửi lệnh ESC/POS:', error)
  }
}
```

---

### 4. Sample Code - Gửi Lệnh TSPL In Tem Nhãn Bằng JavaScript (`sendTsplCommand`)

> [!IMPORTANT]
> **YÊU CẦU CHẾ ĐỘ LABEL MODE**: Với các dòng máy như SUNMI V2s, V2s PLUS, v.v., bắt buộc đảm bảo thiết bị đã được chuyển sang chế độ **Label Mode** trong Cài đặt hệ thống máy in trước khi nạp lệnh TSPL.

```javascript
export async function sendWebTsplLabelCommand(sunmiInstance) {
  if (!sunmiInstance) return

  try {
    // Cấu trúc chuỗi mã lệnh TSPL đa dòng với ký tự ngắt dòng \r\n
    const tsplTemplate =
      'SIZE 40 mm, 30 mm\r\n' +
      'GAP 3 mm, 0 mm\r\n' +
      'DIRECTION 1,0\r\n' +
      'REFERENCE 0,0\r\n' +
      'SET TEAR 1\r\n' +
      'CLS\r\n' +
      'TEXT 20,10,"TSS24.BF2",0,1,1,"DONG 1: TRA SUA"\r\n' +
      'TEXT 20,51,"TSS24.BF2",0,1,1,"DONG 2: SIZE L"\r\n' +
      'TEXT 20,92,"TSS24.BF2",0,1,1,"DONG 3: 70% DUONG"\r\n' +
      'QRCODE 40,140,L,4,A,0,"https://vietqr.api/pay"\r\n' +
      'PRINT 1,1\r\n'

    // Gửi chuỗi lệnh TSPL vào JavaScript CommandApi
    const result = await sunmiInstance.commandApi.sendTsplCommand(tsplTemplate)
    console.log('Kết quả gửi lệnh TSPL tem nhãn:', result)
  } catch (error) {
    console.error('Lỗi khi gửi lệnh TSPL:', error)
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử hàm `stringToHexByteArray` trả về mảng hex byte chuẩn xác.
- **Modules Kiểm thử**: `EscPosJsCommandSender`, `TsplJsLabelSender`.
- **Seam Strategy**: Giả lập `sunmi.commandApi` để mock kết quả Promise resolve của `sendEscCommand` và `sendTsplCommand` trong bài test Jest/Cypress cho Web App.

## Out of Scope

- Tự động thay đổi thiết lập "Label Mode" từ JavaScript mà không qua ứng dụng JS USDK nền.
- Biên dịch lại các cú pháp lệnh TSPL sai chuẩn ASCII.

## Further Notes

- **Tương thích máy in ngoại vi**: Máy in nhiệt tích hợp SUNMI hỗ trợ cả 2 tập lệnh ESC/POS và TSPL. Các dòng máy in ngoại vi kết nối hiện tại chỉ hỗ trợ tập lệnh ESC/POS.
