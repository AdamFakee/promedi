import { requireNativeModule, EventEmitter } from 'expo-modules-core'

export interface UsbDeviceCandidate {
  deviceKey: string
  vendorId: number
  productId: number
  deviceName: string
}

export interface UsbRawDevice extends UsbDeviceCandidate {
  deviceClass: number
  deviceSubclass: number
}

export type UsbSerialBridgeEvents = {
  onData: (event: { portId: string; bytes: number[] }) => void
  onError: (event: { portId: string; message: string }) => void
  onDetached: (event: { portId: string; message?: string }) => void
}

const UsbSerialBridge = requireNativeModule('UsbSerialBridge')
const emitter = new EventEmitter<UsbSerialBridgeEvents>(UsbSerialBridge)

export { UsbSerialBridge, emitter }
