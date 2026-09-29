import type { PrintBitmapOptions, PrinterStatusResult } from './SunmiK2.types'

export default {
  isNfcSupported(): boolean {
    return false
  },
  switchNfcModule(_sn: string): void {},
  setWatermarkAlpha(_alpha: number): void {},
  async printReceiptAsync(_base64Image: string): Promise<boolean> {
    console.warn('[SunmiK2Module.web] printReceiptAsync is not supported on web')
    return false
  },
  async printBitmapWithOptionsAsync(
    _base64Image: string,
    _options: PrintBitmapOptions,
  ): Promise<boolean> {
    console.warn('[SunmiK2Module.web] printBitmapWithOptionsAsync is not supported on web')
    return false
  },
  async getPrinterStatusAsync(): Promise<PrinterStatusResult> {
    return {
      connected: false,
      paperPresent: false,
      message: 'Web fallback: Sunmi K2 hardware not available',
    }
  },
  async feedPaperAsync(_lines: number): Promise<boolean> {
    return false
  },
  async cutPaperAsync(): Promise<boolean> {
    return false
  },
  addListener(_eventName: string, _listener: (...args: any[]) => void): any {
    return { remove: () => {} }
  },
  removeListeners(_count: number): void {},
}
