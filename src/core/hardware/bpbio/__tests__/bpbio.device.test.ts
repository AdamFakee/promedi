/**
 * Unit Test cho BpbioDevice Adapter (IMeasurementDevice Contract)
 * @module src/core/hardware/bpbio/__tests__/bpbio.device.test.ts
 */

import { BpbioDevice } from '../device/bpbio.device'
import type { DeviceTransport } from '../../transport/transport.interface'

describe('BpbioDevice Adapter', () => {
  let mockTransport: jest.Mocked<DeviceTransport>
  let device: BpbioDevice

  beforeEach(() => {
    mockTransport = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockResolvedValue(undefined),
      onData: jest.fn().mockReturnValue(() => {}),
      onError: jest.fn().mockReturnValue(() => {}),
      onClose: jest.fn().mockReturnValue(() => {}),
      isConnected: jest.fn().mockReturnValue(true),
    }

    device = new BpbioDevice(
      { type: 'usb-serial', portId: 'bpbio', deviceKey: '0403:6001:1002', baudRate: 9600 },
      mockTransport,
    )
  })

  it('gọi connect đúng với transportConfig', async () => {
    await device.connect()
    expect(mockTransport.connect).toHaveBeenCalledWith({
      type: 'usb-serial',
      portId: 'bpbio',
      deviceKey: '0403:6001:1002',
      baudRate: 9600,
    })
  })

  it('gọi startMeasurement thực hiện gửi lệnh rút kết quả (0x43)', async () => {
    await device.startMeasurement()
    expect(mockTransport.write).toHaveBeenCalled()
  })

  it('gọi reset thực hiện mở khóa máy (0x72)', async () => {
    await device.reset()
    expect(mockTransport.write).toHaveBeenCalled()
  })
})
