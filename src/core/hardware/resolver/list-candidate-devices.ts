/**
 * Wrapper hỗ trợ tương tác với Native Bridge để liệt kê thiết bị và xin quyền USB.
 *
 * @module src/core/hardware/resolver/list-candidate-devices.ts
 */

import {
  UsbSerialBridge,
  type UsbDeviceCandidate,
} from '../../../../modules/expo-usb-serial-bridge'

/**
 * Gọi Native Module liệt kê toàn bộ các UsbDevice có driver chip hỗ trợ đang cắm vào Kiosk.
 *
 * @return Promise<UsbDeviceCandidate[]> Mảng các ứng viên thiết bị USB.
 */
export async function listCandidateDevices(): Promise<UsbDeviceCandidate[]> {
  try {
    return await UsbSerialBridge.listDevices()
  } catch {
    return []
  }
}

/**
 * Gọi Native Module xin quyền truy cập thiết bị USB từ Android OS.
 *
 * @param deviceKey Định danh USB device dạng "vendorId:productId:deviceId".
 * @return Promise<boolean> true nếu được cấp quyền thành công.
 */
export async function requestUsbPermission(deviceKey: string): Promise<boolean> {
  try {
    return await UsbSerialBridge.requestPermission(deviceKey)
  } catch {
    return false
  }
}
