import type { DeviceInfo } from '@/shared/types'

export interface ActivateDeviceRequest {
  deviceCode: string
  activationToken: string
}

export interface ActivateDeviceResponse {
  device: DeviceInfo
  accessToken: string
  refreshToken: string
  expiresIn?: number
}
