export interface DeviceFacility {
  id?: string
  name?: string
  address?: string
}

export interface DeviceKioskConfig {
  configVersion?: number
  voiceGuidanceEnabled?: boolean
  printerEnabled?: boolean
  timeouts?: {
    measureInbodySeconds?: number
    measureBpSeconds?: number
    summarySeconds?: number
  }
  retries?: {
    measureInbodyMax?: number
    measureBpMax?: number
  }
  monitoring?: {
    heartbeatIntervalSeconds?: number
  }
}

export interface DeviceInfo {
  id: string
  deviceCode?: string
  deviceSerial?: string
  deviceName: string
  deviceModel?: string
  location?: string
  facility?: DeviceFacility
  warehouseId?: string
  departmentId?: string
  departmentName?: string
  config?: DeviceKioskConfig
  isActive: boolean
}
