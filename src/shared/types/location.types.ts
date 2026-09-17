export const LocationType = {
  WAREHOUSE: 'WAREHOUSE', // Kho trung tâm, Kho dược, Kho vật tư
  DEPARTMENT: 'DEPARTMENT', // Khoa / Phòng ban / Đơn vị lâm sàng & hành chính (bao gồm cả phòng mổ, phòng bệnh)
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LocationType = (typeof LocationType)[keyof typeof LocationType]

/** Model Khoa / Phòng / Vị trí Lưu kho (Location Scope MVP) */
export interface Location {
  id: string // Unique ID (VD: 'loc-or-02')
  code: string // Mã vị trí / QR Code dán cửa (VD: 'ROOM-OR-02')
  name: string // Tên hiển thị (VD: 'Phòng mổ 02')
  departmentId?: string // ID Khoa/Phòng sở hữu
  departmentName?: string // Tên Khoa/Phòng sở hữu
  building?: string // Tòa nhà (VD: 'Tòa A')
  floor?: string // Tầng (VD: 'Tầng 3')
  type?: LocationType // Loại vị trí: WAREHOUSE | DEPARTMENT
  qrCode?: string // Chuỗi mã QR dán ở cửa phòng để quét C5
}
