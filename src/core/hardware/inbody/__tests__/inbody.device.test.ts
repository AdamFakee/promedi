/**
 * Unit Test cho InBodyDevice Adapter (IMeasurementDevice Contract)
 * @module src/core/hardware/inbody/__tests__/inbody.device.test.ts
 */

import { InBodyDevice } from '../device/inbody.device'
import type { DeviceTransport } from '../../transport/transport.interface'

describe('InBodyDevice Adapter', () => {
  let mockTransport: jest.Mocked<DeviceTransport>
  let device: InBodyDevice

  beforeEach(() => {
    let dataListener: ((chunk: Uint8Array) => void) | null = null
    mockTransport = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockImplementation(async (payload: Uint8Array) => {
        if (dataListener) {
          const cmd = payload[1] ?? 0x6c
          // Phản hồi ACK frame chứa STX, cmd, ETX
          dataListener(new Uint8Array([0x02, cmd, 0x03]))
        }
      }),
      onData: jest.fn().mockImplementation((cb) => {
        dataListener = cb
        return () => {
          dataListener = null
        }
      }),
      onError: jest.fn().mockReturnValue(() => {}),
      onClose: jest.fn().mockReturnValue(() => {}),
      isConnected: jest.fn().mockReturnValue(true),
    }

    device = new InBodyDevice(
      { type: 'usb-serial', portId: 'inbody', deviceKey: '1A86:7523:1001', baudRate: 19200 },
      mockTransport,
    )
  })

  it('gọi connect đúng với transportConfig', async () => {
    await device.connect()
    expect(mockTransport.connect).toHaveBeenCalledWith({
      type: 'usb-serial',
      portId: 'inbody',
      deviceKey: '1A86:7523:1001',
      baudRate: 19200,
    })
  })

  it('gọi startMeasurement thực hiện khóa máy LOCK và gửi thông tin bệnh nhân INFO', async () => {
    const patientInfo = { id: 'PATIENT_01', gender: 'M' as const, heightCm: 170, age: 30 }
    await device.startMeasurement(patientInfo)

    // Bằng chứng write được gọi để gửi lệnh LOCK (0x6C) và INFO (0x75)
    expect(mockTransport.write).toHaveBeenCalledTimes(2)
  })

  it('gọi reset thực hiện mở khóa UNLOCK', async () => {
    await device.reset()
    expect(mockTransport.write).toHaveBeenCalled()
  })
})
