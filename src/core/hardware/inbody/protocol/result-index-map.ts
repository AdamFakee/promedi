/**
 * Bảng ánh xạ chỉ số Index (0 ~ 763) từ mảng kết quả RESULT của InBody 260S.
 * Khớp 100% với tài liệu đặc tả inbody260s-open-protocol-spec.md
 * @module src/core/hardware/inbody/protocol/result-index-map.ts
 */

export const RESULT_INDEX_MAP = {
  /** Index 0: Mã ID nội bộ thiết bị InBody */
  inBodyId: 0,
  /** Index 1: Mã ID người dùng truyền xuống */
  userId: 1,
  /** Index 2: Giới tính ('M' / 'F') */
  gender: 2,
  /** Index 3: Chiều cao (cm) */
  height: 3,
  /** Index 4: Tuổi */
  age: 4,
  /** Index 5: Cân nặng (kg) */
  weight: 5,
  /** Index 6: Ngày đo (YYYY.MM.DD) */
  testDate: 6,
  /** Index 7: Giờ đo (HH:MM:SS) */
  testTime: 7,
  /** Index 15: Protein (kg) */
  protein: 15,
  /** Index 16: Minerals - Khoáng chất (kg) */
  minerals: 16,
  /** Index 17: BFM - Khối lượng mỡ cơ thể (kg) */
  bfm: 17,
  /** Index 18: TBW - Tổng lượng nước cơ thể (L) */
  tbw: 18,
  /** Index 19: FFM / LBM - Khối lượng cơ thể không mỡ (kg) */
  ffm: 19,
  /** Index 20: SMM - Khối lượng cơ xương (kg) */
  smm: 20,
  /** Index 22: BMI - Chỉ số khối cơ thể (kg/m²) */
  bmi: 22,
  /** Index 23: PBF - Tỷ lệ phần trăm mỡ (%) */
  pbf: 23,
  /** Index 24: WHR - Tỷ lệ eo/hông */
  whr: 24,
  /** Index 27: BMR - Tỷ lệ trao đổi chất cơ bản (kcal) */
  bmr: 27,
  /** Index 34: Số điện thoại */
  mobileNumber: 34,
  /** Index 36: VFL - Mức mỡ nội tạng (Cấp độ 1~20) */
  vfl: 36,
  /** Index 103: FFM Tay Phải (kg) */
  ffmRightArm: 103,
  /** Index 104: FFM Tay Trái (kg) */
  ffmLeftArm: 104,
  /** Index 105: FFM Thân Chi (kg) */
  ffmTrunk: 105,
  /** Index 106: FFM Chân Phải (kg) */
  ffmRightLeg: 106,
  /** Index 107: FFM Chân Trái (kg) */
  ffmLeftLeg: 107,
  /** Index 108: BFM Tay Phải (kg) */
  bfmRightArm: 108,
  /** Index 109: BFM Tay Trái (kg) */
  bfmLeftArm: 109,
  /** Index 110: BFM Thân Chi (kg) */
  bfmTrunk: 110,
  /** Index 111: BFM Chân Phải (kg) */
  bfmRightLeg: 111,
  /** Index 112: BFM Chân Trái (kg) */
  bfmLeftLeg: 112,
  /** Index 147: Giới hạn trên Protein chuẩn */
  upperLimitProtein: 147,
  /** Index 148: Giới hạn dưới Protein chuẩn */
  lowerLimitProtein: 148,
  /** Index 149: Giới hạn trên Khoáng chất chuẩn */
  upperLimitMinerals: 149,
  /** Index 150: Giới hạn dưới Khoáng chất chuẩn */
  lowerLimitMinerals: 150,
  /** Index 153: Giới hạn trên Cân nặng chuẩn */
  upperLimitWeight: 153,
  /** Index 154: Giới hạn dưới Cân nặng chuẩn */
  lowerLimitWeight: 154,
  /** Index 155: Giới hạn trên SMM chuẩn */
  upperLimitSmm: 155,
  /** Index 156: Giới hạn dưới SMM chuẩn */
  lowerLimitSmm: 156,
  /** Index 157: Giới hạn trên BMI chuẩn */
  upperLimitBmi: 157,
  /** Index 158: Giới hạn dưới BMI chuẩn */
  lowerLimitBmi: 158,
  /** Index 159: Giới hạn trên PBF chuẩn */
  upperLimitPbf: 159,
  /** Index 160: Giới hạn dưới PBF chuẩn */
  lowerLimitPbf: 160,
  /** Index 161: Giới hạn trên WHR chuẩn */
  upperLimitWhr: 161,
  /** Index 162: Giới hạn dưới WHR chuẩn */
  lowerLimitWhr: 162,
  /** Index 169: Giới hạn dưới BFM chuẩn */
  lowerLimitBfm: 169,
  /** Index 170: Giới hạn trên BFM chuẩn */
  upperLimitBfm: 170,
  /** Index 171: Giới hạn dưới BMR chuẩn */
  lowerLimitBmr: 171,
  /** Index 172: Giới hạn trên BMR chuẩn */
  upperLimitBmr: 172,
  /** Index 173: Giới hạn dưới TBW chuẩn */
  lowerLimitTbw: 173,
  /** Index 174: Giới hạn trên TBW chuẩn */
  upperLimitTbw: 174,
  /** Index 175: Giới hạn dưới FFM chuẩn */
  lowerLimitFfm: 175,
  /** Index 176: Giới hạn trên FFM chuẩn */
  upperLimitFfm: 176,
  /** Index 184: Đánh giá Protein */
  evaluationProtein: 184,
  /** Index 185: Đánh giá Khoáng chất */
  evaluationMinerals: 185,
  /** Index 186: Đánh giá Mỡ cơ thể */
  evaluationBodyFat: 186,
  /** Index 190: Đánh giá béo phì theo BMI */
  obesityEvaluationBmi: 190,
  /** Index 191: Đánh giá béo phì theo PBF */
  obesityEvaluationPbf: 191,
  /** Index 193: Đánh giá cân đối Thân trên */
  bodyBalanceUpper: 193,
  /** Index 194: Đánh giá cân đối Thân dưới */
  bodyBalanceLower: 194,
  /** Index 195: Đánh giá cân đối Trên - Dưới */
  bodyBalanceUpperLower: 195,
  /** Index 203: Trọng lượng mục tiêu (kg) */
  targetWeight: 203,
  /** Index 204: Điều chỉnh Cân nặng (+/- kg) */
  weightControl: 204,
  /** Index 205: Điều chỉnh Mỡ BFM (+/- kg) */
  bfmControl: 205,
  /** Index 206: Điều chỉnh Cơ FFM (+/- kg) */
  ffmControl: 206,
  /** Index 207: Điểm số InBody (Thang điểm 100) */
  inBodyScore: 207,
  /** Index 211: SMI - Skeletal Muscle Index (kg/m²) */
  smi: 211,
  /** Index 306: Điểm số phát triển trẻ em */
  growthScore: 306,
  /** Index 308: Mức độ béo phì */
  obesityDegree: 308,
  /** Index 313: Khuyến nghị năng lượng tiêu thụ (kcal) */
  recommendedEnergy: 313,
  /** Index 314: Đánh giá cơ nạc Tay Trái */
  leanMassEvaluationLeftArm: 314,
  /** Index 315: Đánh giá cơ nạc Tay Phải */
  leanMassEvaluationRightArm: 315,
  /** Index 316: Đánh giá cơ nạc Thân Chi */
  leanMassEvaluationTrunk: 316,
  /** Index 317: Đánh giá cơ nạc Chân Trái */
  leanMassEvaluationLeftLeg: 317,
  /** Index 318: Đánh giá cơ nạc Chân Phải */
  leanMassEvaluationRightLeg: 318,
  /** Index 319: Đánh giá mỡ Tay Trái */
  bodyFatMassEvaluationLeftArm: 319,
  /** Index 320: Đánh giá mỡ Tay Phải */
  bodyFatMassEvaluationRightArm: 320,
  /** Index 321: Đánh giá mỡ Thân Chi */
  bodyFatMassEvaluationTrunk: 321,
  /** Index 322: Đánh giá mỡ Chân Trái */
  bodyFatMassEvaluationLeftLeg: 322,
  /** Index 323: Đánh giá mỡ Chân Phải */
  bodyFatMassEvaluationRightLeg: 323,
  /** Index 744: Trạng thái kiểm tra điện trở sinh học Impedance */
  impedanceCheck: 744,
} as const
