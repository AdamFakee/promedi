/** 1. Canonical Asset Status Enum (AGENTS.md Rule 7) */
export const AssetStatus = {
  /** S0 - Tài sản vừa tạo trong DB, chưa có phiếu nhập */
  PENDING_STOCK_IN: 'PENDING_STOCK_IN',
  /** S1 - Trong kho, sẵn sàng cấp phát */
  IN_STOCK: 'IN_STOCK',
  /** S2 - Đã cấp phát cho khoa/phòng */
  IN_USE: 'IN_USE',
  /** S3 - Đã báo hỏng, chờ KTV tiếp nhận */
  PENDING_REPAIR: 'PENDING_REPAIR',
  /** S4 - KTV đã tiếp nhận, đang xử lý */
  UNDER_REPAIR: 'UNDER_REPAIR',
  /** S5 - Đang ở tay đối tác bên ngoài */
  ON_LOAN: 'ON_LOAN',
  /** S6 - End-state: đã thanh lý / hủy */
  DISPOSED: 'DISPOSED',
  /** S7 - End-state: thất lạc, không tìm lại được */
  LOST: 'LOST',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus]

/** 2. Phân loại Cơ chế Quản lý: Theo chiếc (SERIALIZED) hay Theo Lô (BATCH_LOT) */
export const TrackingType = {
  SERIALIZED: 'SERIALIZED', // Quản lý theo Chiếc độc lập
  BATCH_LOT: 'BATCH_LOT', // Quản lý theo Lô vật tư tiêu hao & Hạn dùng
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TrackingType = (typeof TrackingType)[keyof typeof TrackingType]

/** 3. Công nghệ Nhận diện (1 trong 3) */
export const IdentificationType = {
  RFID: 'RFID',
  BARCODE: 'BARCODE',
  LINECODE: 'LINECODE',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type IdentificationType = (typeof IdentificationType)[keyof typeof IdentificationType]

/** 4. Model Tổng hợp Quản lý Tài sản & Vật tư Y tế trong Bệnh viện */
export interface InventoryItem {
  id: string // Unique Asset ID (VD: 'ast-100293')
  code: string // Mã tài sản / Mã Lô (VD: 'TS-MONITOR-001')
  name: string // Tên tài sản/vật tư (VD: 'Máy Monitor Bedside BSM-3562')
  unit: string // Đơn vị tính: Cái, Chiếc, Bộ, Hộp, Thùng, Chai, Lọ...

  trackingType: TrackingType // SERIALIZED | BATCH_LOT
  identificationType: IdentificationType // 1 TRONG 3: RFID | BARCODE | LINECODE

  rfidEpc?: string // Mã EPC Tag RFID UHF
  barcodeData?: string // Mã QR / 2D DataMatrix Barcode
  linecodeData?: string // Mã vạch sọc 1D Linecode

  status: AssetStatus | string

  locationId: string // ID Vị trí hiện tại (VD: 'loc-or-02')
  locationName: string // Tên Vị trí hiện tại (VD: 'Phòng mổ 02')

  departmentId?: string // ID Khoa/Phòng sở hữu
  departmentName?: string // Tên Khoa/Phòng sở hữu

  lotNumber?: string // Mã Lô sản xuất
  manufactureDate?: string // Ngày sản xuất
  expiryDate?: string // Hạn sử dụng EXP
  bookQuantity?: number // Số lượng tồn sổ sách
  actualQuantity?: number // Số lượng tồn thực tế kiểm kê

  createdAt?: string
  updatedAt?: string
}
