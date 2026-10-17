/**
 * @file tof.types.ts
 * @brief Dinh nghia cac Kieu du lieu va Interface cho Phan lop Hardware Cam bien Khoang cach ToF VL53L5CX.
 * @module src/core/hardware/tof/types/tof.types.ts
 *
 * Tai lieu tham chieu:
 * - Special Specs V5.2 Production (Do chieu cao khong tiep xuc ToF 8x8 tich hop ban can InBody)
 * - STMicroelectronics VL53L5CX Datasheet DS13754
 */

import type { IMeasurementDevice } from '../../types/measurement-device.interface'

/**
 * Trang thai co do tin cay tin hieu photon phan xa (Target Status) tu cam bien VL53L5CX:
 * - `5`: Tin hieu cuc tot, do tin cay 100% (Phan xa be mat phang, da nguoi, tran nha).
 * - `9`: Tin hieu phan xa trung binh (Toc den sam hap thu anh sang), do tin cay 50%.
 * - `0` / `255`: Tin hieu nhieu / Che khuat / Khong tim thay muc tieu.
 */
export type ToFTargetStatus = 0 | 5 | 9 | 255 | number

/**
 * Cau truc Payload cua 1 Frame do 64 vung tu cam bien ToF VL53L5CX (Da giai ma tu goi nhi phan 204 Bytes).
 */
export interface VL53L5CXFramePayload {
  /** So thu tu frame tang dan (1, 2, 3...) */
  frameId: number
  /** Thoi gian do tinh tu luc khoi dong cam bien (milliseconds) */
  timestampMs: number
  /** Mang dung 64 phan tu khoang cach tho r tu thau kinh toi be mat muc tieu (don vi: mm) */
  distances: number[]
  /** Mang dung 64 phan tu ma co trang thai Target Status (5, 9, 0...) */
  targetStatuses: ToFTargetStatus[]
  /** So vung do trong ma tran 8x8 (Co dinh = 64) */
  zoneCount: number
  /** Co xac nhan goi tin hop le, dung 204 bytes va khop ma kiem tra loi CRC16 Modbus */
  isValid: boolean
}

/**
 * Cấu trúc gói tin kết quả đo chiều cao nhị phân 16 Bytes từ Firmware ESP32 (Height Packet).
 * Được giải mã từ byte stream qua USB Serial 460800 baud.
 */
export interface HeightPacketPayload {
  /** 0xAA */
  header0: number
  /** 0x55 */
  header1: number
  /** 'H' (0x48) */
  packetType: number
  /** Trạng thái FSM của vi điều khiển */
  state: EngineState
  /** Mã hướng dẫn tương tác */
  guidance: EngineGuidance
  /** Chiều cao chốt (mm, ví dụ 1725 = 172.5cm, 0 nếu chưa locked) */
  lockedHeightMm: number
  /** Chiều cao tức thời (mm) */
  instantHeightMm: number
  /** Tiến trình ổn định (0.0 -> 1.0) */
  progress: number
  /** Độ tin cậy tính toán (0.0 -> 1.0) */
  confidence: number
  /** Số lượng zone trong dải đỉnh đầu */
  headZoneCount: number
  /** Sự kiện đặc biệt từ firmware */
  event: EngineEvent | 'NONE'
  /** Cờ trạng thái ổn định */
  isStable: boolean
  /** Cờ phát hiện có người */
  hasPerson: boolean
  /** Cờ cảnh báo sàn bị trôi lệch */
  needsRecalibration: boolean
  /** Timestamp lúc nhận gói tin trên Kiosk (ms) */
  timestampMs: number
}

/**
 * Trang thai tai cua ban can InBody - truyen vao Engine moi frame.
 * - `LOADED`: Ban can InBody xac nhan co tai trong nguoi that (>= minWeightKg).
 * - `EMPTY`: InBody bao RO RANG ban can dang trong (Status '0' sau khi da unlock).
 * - `UNKNOWN`: Chua co thong tin (mac dinh khi chua ket noi InBody hoac dung doc lap).
 * CANH BAO: Khong suy ra EMPTY tu "can nang = 0" vi khi nguoi moi buoc len InBody co the bao 0 tam thoi.
 */
export type WeightState = 'LOADED' | 'EMPTY' | 'UNKNOWN'

/**
 * Ma huong dan hanh dong tuong tac cho khach hang (Guidance Codes)
 */
export type EngineGuidance =
  | 'IDLE' // Trang thai cho / chua co phien
  | 'STEP_ON' // Moi buoc len ban can
  | 'HOLD_STILL' // Vui long dung thang va dung yen
  | 'MEASURING' // Dang phan tich tin hieu do chieu cao
  | 'LOCKED' // Da hoan thanh chot chieu cao
  | 'TIMEOUT' // Qua thoi gian do chieu cao
  // Legacy guidance codes - van giu de khong pha vo voice engine cu
  | 'STEP_IN'
  | 'LOWER_ARMS'
  | 'ONE_PERSON'
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'MOVE_FORWARD'
  | 'MOVE_BACK'

/**
 * Trang thai may FSM cua Engine do chieu cao (Simplified)
 */
export type EngineState =
  | 'IDLE'
  | 'NEEDS_CALIBRATION'
  | 'STEP_ON'
  | 'MEASURING'
  | 'HOLD_STILL'
  | 'LOCKED'
  | 'TIMEOUT'
  | 'ERROR'

/**
 * Ket qua cua quy trinh Tare (Hieu chuan mat san / ban can).
 */
export type TareResult =
  | 'APPLIED' // Ap dung thanh cong ngay lap tuc
  | 'PENDING' // Lech > autoApplyMaxDiffMm -> cho admin xac nhan
  | { error: 'SCENE_NOT_STABLE' | 'TOO_FEW_ZONES' } // Bi tu choi

/**
 * Nguon goc kich hoat lenh Tare.
 */
export type TareSource = 'STARTUP' | 'IDLE_AUTO' | 'ADMIN'

/**
 * Du lieu hieu chuan mat san / ban can (Floor / Scale Baseline)
 */
export interface FloorCalibrationData {
  /** Mang 64 khoang cach thang dung z toi san / mat ban can cua tung zone (mm) */
  floorZ: number[]
  /** Mang 64 co danh dau zone san do tin cay */
  floorOk: boolean[]
  /** Toa do X vi tri dung chuan o tam san (mm) */
  refX0: number
  /** Toa do Y vi tri dung chuan o tam san (mm) */
  refY0: number
  /** Thoi diem hieu chuan (ms) */
  calibratedAt?: number
}

/**
 * Cau hinh anh xa he truc khong gian thau kinh cam bien
 */
export interface AxisMapConfig {
  swapXY: boolean
  flipX: boolean
  flipY: boolean
}

/**
 * Cau hinh toan dien cho HeightMeasurementEngine (InBody-Centered Mode V5.2)
 */
export interface HeightEngineConfig {
  /** Chieu cao mat san mong doi (mm, mac dinh 2220mm) */
  expectedFloorMm?: number
  /** Do cao be can / ban dung InBody so voi mat san (mm, vi du InBody 260S = 96mm, mac dinh 0) */
  platformHeightMm?: number

  // -- Vung do ROI -----------------------------------------------------------
  /** Hang dau tien trong ROI (inclusive, 0-indexed, mac dinh 1) */
  roiRowStart?: number
  /** Hang cuoi trong ROI (inclusive, 0-indexed, mac dinh 6) */
  roiRowEnd?: number
  /** Cot dau tien trong ROI (inclusive, 0-indexed, mac dinh 1) */
  roiColStart?: number
  /** Cot cuoi trong ROI (inclusive, 0-indexed, mac dinh 6) */
  roiColEnd?: number

  // -- Phat hien nguoi -------------------------------------------------------
  /** Nguong chieu cao toi thieu so voi mat ban can de nhan dien la nguoi (mm, mac dinh 800mm) */
  minPersonMm?: number
  /** So frame co nguoi lien tiep de xac nhan (mac dinh 3) */
  presentFrames?: number
  /** So frame khong co nguoi lien tiep de coi la roi ban can (mac dinh 15) */
  absentFrames?: number

  // -- Chieu cao tuc thoi ----------------------------------------------------
  /** Bien do dinh dau de trich band do tu peak (mm, mac dinh 80mm) */
  headBandMm?: number
  /** So zone cao nhat de tinh trung binh chieu cao tuc thoi (mac dinh 3) */
  topK?: number
  /** So zone toi thieu trong band de coi frame hop le - chong spike 1 zone (mac dinh 2) */
  minBandZones?: number
  /** Chieu cao toi thieu hop le tinh tu mat ban can (mm, mac dinh 800) */
  validHeightMinMm?: number
  /** Chieu cao toi da hop le tinh tu mat ban can (mm, mac dinh 2300) */
  validHeightMaxMm?: number
  /** Muc nhay toi da giua 2 frame lien tiep (mm, mac dinh 60) */
  maxJumpMm?: number

  // -- Cua so on dinh & Chot ------------------------------------------------
  /** Do dai cua so truot on dinh (ms, mac dinh 1500ms) */
  stabilityWindowMs?: number
  /** Thoi gian can giu on dinh lien tuc toi thieu truoc khi chot (ms, mac dinh 1000ms) */
  stabilityMinHoldMs?: number
  /** So mau toi thieu trong cua so de chot (mac dinh 8) */
  minSamples?: number
  /** Do trai dai (Max - Min) toi da cho phep trong cua so (mm, mac dinh 15mm) */
  stabilityRangeMm?: number
  /** Do doc xu huong |Slope| toi da cho phep (mm/s, mac dinh 8.0mm/s) */
  stabilityMaxSlopeMmPerSec?: number
  /** He so nhan MAD khi loc outlier (mac dinh 3) */
  madFactor?: number
  /** Gia tri MAD toi thieu de tranh chia 0 (mm, mac dinh 3) */
  madFloorMm?: number
  /** Ty le toi thieu mau phai con lai sau loc MAD (mac dinh 0.75) */
  minKeptRatio?: number
  /** So frame nhieu lien tiep cho phep truoc khi xoa cua so (mac dinh 3) */
  glitchGrace?: number
  /** Khoang cach thoi gian toi da giua 2 frame truoc khi coi la dut quang (ms, mac dinh 300ms) */
  maxGapMs?: number
  /** Timeout toi da cho mot phien do (ms, mac dinh 15000ms) */
  timeoutMs?: number

  // -- Tare ------------------------------------------------------------------
  /** So frames thu thap khi tare (mac dinh 30) */
  tareFrames?: number
  /** Ty le frame hop le toi thieu cua mot zone de chap nhan (mac dinh 0.6) */
  minValidRatio?: number
  /** Do lech chuan toi da cua zone de coi san on dinh (mm, mac dinh 8) */
  zoneStdMaxMm?: number
  /** So zone khong on dinh toi da cho phep trong tare (mac dinh 6) */
  maxUnstableZones?: number
  /** Nguong lech toi da so voi baseline cu de tu ap dung (mm, mac dinh 20) */
  autoApplyMaxDiffMm?: number
  /** So frame ranh lien tiep de kiem tra troi san (mac dinh 150) */
  driftIdleFrames?: number
  /** Nguong troi san de bat co needsRecalibration (mm, mac dinh 15) */
  driftThresholdMm?: number

  // -- Hieu chinh thuc nghiem ------------------------------------------------
  /** He so scale bu tru thuc nghiem tu Hoi quy tuyen tinh (mac dinh 1.0) */
  gainScale?: number
  /** Hang so offset bu tru thuc nghiem (mm, mac dinh 0.0) */
  offsetMm?: number
  /** Du lieu hieu chuan san ban dau */
  calibration?: FloorCalibrationData
}

/**
 * Ket qua do chieu cao da chot (Locked Result)
 */
export interface HeightLockResult {
  /** So lan khach buoc vao (tang dan) */
  episodeId: number
  /** Chieu cao chot (cm, do chinh xac 0.1cm) */
  heightCm: number
  /** Chieu cao tho chua ap gain/offset (mm) */
  rawMm: number
  /** So luong mau frame dat chuan trong cua so chot (da loc MAD) */
  sampleCount: number
  /** Timestamp frame luc chot */
  lockedAt: number
  /** Do tin cay tinh toan (0.0 -> 1.0) */
  confidence: number
}

/**
 * Su kien dac biet tu engine de tang dieu phoi phan ung.
 */
export type EngineEvent = 'PERSON_PRESENT' | 'LOCKED' | 'TIMEOUT' | 'PERSON_LEFT'

/**
 * Ket qua dau ra chi tiet cua Engine sau moi frame (Engine Output)
 */
export interface HeightEngineOutput {
  /** Trang thai FSM cua Engine */
  state: EngineState
  /** So thu tu luot đo (episode) */
  episodeId?: number
  /** Ma huong dan nguoi dung */
  guidance: EngineGuidance
  /** Cau huong dan bang van ban tieng Viet */
  guidanceMessage: string
  /** Tien trinh on dinh hoan thanh (tu 0.0 den 1.0) */
  progress: number
  /** Chieu cao tuc thoi cua frame hien tai (mm) */
  instantHeightMm: number | null
  /** Chieu cao tuc thoi cua frame hien tai (cm) */
  instantHeightCm: number | null
  /** So luong zone trong cum dinh dau */
  headZoneCount: number
  /** So luong nguoi phat hien duoi cam bien - luon la 0 hoac 1 trong InBody-Centered mode */
  personCount: number
  /** Co phat hien ban tay gio cao (legacy - luon false trong InBody-Centered mode) */
  hasHandRaised: boolean
  /** Co kiem tra tinh on dinh cua nguoi dung */
  isStable: boolean
  /** Ket qua chot hoan chinh khi dat trang thai LOCKED */
  result?: HeightLockResult
  /** Frame thau kinh tho goc */
  rawFrame: VL53L5CXFramePayload
  /** Canh bao san bi troi lech can hieu chuan lai */
  needsRecalibration?: boolean
  /** Ly do gay tac nghen nhieu nhat neu xay ra Timeout */
  dominantIssueReason?: string
  /** Su kien dac biet tu engine (VD: nguoi roi ban can) */
  event?: EngineEvent
  /** Toa do tam cum dinh dau - null trong InBody-Centered mode */
  headCentroidMm: { x: number; y: number } | null
}

/**
 * Ket qua tinh toan do chieu cao tu Engine xu ly toan hoc (HeightMeasurementEngine).
 * Tuong thich nguoc 100% voi cac Caller hien tai.
 */
export interface HeightCalculationResult extends HeightEngineOutput {
  /** Chieu cao co the tinh toan duoc (don vi: cm, do chinh xac 0.1cm) */
  measuredHeightCm: number
  /** Khoang cach tu cam bien tran toi dinh dau nguoi (don vi: mm) */
  headDistanceMm: number
  /** Khoang cach chuan toi mat san / ban can (don vi: mm) */
  floorDistanceMm: number
  /** Do cao be can / ban dung so voi mat san duoc bu tru (don vi: mm) */
  platformHeightMm?: number
  /** Do tin cay tinh toan (tu 0.0 den 1.0) */
  confidence: number
}

/**
 * Interface mo rong cho Thiet bi Cam bien Khoang cach ToF VL53L5CX.
 */
export interface IToFDistanceDevice extends IMeasurementDevice<HeightCalculationResult, void> {
  onFrame(callback: (frame: VL53L5CXFramePayload) => void): () => void
  onHeightResult(callback: (result: HeightCalculationResult) => void): () => void
  setMockMode(enable: boolean): void
}
