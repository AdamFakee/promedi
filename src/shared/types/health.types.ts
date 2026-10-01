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

export interface InBodyNormalRangeMetrics {
  upperLimitProtein: number | null
  lowerLimitProtein: number | null
  upperLimitMinerals: number | null
  lowerLimitMinerals: number | null
  upperLimitWeight: number | null
  lowerLimitWeight: number | null
  upperLimitSmm: number | null
  lowerLimitSmm: number | null
  upperLimitBmi: number | null
  lowerLimitBmi: number | null
  upperLimitPbf: number | null
  lowerLimitPbf: number | null
  upperLimitWhr: number | null
  lowerLimitWhr: number | null
  lowerLimitBfm: number | null
  upperLimitBfm: number | null
  lowerLimitBmr: number | null
  upperLimitBmr: number | null
  lowerLimitTbw: number | null
  upperLimitTbw: number | null
  lowerLimitFfm: number | null
  upperLimitFfm: number | null
}

export interface InBodyEvaluationMetrics {
  evaluationProtein: number | null
  evaluationMinerals: number | null
  evaluationBodyFat: number | null
  obesityEvaluationBmi: number | null
  obesityEvaluationPbf: number | null
  bodyBalanceUpper: number | null
  bodyBalanceLower: number | null
  bodyBalanceUpperLower: number | null
}

export interface InBodySegmentalEvaluations {
  leanMassEvaluationLeftArm: number | null
  leanMassEvaluationRightArm: number | null
  leanMassEvaluationTrunk: number | null
  leanMassEvaluationLeftLeg: number | null
  leanMassEvaluationRightLeg: number | null
  bodyFatMassEvaluationLeftArm: number | null
  bodyFatMassEvaluationRightArm: number | null
  bodyFatMassEvaluationTrunk: number | null
  bodyFatMassEvaluationLeftLeg: number | null
  bodyFatMassEvaluationRightLeg: number | null
}

export interface InBodySegmentalMetrics {
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

export interface InBodyControlMetrics {
  targetWeight: number | null
  weightControl: number | null
  bfmControl: number | null
  ffmControl: number | null
}

export interface InBodyMetrics {
  weight: number | null
  protein: number | null
  minerals: number | null
  bfm: number | null
  tbw: number | null
  ffm: number | null
  smm: number | null
  bmi: number | null
  pbf: number | null
  whr: number | null
  bmr: number | null
  vfl: number | null
  inBodyScore: number | null
  smi: number | null
  mobileNumber: string | null
  obesityDegree: number | null
  growthScore: number | null
  recommendedEnergy: number | null
  impedanceCheck: string | null
  segmental: InBodySegmentalMetrics | null
  control: InBodyControlMetrics | null
  normalRanges: InBodyNormalRangeMetrics | null
  evaluations: InBodyEvaluationMetrics | null
  segmentalEvals: InBodySegmentalEvaluations | null
  raw: string[]
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
