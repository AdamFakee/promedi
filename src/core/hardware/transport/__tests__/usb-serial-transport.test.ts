/**
 * Unit Test cho UsbSerialTransport (Lọc dữ liệu portId & xử lý kết nối USB)
 * @module src/core/hardware/transport/__tests__/usb-serial-transport.test.ts
 */

import { UsbSerialTransport } from '../usb-serial-transport'
import { UsbSerialBridge, emitter } from '../../../../../modules/expo-usb-serial-bridge'

jest.mock('../../../../../modules/expo-usb-serial-bridge', () => {
  const listeners: Record<string, ((data: any) => void)[]> = {}
  return {
    UsbSerialBridge: {
      open: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockResolvedValue(undefined),
    },
    emitter: {
      addListener: jest.fn().mockImplementation((event: string, cb: (data: any) => void) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(cb)
        return {
          remove: () => {
            listeners[event] = listeners[event].filter((item) => item !== cb)
          },
        }
      }),
      emit: (event: string, data: any) => {
        if (listeners[event]) {
          listeners[event].forEach((cb) => cb(data))
        }
      },
    },
  }
})

describe('UsbSerialTransport', () => {
  let transport: UsbSerialTransport

  beforeEach(() => {
    jest.clearAllMocks()
    transport = new UsbSerialTransport()
  })

  it('mở cổng thành công với config usb-serial', async () => {
    await transport.connect({
      type: 'usb-serial',
      portId: 'inbody',
      deviceKey: '1A86:7523:1001',
      baudRate: 19200,
    })

    expect(transport.isConnected()).toBe(true)
    expect(UsbSerialBridge.open).toHaveBeenCalledWith('inbody', '1A86:7523:1001', 19200)
  })

  it('lọc chính xác dữ liệu theo portId (cách ly 2 cổng inbody vs bpbio)', async () => {
    await transport.connect({
      type: 'usb-serial',
      portId: 'inbody',
      deviceKey: '1A86:7523:1001',
      baudRate: 19200,
    })

    const receivedChunks: number[][] = []
    transport.onData((chunk) => {
      receivedChunks.push(Array.from(chunk))
    })

    // Bắn event từ cổng bpbio -> Phải bị lọc bỏ!
    ;(emitter as any).emit('onData', { portId: 'bpbio', bytes: [0x16, 0x16, 0x01] })
    expect(receivedChunks.length).toBe(0)

    // Bắn event từ cổng inbody -> Nhận đúng!
    ;(emitter as any).emit('onData', { portId: 'inbody', bytes: [0x02, 0x63, 0x03] })
    expect(receivedChunks.length).toBe(1)
    expect(receivedChunks[0]).toEqual([0x02, 0x63, 0x03])
  })

  it('nhận thông báo khi rút cáp vật lý (onDetached)', async () => {
    await transport.connect({
      type: 'usb-serial',
      portId: 'inbody',
      deviceKey: '1A86:7523:1001',
      baudRate: 19200,
    })

    let closed = false
    transport.onClose(() => {
      closed = true
    })
    ;(emitter as any).emit('onDetached', { portId: 'inbody' })

    expect(closed).toBe(true)
    expect(transport.isConnected()).toBe(false)
  })
})
