import type { DeviceInfo } from '@/shared/types'

export interface AppContext {
  device: DeviceInfo | null
  accessToken: string | null
  error: string | null
}

export type AppEvent =
  | {
      type: 'DEVICE_ACTIVATED'
      device: DeviceInfo
      accessToken?: string
      refreshToken?: string
    }
  | { type: 'DEVICE_RESET' }
  | { type: 'NETWORK_RESTORED' }
  | { type: 'REFRESH_TOKEN' }
  | { type: 'ACCESS_TOKEN_REFRESHED'; accessToken: string }
