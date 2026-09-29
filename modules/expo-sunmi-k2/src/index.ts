import { EventEmitter, type EventSubscription } from 'expo-modules-core'
import type {
  NFCScanListener,
  PrintBitmapOptions,
  PrinterStatusListener,
  PrinterStatusResult,
  SunmiK2Events,
} from './SunmiK2.types'
import SunmiK2Module from './SunmiK2Module'

const emitter = new EventEmitter<SunmiK2Events>(SunmiK2Module as any)

/**
 * Đăng ký listener nhận sự kiện quét thẻ NFC từ Sunmi K2 (kênh tích hợp Sunmi SDK hoặc Android OS).
 */
export function addNFCScanListener(listener: NFCScanListener): EventSubscription {
  return emitter.addListener('onNFCScanned', listener)
}

/**
 * Đăng ký listener nhận sự kiện thay đổi trạng thái máy in tích hợp.
 */
export function addPrinterStatusListener(listener: PrinterStatusListener): EventSubscription {
  return emitter.addListener('onPrinterStatusChanged', listener)
}

/**
 * In hóa đơn / kết quả khám từ chuỗi ảnh Base64 (tự động căn giữa, phân ngưỡng nhị phân 128 và cắt giấy).
 */
export async function printReceiptAsync(base64Image: string): Promise<boolean> {
  return await SunmiK2Module.printReceiptAsync(base64Image)
}

/**
 * In ảnh Bitmap với tùy chọn nâng cao (căn lề, ngưỡng tương phản binarize, cắt giấy).
 */
export async function printBitmapWithOptionsAsync(
  base64Image: string,
  options: PrintBitmapOptions = {},
): Promise<boolean> {
  return await SunmiK2Module.printBitmapWithOptionsAsync(base64Image, options)
}

/**
 * Kiểm tra trạng thái kết nối & sẵn sàng của máy in nhiệt tích hợp K2.
 */
export async function getPrinterStatusAsync(): Promise<PrinterStatusResult> {
  return await SunmiK2Module.getPrinterStatusAsync()
}

/**
 * Đẩy giấy in ra thêm n dòng.
 */
export async function feedPaperAsync(lines: number = 3): Promise<boolean> {
  return await SunmiK2Module.feedPaperAsync(lines)
}

/**
 * Cắt giấy in (Auto cut).
 */
export async function cutPaperAsync(): Promise<boolean> {
  return await SunmiK2Module.cutPaperAsync()
}

/**
 * Kiểm tra thiết bị có hỗ trợ NFC và đang bật hay không.
 */
export function isNfcSupported(): boolean {
  return SunmiK2Module.isNfcSupported()
}

/**
 * Chuyển đổi module NFC theo số Serial Number.
 */
export function switchNfcModule(sn: string): void {
  SunmiK2Module.switchNfcModule(sn)
}

/**
 * Điều chỉnh độ trong suốt của watermark NFC (0 = trong suốt hoàn toàn, 255 = mờ đục).
 */
export function setWatermarkAlpha(alpha: number): void {
  SunmiK2Module.setWatermarkAlpha(alpha)
}

export * from './SunmiK2.types'
export { emitter, SunmiK2Module }
export default SunmiK2Module
