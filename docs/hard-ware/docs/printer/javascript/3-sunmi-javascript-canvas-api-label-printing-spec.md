# SUNMI JavaScript CanvasApi Label Printing Specification

## Proposed Seam

- **JsCanvasApiDriver Seam (`IJsCanvasApiDriver`)**: Seam nằm ở interface `sunmi.canvasApi`. Interface này bao bọc 7 phương thức Promise-based dùng để thiết kế và in tem nhãn theo tọa độ Canvas 2D từ giao diện Web (`initCanvas`, `renderText`, `renderBarCode`, `renderQrCode`, `renderBitmap`, `renderArea`, `printCanvas`). Seam cho phép mock dữ liệu hình vẽ 2D và kiểm thử việc xuất các bản in tem nhãn trong unit test trên môi trường Web POS.

## Problem Statement

Các ứng dụng Web POS, ứng dụng trà sữa/cà phê H5, và ứng dụng quản lý tem nhãn kho bãi viết bằng JavaScript (React, Vue, Angular) cần in tem nhãn sản phẩm với bố cục tự do theo tọa độ X/Y 2D. Nếu không gọi `initCanvas` với chiều rộng/chiều cao hợp lệ trước khi nạp phần tử, hoặc quên thiết lập máy in sang chế độ Label Printer / Black Mark Printer trong Cài đặt hệ thống, các lệnh in tem nhãn trên JavaScript SDK sẽ bị trượt vị trí hoặc không in ra giấy.

## Solution

Cung cấp đặc tả kỹ thuật chi tiết cho `CanvasApi` thuộc SUNMI JavaScript SDK (`sunmi-js-sdk`). Tài liệu chuẩn hóa 7 hàm Promise-based, hướng dẫn tọa độ vẽ tuyệt đối X/Y cho Text, Barcode, QR Code, ảnh Base64, định hình đồ họa 2D `AreaStyle` (`BOX`, `CIRCLE`, `RECT_FILL`, `PATH`), và cung cấp mã nguồn mẫu JavaScript ES6 `async/await` thiết kế tem nhãn sản phẩm hoàn chỉnh.sdk

## User Stories

1. As a Web Beverage POS Developer, I want to initialize a 330x330px canvas using `initCanvas()`, so that dynamic cup labels with customer names, sugar/ice ratios, and barcodes render pixel-perfectly from web browsers.
2. As a Warehouse Systems Engineer, I want to print multiple label copies (`printCanvas(count)`), so that shipment box labels are duplicated easily with a single function call.
3. As a UI Web Developer, I want to draw hollow boxes (`Shape.BOX`) and lines (`Shape.PATH`) via `renderArea()`, so that structured product label templates look professional.

## Implementation Decisions

### 1. Chi tiết Danh mục API thuộc `sunmi.canvasApi` (Promise-based)

| Phương thức JS API | Tham số nạp vào                             | Giá trị Trả về | Mô tả Chức năng                                                                |
| :----------------- | :------------------------------------------ | :------------- | :----------------------------------------------------------------------------- |
| `initCanvas`       | `(baseStyle: BaseStyle)`                    | `Promise<res>` | Khởi tạo kích thước Canvas 2D (`setWidth`, `setHeight`, `setPosX`, `setPosY`). |
| `renderText`       | `(text: string, style: TextStyle)`          | `Promise<res>` | Vẽ văn bản tại tọa độ X/Y (`setPosX`, `setPosY`, `setRotate`, `enableBold`).   |
| `renderBarCode`    | `(code: string, style: BarcodeStyle)`       | `Promise<res>` | Vẽ mã vạch Barcode tại tọa độ X/Y (`setSymbology`, `setBarHeight`).            |
| `renderQrCode`     | `(text: string, style: QrStyle)`            | `Promise<res>` | Vẽ mã vuông QR Code tại tọa độ X/Y (`setDot`, `setErrorLevel`).                |
| `renderBitmap`     | `(base64Image: string, style: BitmapStyle)` | `Promise<res>` | Vẽ hình ảnh từ chuỗi Base64 tại tọa độ X/Y (`setAlgorithm`).                   |
| `renderArea`       | `(format: AreaStyle)`                       | `Promise<res>` | Vẽ hình học đặc biệt (`BOX`, `RECT_FILL`, `CIRCLE`, `PATH`).                   |
| `printCanvas`      | `(count: number)`                           | `Promise<res>` | Thực thi in Canvas với số lượng tem `count` (> 0).                             |

---

### 2. Sample Code - Thiết Kế & In Tem Nhãn Sản Phẩm Bằng JavaScript ES6

```javascript
import SUNMI, {
  BaseStyle,
  AreaStyle,
  TextStyle,
  QrStyle,
  BarcodeStyle,
  Shape,
  Align,
  ErrorLevel,
  Rotate,
} from 'sunmi-js-sdk'

export async function printWebBeverageLabel(sunmiInstance) {
  if (!sunmiInstance) return

  try {
    // 1. BẮT BUỘC: Khởi tạo kích thước Canvas (330px x 330px)
    await sunmiInstance.canvasApi.initCanvas(BaseStyle.getStyle().setWidth(330).setHeight(330))

    // 2. Vẽ Khung Viền Bao Quanh Tem (Hollow Rectangle BOX)
    await sunmiInstance.canvasApi.renderArea(
      AreaStyle.getStyle()
        .setStyle(Shape.BOX)
        .setPosX(0)
        .setPosY(0)
        .setWidth(330)
        .setHeight(330)
        .setThick(2),
    )

    // 3. Vẽ Tiêu đề Tem (Căn giữa X=165, Y=10)
    await sunmiInstance.canvasApi.renderText(
      'TRÀ SỮA KOI THÉ',
      TextStyle.getStyle()
        .setPosX(165)
        .setPosY(10)
        .setTextSize(24)
        .setAlign(Align.CENTER)
        .enableBold(true),
    )

    // 4. Vẽ Mã QR Thanh toán ở góc trái (X=10, Y=45, Size=110)
    await sunmiInstance.canvasApi.renderQrCode(
      '123456789',
      QrStyle.getStyle()
        .setPosX(10)
        .setPosY(45)
        .setWidth(110)
        .setHeight(110)
        .setErrorLevel(ErrorLevel.M),
    )

    // 5. Vẽ Văn bản Chi tiết bên phải Mã QR (X=130, Y=45)
    await sunmiInstance.canvasApi.renderText(
      'Món: Lục Trà Sữa\nSize: L | 70% Đường\nTopping: Trân Châu Hoàng Kim',
      TextStyle.getStyle().setPosX(130).setPosY(45).setWidth(190).setHeight(110).setTextSize(18),
    )

    // 6. Vẽ Mã vạch Barcode bên dưới (X=15, Y=180, Width=300, Height=120)
    await sunmiInstance.canvasApi.renderBarCode(
      '893456789',
      BarcodeStyle.getStyle()
        .setPosX(15)
        .setPosY(180)
        .setWidth(300)
        .setHeight(120)
        .setRotate(Rotate.ROTATE_0),
    )

    // 7. Thực thi in 2 bản tem
    const result = await sunmiInstance.canvasApi.printCanvas(2)
    console.log('Kết quả in tem nhãn Web:', result)
  } catch (error) {
    console.error('Lỗi khi vẽ/in tem nhãn Web:', error)
  }
}
```

---

### 3. Sample Code - In Tem Nhãn Trắng (Blank Label) Bằng JavaScript

```javascript
export async function printWebBlankLabel(sunmiInstance) {
  if (!sunmiInstance) return

  try {
    // 1. Khởi tạo kích thước Canvas 330px x 330px
    await sunmiInstance.canvasApi.initCanvas(BaseStyle.getStyle().setWidth(330).setHeight(330))

    // 2. Thực thi in 1 tem nhãn rỗng
    await sunmiInstance.canvasApi.printCanvas(1)
  } catch (error) {
    console.error('Lỗi in tem trắng:', error)
  }
}
```

## Testing Decisions

- **Tiêu chuẩn Test**: Kiểm thử việc gọi `printCanvas(count)` với `count > 0` trả về Promise resolve hợp lệ.
- **Modules Kiểm thử**: `BeverageLabelJsBuilder`, `BlankLabelJsPrinter`.
- **Seam Strategy**: Giả lập `sunmi.canvasApi` để mock kết quả `printCanvas` trong bài test tự động cho Web App.

## Out of Scope

- Tự động thay đổi thiết lập "Label Printer" trong Cài đặt hệ thống thiết bị từ xa qua JS SDK (Phải thao tác trước trên thiết bị hoặc qua Intent Native).
- Vẽ hình khối 3D phức tạp ngoài các định dạng 2D `Shape` cơ bản.

## Further Notes

- **Phông chữ mặc định trong JS**: SUNMI JS-SDK sử dụng phông chữ dạng Vector mặc định cho các thành phần `renderText()` và hiện tại không hỗ trợ nạp phông chữ custom từ assets trong môi trường Web browser.
