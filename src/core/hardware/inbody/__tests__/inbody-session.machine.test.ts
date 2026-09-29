import { createActor } from 'xstate'
import { inbodySessionMachine } from '../machine/inbody-session.machine'
import type { InBodyClient } from '../client/inbody-client'

describe('inbodySessionMachine (XState v5 FSM)', () => {
  let mockClient: jest.Mocked<InBodyClient>

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      lock: jest.fn().mockResolvedValue(undefined),
      sendInfo: jest.fn().mockResolvedValue(undefined),
      skip: jest.fn().mockResolvedValue(undefined),
      pollStatusOnce: jest.fn(),
      requestResult: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    } as any
  })

  it('khởi tạo ở trạng thái disconnected và chuyển sang connecting khi gửi CONNECT', async () => {
    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        getDeviceKey: async () => 'test-device-key',
        baudRate: 19200,
      },
    })

    actor.start()
    expect(actor.getSnapshot().value).toBe('disconnected')

    actor.send({ type: 'CONNECT' })
    // Machine chuyển sang connecting và gọi connectActor
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(mockClient.connect).toHaveBeenCalledWith({
      type: 'usb-serial',
      portId: 'inbody-port',
      deviceKey: 'test-device-key',
      baudRate: 19200,
    })
  })

  it('chuyển từ ready -> waitingForWeight khi gửi event START với thông tin khách hàng', async () => {
    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        getDeviceKey: async () => 'test-device-key',
        baudRate: 19200,
      },
    })

    actor.start()
    actor.send({ type: 'CONNECT' })

    // Đợi async connectActor & lockActor hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(actor.getSnapshot().value).toBe('ready')

    const patientInfo = {
      id: 'TEST_001',
      gender: 'M' as const,
      heightCm: 175.0,
      age: 25,
    }

    actor.send({ type: 'START', patientInfo })

    expect(actor.getSnapshot().value).toBe('waitingForWeight')
    expect(actor.getSnapshot().context.patientInfo).toEqual(patientInfo)
  })

  it('xử lý luồng đo hoàn chỉnh: waitingForWeight -> sendingInfo -> measuring -> fetchingResult -> completed', async () => {
    const mockResult = {
      inBodyId: 'IB_001',
      userId: 'TEST_001',
      gender: 'M' as const,
      height: 175.0,
      age: 25,
      weight: 70.0,
      testDate: '2026.09.23',
      testTime: '10:00:00',
      protein: 12.0,
      minerals: 3.5,
      bfm: 14.0,
      tbw: 42.0,
      ffm: 56.0,
      smm: 32.0,
      bmi: 22.8,
      pbf: 20.0,
      whr: 0.85,
      bmr: 1600,
      vfl: 5,
      inBodyScore: 85,
      smi: 8.1,
      segmental: {} as any,
      control: {} as any,
      raw: [],
    }

    mockClient.requestResult.mockResolvedValue(mockResult)

    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        getDeviceKey: async () => 'test-device-key',
        baudRate: 19200,
      },
    })

    actor.start()
    actor.send({ type: 'CONNECT' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    actor.send({
      type: 'START',
      patientInfo: { id: 'TEST_001', gender: 'M', heightCm: 175.0, age: 25 },
    })

    // Giả lập poller gửi STATUS '1' (Đã cân xong)
    actor.send({ type: 'STATUS_UPDATE', status: '1' })

    // Đợi sendInfoActor hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(actor.getSnapshot().value).toBe('measuring')

    // Giả lập poller gửi STATUS '3' (Đo hoàn tất BIA)
    actor.send({ type: 'STATUS_UPDATE', status: '3' })

    // Đợi fetchResultActor hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(actor.getSnapshot().value).toBe('completed')
    expect(actor.getSnapshot().context.result).toEqual(mockResult)
    expect(actor.getSnapshot().context.progress).toBe(100)
  })

  it('xử lý trạng thái lỗi STATUS 35: chuyển sang deviceError và tự động gửi SKIP để khôi phục', async () => {
    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        getDeviceKey: async () => 'test-device-key',
        baudRate: 19200,
      },
    })

    actor.start()
    actor.send({ type: 'CONNECT' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    actor.send({
      type: 'START',
      patientInfo: { id: 'TEST_001', gender: 'M', heightCm: 175.0, age: 25 },
    })

    // Giả lập poller báo STATUS '5' (Lỗi Chiều cao - errorCode '2')
    actor.send({ type: 'STATUS_UPDATE', status: '5', errorCode: '2' })

    expect(actor.getSnapshot().context.lastErrorCode).toBe('HEIGHT_ERROR')

    // Đợi sendSkipActor gửi SKIP thành công và quay về waitingForWeight
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(mockClient.skip).toHaveBeenCalled()
    expect(actor.getSnapshot().value).toBe('waitingForWeight')
  })
})
