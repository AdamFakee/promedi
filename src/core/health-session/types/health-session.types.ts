import type { InBodyResult } from '@/core/hardware/inbody'

export type ServiceType = 'INBODY' | 'BP' | 'ALL'

export interface CustomerData {
  fullName: string
  identityCode: string
  sessionId?: string
  age: number
  heightCm: number
  gender: 'M' | 'F'
}

export interface BpData {
  systolic: number
  diastolic: number
  pulse: number
}

export interface HealthSessionContext {
  sessionId: string | null
  customer: CustomerData | null
  selectedServices: ServiceType[]
  bpResults: BpData | null
  inBodyResults: InBodyResult | null
  secondsRemaining: number
  error: string | null
}

export type HealthSessionEvent =
  | { type: 'START_SESSION' }
  | { type: 'SUBMIT_IDENTIFICATION'; payload: CustomerData }
  | { type: 'SELECT_SERVICES'; payload: ServiceType[] }
  | { type: 'BP_COMPLETED'; payload: BpData }
  | { type: 'INBODY_COMPLETED'; payload: InBodyResult }
  | { type: 'SKIP_CURRENT_MEASUREMENT' }
  | { type: 'RESET_SESSION' }
  | { type: 'TICK_TIMEOUT' }
  | { type: 'TOUCH_INTERACTION' }
