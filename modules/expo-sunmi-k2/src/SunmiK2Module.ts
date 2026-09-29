import { requireNativeModule } from 'expo-modules-core'
import type { PrintBitmapOptions, PrinterStatusResult } from './SunmiK2.types'

declare class SunmiK2NativeType {
  isNfcSupported(): boolean
  switchNfcModule(sn: string): void
  setWatermarkAlpha(alpha: number): void
  printReceiptAsync(base64Image: string): Promise<boolean>
  printBitmapWithOptionsAsync(base64Image: string, options: PrintBitmapOptions): Promise<boolean>
  getPrinterStatusAsync(): Promise<PrinterStatusResult>
  feedPaperAsync(lines: number): Promise<boolean>
  cutPaperAsync(): Promise<boolean>
  addListener(eventName: string, listener: (...args: any[]) => void): any
  removeListeners(count: number): void
}

export default requireNativeModule<SunmiK2NativeType>('SunmiK2')
