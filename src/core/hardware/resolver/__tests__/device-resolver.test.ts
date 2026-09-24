/**
 * Unit Test cho DeviceResolver (Tự động dò vai trò InBody & BPBIO750)
 * @module src/core/hardware/resolver/__tests__/device-resolver.test.ts
 */

import { DeviceResolver } from '../device-resolver'
import type { BindingStore, DeviceBinding } from '../binding-store'
import type { UsbDeviceCandidate } from '../../../../../modules/expo-usb-serial-bridge'

// Mock UsbSerialTransport trong resolver
jest.mock('../../transport/usb-serial-transport', () => {
  return {
    UsbSerialTransport: jest.fn().mockImplementation(() => {
      let dataCallback: ((chunk: Uint8Array) => void) | null = null
      let connectedPortId: string | null = null
      return {
        connect: jest.fn().mockImplementation(async (config: any) => {
          connectedPortId = config.portId
        }),
        disconnect: jest.fn().mockResolvedValue(undefined),
        onData: jest.fn().mockImplementation((cb: (chunk: Uint8Array) => void) => {
          dataCallback = cb
          return () => {
            dataCallback = null
          }
        }),
        write: jest.fn().mockImplementation(async () => {
          if (dataCallback && connectedPortId) {
            if (connectedPortId.includes('inbody')) {
              // Phản hồi STATUS frame hợp lệ của InBody: STX 0x02, command 0x63 (STATUS), field '0' (Ready), ETX 0x03
              dataCallback(new Uint8Array([0x02, 0x63, 0x30, 0x1b, 0x03]))
            } else if (connectedPortId.includes('bpbio')) {
              // Phản hồi frame hợp lệ của BPBIO với BCC = 0x50
              const bcc = 0x02 ^ 0x00 ^ 0x53 ^ 0x31 ^ 0x32 ^ 0x30 ^ 0x00 ^ 0x00 ^ 0x00 ^ 0x03
              const frame = [
                0x16,
                0x16,
                0x01,
                0x00,
                0x00,
                0x02,
                0x00,
                0x53,
                0x31,
                0x32,
                0x30,
                0x00,
                0x00,
                0x00,
                0x03,
                bcc,
              ]
              dataCallback(new Uint8Array(frame))
            }
          }
        }),
      }
    }),
  }
})

describe('DeviceResolver', () => {
  let mockListCandidates: jest.Mock<Promise<UsbDeviceCandidate[]>>
  let mockRequestPermission: jest.Mock<Promise<boolean>>
  let mockStore: jest.Mocked<BindingStore>

  const mockDevices: UsbDeviceCandidate[] = [
    {
      deviceKey: '1A86:7523:1001',
      vendorId: 0x1a86,
      productId: 0x7523,
      deviceName: '/dev/bus/usb/001/002',
    },
    {
      deviceKey: '0403:6001:1002',
      vendorId: 0x0403,
      productId: 0x6001,
      deviceName: '/dev/bus/usb/001/003',
    },
  ]

  beforeEach(() => {
    mockListCandidates = jest.fn().mockResolvedValue(mockDevices)
    mockRequestPermission = jest.fn().mockResolvedValue(true)
    mockStore = {
      getAll: jest.fn().mockResolvedValue([]),
      saveAll: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    }
  })

  it('xác minh thành công từ cache đã lưu (Fast-Path Verification)', async () => {
    const savedBindings: DeviceBinding[] = [
      {
        role: 'inbody',
        deviceKey: '1A86:7523:1001',
        resolvedAt: Date.now(),
        lastVerifiedAt: Date.now(),
      },
      {
        role: 'bpbio',
        deviceKey: '0403:6001:1002',
        resolvedAt: Date.now(),
        lastVerifiedAt: Date.now(),
      },
    ]
    mockStore.getAll.mockResolvedValue(savedBindings)

    const resolver = new DeviceResolver(mockListCandidates, mockRequestPermission, mockStore)
    const results = await resolver.resolveAll()

    expect(results.size).toBe(2)
    expect(results.get('inbody')?.deviceKey).toBe('1A86:7523:1001')
    expect(results.get('bpbio')?.deviceKey).toBe('0403:6001:1002')
    expect(mockStore.saveAll).toHaveBeenCalled()
  })

  it('bỏ qua candidate nếu từ chối cấp quyền USB (permission denied)', async () => {
    mockRequestPermission.mockResolvedValue(false)

    const resolver = new DeviceResolver(mockListCandidates, mockRequestPermission, mockStore)
    const results = await resolver.resolveAll()

    expect(results.size).toBe(0)
    expect(mockRequestPermission).toHaveBeenCalled()
  })
})
