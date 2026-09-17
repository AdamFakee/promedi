import type { DeviceInfo, Employee } from '@/shared/types'

export interface AppContext {
  device: DeviceInfo | null
  accessToken: string | null
  employee: Employee | null
  error: string | null
}

export type AppEvent =
  | { type: 'DEVICE_ACTIVATED'; device: DeviceInfo }
  | { type: 'LOGIN_SUCCESS'; accessToken: string; employee: Employee; device?: DeviceInfo }
  | { type: 'LOGGED_OUT' }
  | { type: 'TOKEN_EXPIRED' }
  | { type: 'NETWORK_RESTORED' }
  | { type: 'DEVICE_RESET' }
  | { type: 'ACCESS_TOKEN_REFRESHED'; accessToken: string }
