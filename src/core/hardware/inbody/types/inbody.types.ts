/**
 * TypeScript Interfaces cho thiết bị máy phân tích thành phần cơ thể InBody 260S.
 * @module src/core/hardware/inbody/types/inbody.types.ts
 */

/** Giới tính khách hàng gửi xuống InBody */
export type InBodyGender = 'M' | 'F'

/**
 * Hồ sơ thông tin cá nhân khách hàng cần nạp xuống máy InBody khi cân xong.
 */
export interface PatientInfo {
  /** Mã định danh duy nhất của khách hàng (Tối đa 14 ký tự ASCII) */
  id: string
  /** Giới tính: 'M' (Nam) hoặc 'F' (Nữ) */
  gender: InBodyGender
  /** Chiều cao (cm), dải đo hợp lệ: 50.0 - 250.0 cm */
  heightCm: number
  /** Tuổi khách hàng, dải hợp lệ: 3 - 99 tuổi */
  age: number
}

/** Phân phân bổ cơ nạc và mỡ 5 vùng (Tay Trái/Phải, Thân, Chân Trái/Phải) */
export interface SegmentalMetrics {
  ffmRightArm: number | null
  ffmLeftArm: number | null
  ffmTrunk: number | null
  ffmRightLeg: number | null
  ffmLeftLeg: number | null
  bfmRightArm: number | null
  bfmLeftArm: number | null
  bfmTrunk: number | null
  bfmRightLeg: number | null
  bfmLeftLeg: number | null
}

/** Khuyến nghị điều chỉnh cân nặng và mỡ/cơ */
export interface ControlMetrics {
  targetWeight: number | null
  weightControl: number | null
  bfmControl: number | null
  ffmControl: number | null
}

/**
 * Kết quả phân tích thành phần cơ thể hoàn chỉnh thu thập từ lệnh RESULT (0x64).
 */
export interface InBodyResult {
  /** Mã ID nội bộ thiết bị */
  inBodyId: string | null
  /** Mã ID người dùng */
  userId: string | null
  /** Giới tính */
  gender: InBodyGender | null
  /** Chiều cao (cm) */
  height: number | null
  /** Tuổi */
  age: number | null
  /** Trọng lượng cơ thể (kg) */
  weight: number | null
  /** Ngày đo (YYYY.MM.DD) */
  testDate: string | null
  /** Giờ đo (HH:MM:SS) */
  testTime: string | null
  /** Khối lượng Protein (kg) */
  protein: number | null
  /** Khối lượng Khoáng chất (kg) */
  minerals: number | null
  /** Body Fat Mass - Khối lượng mỡ cơ thể (kg) */
  bfm: number | null
  /** Total Body Water - Tổng lượng nước cơ thể (L) */
  tbw: number | null
  /** Fat Free Mass / Lean Body Mass - Khối lượng nạc (kg) */
  ffm: number | null
  /** Skeletal Muscle Mass - Khối lượng cơ xương (kg) */
  smm: number | null
  /** Body Mass Index - Chỉ số khối cơ thể (kg/m²) */
  bmi: number | null
  /** Percent Body Fat - Tỷ lệ phần trăm mỡ (%) */
  pbf: number | null
  /** Waist-Hip Ratio - Tỷ lệ eo/hông */
  whr: number | null
  /** Basal Metabolic Rate - Tỷ lệ trao đổi chất cơ bản (kcal) */
  bmr: number | null
  /** Visceral Fat Level - Cấp độ mỡ nội tạng (1~20) */
  vfl: number | null
  /** Điểm số InBody (Thang điểm 100) */
  inBodyScore: number | null
  /** Skeletal Muscle Index (kg/m²) */
  smi: number | null
  /** Đánh giá cơ nạc & mỡ từng chi */
  segmental: SegmentalMetrics
  /** Khuyến nghị điều chỉnh */
  control: ControlMetrics
  /** Mảng dữ liệu thô (Raw fields 0..763) để audit/debug */
  raw: string[]
}

/**
 * Cấu trúc trạng thái trả về từ lệnh STATUS (0x63).
 */
export interface InBodyStatus {
  /** Mã trạng thái chính ('0' Ready, '1' WeightDone, '2' Measuring, '3' Completed, '4' Lock, '5' Error) */
  code: string
  /** Mã lỗi phụ nếu code === '5' ('1' Gender, '2' Height, '3' Age) */
  errorCode?: string
}

/**
 * Bảng Map tra cứu chi tiết mã lỗi thiết bị InBody (khi STATUS = '5') từ mã raw ASCII code.
 */
export const INBODY_ERROR_CODE_MAP = {
  /** '1': Mã lỗi Giới tính không hợp lệ */
  '1': {
    code: 'GENDER_ERROR' as const,
    rawCode: '1',
    label: 'Lỗi Giới tính',
    message: 'Giới tính truyền xuống không hợp lệ (bắt buộc M hoặc F)',
  },
  /** '2': Mã lỗi Chiều cao ngoài dải đo cho phép (50.0 - 250.0 cm) */
  '2': {
    code: 'HEIGHT_ERROR' as const,
    rawCode: '2',
    label: 'Lỗi Chiều cao',
    message: 'Chiều cao truyền xuống nằm ngoài dải cho phép (50.0 - 250.0 cm)',
  },
  /** '3': Mã lỗi Tuổi ngoài dải cho phép (3 - 99 tuổi) */
  '3': {
    code: 'AGE_ERROR' as const,
    rawCode: '3',
    label: 'Lỗi Độ tuổi',
    message: 'Độ tuổi truyền xuống nằm ngoài dải cho phép (3 - 99 tuổi)',
  },
} as const

/** Định danh kiểu mã lỗi InBody suy luận từ INBODY_ERROR_CODE_MAP */
export type InBodyErrorCode =
  | (typeof INBODY_ERROR_CODE_MAP)[keyof typeof INBODY_ERROR_CODE_MAP]['code']
  | 'UNKNOWN_ERROR'

/**
 * Bảng Map tra cứu trạng thái hoạt động máy InBody (STATUS 0x63).
 */
export const INBODY_STATUS_CODE_MAP = {
  '0': { code: 'READY', rawCode: '0', label: 'Chờ đo', message: 'Máy rảnh, sẵn sàng cân' },
  '1': {
    code: 'WEIGHT_DONE',
    rawCode: '1',
    label: 'Cân xong',
    message: 'Đã cân xong, chờ nạp hồ sơ khách hàng',
  },
  '2': {
    code: 'MEASURING',
    rawCode: '2',
    label: 'Đang đo BIA',
    message: 'Đang quét dòng điện sinh học BIA',
  },
  '3': {
    code: 'COMPLETED',
    rawCode: '3',
    label: 'Đo hoàn tất',
    message: 'Đã phân tích xong toàn bộ chỉ số',
  },
  '4': {
    code: 'LOCKED',
    rawCode: '4',
    label: 'Máy bị khóa',
    message: 'Máy đang ở chế độ Khóa màn hình & phím bấm (AutoLock)',
  },
  '5': {
    code: 'ERROR',
    rawCode: '5',
    label: 'Phát sinh lỗi',
    message: 'Máy phát sinh lỗi dữ liệu đầu vào',
  },
} as const
