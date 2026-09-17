export type IdentityType = 'PHONE' | 'CCCD'

export interface CustomerIdentification {
  identityNumber: string
  identityType: IdentityType
  fullName?: string
  gender: 'MALE' | 'FEMALE'
  heightCm: number
  age: number
}

export interface BloodPressureMetrics {
  systolic: number
  diastolic: number
  pulseRate: number
  pulsePressure: number
  meanArterialPressure: number
  armSide: 'LEFT' | 'RIGHT'
  measuredAt: string
}

export interface InBodyMetrics {
  weightKg: number
  skeletalMuscleMassKg: number
  bodyFatMassKg: number
  percentBodyFat: number
  totalBodyWaterL: number
  intracellularWaterL: number
  extracellularWaterL: number
  ecwOverTbw: number
  visceralFatLevel: number
  basalMetabolicRateKcal: number
  inBodyScore: number
  isEdemaWarning: boolean
}

export interface HealthSessionData {
  sessionId: string | null
  activationCode?: string | null
  customer: CustomerIdentification | null
  bpData: BloodPressureMetrics | null
  inBodyData: InBodyMetrics | null
  createdAt: string | null
}

export type VoiceCueId =
  | 'BP_START'
  | 'BP_ELBOW_SENSOR_OFF'
  | 'BP_MOTION_DETECTED'
  | 'BP_PREVIEW_COMPLETE'
  | 'BP_PREVIEW_TIMEOUT'
  | 'INBODY_START'
  | 'INBODY_ERROR_CONTACT'
  | 'INBODY_UNSTABLE_WEIGHT'
  | 'INBODY_PREVIEW_COMPLETE'
  | 'INBODY_PREVIEW_TIMEOUT'
  | 'SUMMARY_START'
  | 'SUMMARY_TIMEOUT_10S'
  | 'SESSION_TERMINATED'
