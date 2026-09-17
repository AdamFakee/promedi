/** 1. Nhóm sự cố (Fault Category) */
export const FaultCategory = {
  MECHANICAL: 'MECHANICAL', // Cơ khí / Vật lý
  ELECTRICAL: 'ELECTRICAL', // Điện tử / Điện / Nguồn
  SOFTWARE: 'SOFTWARE', // Phần mềm / Hệ thống / Màn hình
  ACCESSORY: 'ACCESSORY', // Phụ kiện / Lin kiện / Linh kiện đi kèm
  OTHER: 'OTHER', // Khác
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type FaultCategory = (typeof FaultCategory)[keyof typeof FaultCategory]

export const FAULT_CATEGORY_LABELS: Record<FaultCategory, string> = {
  [FaultCategory.MECHANICAL]: 'Cơ khí / Vật lý',
  [FaultCategory.ELECTRICAL]: 'Điện tử / Điện / Nguồn',
  [FaultCategory.SOFTWARE]: 'Phần mềm / Hệ thống',
  [FaultCategory.ACCESSORY]: 'Phụ kiện / Lin kiện',
  [FaultCategory.OTHER]: 'Khác (Chi tiết trong mô tả)',
}

/** 2. Mức độ ảnh hưởng (Severity Level) */
export const FaultSeverity = {
  LOW: 'LOW', // Bình thường (vẫn vận hành tạm thời được)
  MEDIUM: 'MEDIUM', // Trung bình (ngưng hoạt động phòng lab/khoa)
  HIGH: 'HIGH', // Khẩn cấp (hỏng thiết bị cấp cứu / hồi sức)
  CRITICAL: 'CRITICAL', // Cực kỳ nghiêm trọng (ảnh hưởng tính mạng bệnh nhân)
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type FaultSeverity = (typeof FaultSeverity)[keyof typeof FaultSeverity]

export const FAULT_SEVERITY_LABELS: Record<FaultSeverity, { label: string; color: string }> = {
  [FaultSeverity.LOW]: { label: 'Bình thường', color: '#10B981' },
  [FaultSeverity.MEDIUM]: { label: 'Trung bình', color: '#F59E0B' },
  [FaultSeverity.HIGH]: { label: 'Khẩn cấp', color: '#EF4444' },
  [FaultSeverity.CRITICAL]: { label: 'Cực kỳ nghiêm trọng', color: '#7F1D1D' },
}

/** 3. Hình ảnh hiện trường báo hỏng */
export interface ReportBrokenImage {
  id: string
  uri: string
  compressedUri?: string
  width?: number
  height?: number
  originalSize?: number // In bytes
  compressedSize?: number // In bytes
  status: 'PENDING' | 'COMPRESSING' | 'READY' | 'ERROR'
  error?: string
}

/** 4. Payload gửi API Tạo Phiếu Báo Hỏng */
export interface CreateReportBrokenPayload {
  assetId: string
  assetCode: string
  faultCategory: FaultCategory
  severity: FaultSeverity
  description: string
  images: {
    uri: string
    filename: string
    mimeType: string
    sizeBytes?: number
  }[]
}

/** 5. Kết quả Phiếu Báo Hỏng tạo thành công */
export interface ReportBrokenTicket {
  ticketId: string
  ticketCode: string
  assetId: string
  assetCode: string
  assetName: string
  faultCategory: FaultCategory
  severity: FaultSeverity
  description: string
  imageCount: number
  newAssetStatus: string // 'PENDING_REPAIR'
  createdAt: string
  createdBy: string
}
