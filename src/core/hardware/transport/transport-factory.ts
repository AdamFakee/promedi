/**
 * Factory pattern tạo đối tượng Transport phù hợp dựa trên loại kết nối chỉ định.
 *
 * @module src/core/hardware/transport/transport-factory.ts
 */

import { TcpTransport } from './tcp-transport'
import { UsbSerialTransport } from './usb-serial-transport'
import type { DeviceTransport } from './transport.interface'

/**
 * Khởi tạo instance DeviceTransport phù hợp.
 *
 * @param type Loại vận chuyển ('tcp' | 'usb-serial').
 * @return DeviceTransport Trình vận chuyển dữ liệu tương ứng.
 */
export function createTransport(type: 'tcp' | 'usb-serial'): DeviceTransport {
  switch (type) {
    case 'tcp':
      return new TcpTransport()
    case 'usb-serial':
      return new UsbSerialTransport()
  }
}
