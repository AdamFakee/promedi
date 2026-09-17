export type ServiceType = 'INBODY' | 'BP' | 'ALL'

export interface CustomerData {
  fullName: string
  identityCode: string
  sessionId?: string
}

export interface BpData {
  systolic: number
  diastolic: number
  pulse: number
}

export interface InBodyData {
  weight: number
  muscleMass: number
  bodyFatPercentage: number
  score: number
}

export interface HealthSessionContext {
  sessionId: string | null
  customer: CustomerData | null
  selectedServices: ServiceType[]
  bpResults: BpData | null
  inBodyResults: InBodyData | null
  secondsRemaining: number
  error: string | null
}

export type HealthSessionEvent =
  | { type: 'START_SESSION' }
  | { type: 'SUBMIT_IDENTIFICATION'; payload: CustomerData }
  | { type: 'SELECT_SERVICES'; payload: ServiceType[] }
  | { type: 'BP_COMPLETED'; payload: BpData }
  | { type: 'INBODY_COMPLETED'; payload: InBodyData }
  | { type: 'SKIP_CURRENT_MEASUREMENT' }
  | { type: 'RESET_SESSION' }
  | { type: 'TICK_TIMEOUT' }
  | { type: 'TOUCH_INTERACTION' }
