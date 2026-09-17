/**
 * src/shared/theme/scale.ts
 * ---------------------------------------------------------------
 * Tính hệ số K lúc runtime từ kích thước vật lý của màn hình.
 *
 * Nguyên tắc: giữ nguyên GÓC NHÌN, không giữ nguyên số pixel.
 *   K = comfort × (viewDistance / REF_DISTANCE) × ppi / (160 × pixelRatio)
 * ---------------------------------------------------------------
 */

import { Dimensions, PixelRatio, Platform } from 'react-native'

/** Khoảng cách tham chiếu: điện thoại cầm trên tay (mm) */
const REF_DISTANCE_MM = 350

/** dp danh nghĩa: 160dp = 1 inch */
const DP_PER_INCH = 160

export type DeviceClass = 'phone' | 'tablet' | 'kiosk' | 'wall'

export type ScaleInput = {
  /** Đường chéo màn hình (inch). */
  diagonalIn?: number
  /** Khoảng cách nhìn thực tế (mm). Bỏ trống thì suy ra từ diagonalIn. */
  viewDistanceMm?: number
  /** Hệ số thoải mái. Kiosk công cộng khuyên dùng 1.15–1.3. */
  comfort?: number
}

export type ScaleResult = {
  k: number // hệ số cho nội dung tương tác
  kAttract: number // hệ số cho màn hình chờ (đọc từ xa)
  ppi: number
  pixelRatio: number
  diagonalIn: number
  viewDistanceMm: number
  deviceClass: DeviceClass
  source: 'config' | 'model-table' | 'estimated'
}

/** Bảng model → đường chéo vật lý */
export const MODEL_DIAGONALS: Record<string, number> = {
  'Sumi mini K2': 15.6,
  'Sunmi K2 mini': 15.6,
  'Sunmi K2': 24.0,
  'Sumi K27': 27.0,
}

export function resolveDiagonal(
  configured?: number,
  modelName?: string,
  dimensions?: { width: number; height: number },
): { diagonalIn: number; source: ScaleResult['source'] } {
  if (configured && configured > 3) {
    return { diagonalIn: configured, source: 'config' }
  }
  if (modelName && MODEL_DIAGONALS[modelName]) {
    return { diagonalIn: MODEL_DIAGONALS[modelName], source: 'model-table' }
  }
  const dims = dimensions ?? Dimensions.get('screen')
  const width = dims.width || 390
  const height = dims.height || 844
  const pr = Math.max(PixelRatio.get(), 1)
  const diagPx = Math.hypot(width * pr, height * pr)

  // Giả định density OEM khai báo: diagonalIn = diagPx / (160 * pr)
  const estimatedDiag = diagPx / (DP_PER_INCH * pr)
  return {
    diagonalIn: Math.max(estimatedDiag, 4.0), // Bảo vệ khỏi NaN / 0
    source: 'estimated',
  }
}

export function classifyDevice(diagonalIn: number): DeviceClass {
  if (diagonalIn < 7.5) return 'phone'
  if (diagonalIn < 13) return 'tablet'
  if (diagonalIn < 30) return 'kiosk'
  return 'wall'
}

export function estimateViewDistance(cls: DeviceClass): number {
  switch (cls) {
    case 'phone':
      return 350
    case 'tablet':
      return 450
    case 'kiosk':
      return 650 // Đứng, tay chạm màn hình
    case 'wall':
      return 750 // Tầm với tay thao tác màn hình lớn
  }
}

export function estimateAttractDistance(cls: DeviceClass): number {
  switch (cls) {
    case 'phone':
      return 350
    case 'tablet':
      return 600
    case 'kiosk':
      return 1800 // Đọc từ xa trong sảnh
    case 'wall':
      return 3000
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const quantize = (v: number, step = 0.05) => Math.round(v / step) * step

export function computeScale(
  input: ScaleInput = {},
  modelName?: string,
  dimensions?: { width: number; height: number },
): ScaleResult {
  const { diagonalIn, source } = resolveDiagonal(input.diagonalIn, modelName, dimensions)
  const cls = classifyDevice(diagonalIn)

  const pixelRatio = Math.max(PixelRatio.get(), 1)
  const dims = dimensions ?? Dimensions.get('screen')
  const width = dims.width || 390
  const height = dims.height || 844
  const diagPx = Math.hypot(width * pixelRatio, height * pixelRatio)

  const safeDiagonal = Math.max(diagonalIn, 1)
  const ppi = diagPx / safeDiagonal

  const viewDistanceMm = input.viewDistanceMm ?? estimateViewDistance(cls)
  const comfort = input.comfort ?? (cls === 'kiosk' || cls === 'wall' ? 1.2 : 1.0)

  /** Hệ số sửa sai giữa dp danh nghĩa và mật độ điểm ảnh thực */
  const densityCorrection = ppi / (DP_PER_INCH * pixelRatio)

  const raw = comfort * (viewDistanceMm / REF_DISTANCE_MM) * densityCorrection
  const k = clamp(quantize(isNaN(raw) ? 1.0 : raw), 0.85, 4.0)

  const attractDistance = estimateAttractDistance(cls)
  const kAttractRaw = comfort * (attractDistance / REF_DISTANCE_MM) * densityCorrection
  const kAttract = clamp(quantize(isNaN(kAttractRaw) ? k : kAttractRaw), k, k * 3.0)

  return {
    k,
    kAttract,
    ppi: isNaN(ppi) ? 160 : ppi,
    pixelRatio,
    diagonalIn: safeDiagonal,
    viewDistanceMm,
    deviceClass: cls,
    source,
  }
}

export function dpToMm(dp: number, k: number, ppi: number, pixelRatio: number): number {
  if (!ppi || ppi === 0) return 0
  return (dp * k * pixelRatio * 25.4) / ppi
}

export function mmToDp(mm: number, ppi: number, pixelRatio: number): number {
  if (!ppi || ppi === 0) return 0
  return (mm * ppi) / (25.4 * pixelRatio)
}

export function minTouchMm(cls: DeviceClass): number {
  return cls === 'kiosk' || cls === 'wall' ? 19 : 9
}

export function touchFloorDp(touchBaseDp: number, s: ScaleResult): number {
  const scaled = touchBaseDp * s.k
  const floor = mmToDp(minTouchMm(s.deviceClass), s.ppi, s.pixelRatio)
  return Math.max(scaled, floor)
}

export function auditTouchTarget(
  touchDp: number,
  s: ScaleResult,
  minMm = minTouchMm(s.deviceClass),
): { mm: number; pass: boolean } {
  const mm = dpToMm(touchDp, s.k, s.ppi, s.pixelRatio)
  const pass = mm >= minMm
  if (!pass && __DEV__) {
    console.warn(
      `[scale] Vùng chạm ${touchDp}dp = ${mm.toFixed(1)}mm, dưới ngưỡng ${minMm}mm. ` +
        `Kiểm tra lại diagonalIn (đang là ${s.diagonalIn.toFixed(1)}", nguồn: ${s.source}).`,
    )
  }
  return { mm, pass }
}

export function describeScale(s: ScaleResult): string {
  return [
    `${s.deviceClass} ${s.diagonalIn.toFixed(1)}" (${s.source})`,
    `${Math.round(s.ppi)} ppi · pixelRatio ${s.pixelRatio}`,
    `nhìn ${s.viewDistanceMm}mm`,
    `K=${s.k.toFixed(2)} · K chờ=${s.kAttract.toFixed(2)}`,
    Platform.OS,
  ].join(' | ')
}
