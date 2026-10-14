import { createActor } from 'xstate'
import type { InBodyClient } from '../client/inbody-client'
import { inbodySessionMachine } from '../machine/inbody-session.machine'
import type { InBodyResult } from '../types/inbody.types'

describe('inbodySessionMachine (XState v5 FSM)', () => {
  let mockClient: jest.Mocked<InBodyClient>
  let mockTofDevice: any

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

    mockTofDevice = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      onHeightResult: jest.fn().mockReturnValue(() => {}),
    } as any
  })

  it('khởi tạo ở trạng thái disconnected và chuyển sang connecting khi gửi CONNECT', async () => {
    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        tofDevice: mockTofDevice,
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
        tofDevice: mockTofDevice,
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
      normalRanges: {} as any,
      evaluations: {} as any,
      segmentalEvals: {} as any,
      mobileNumber: null,
      obesityDegree: null,
      growthScore: null,
      recommendedEnergy: null,
      impedanceCheck: null,
      raw: [],
    } as unknown as InBodyResult

    mockClient.requestResult.mockResolvedValue(mockResult)

    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        tofDevice: mockTofDevice,
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

    // Giả lập ToF đo và khóa chiều cao trước khi InBody cân xong
    actor.send({ type: 'TOF_LOCKED', heightCm: 173.5 })
    expect(actor.getSnapshot().context.tofHeightCm).toBe(173.5)
    expect(actor.getSnapshot().context.tofState).toBe('LOCKED')

    // Giả lập poller gửi STATUS '1' (Đã cân xong)
    actor.send({ type: 'STATUS_UPDATE', status: '1' })

    // Đợi sendInfoActor hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(mockClient.sendInfo).toHaveBeenCalledWith(expect.objectContaining({ heightCm: 173.5 }))
    expect(actor.getSnapshot().value).toBe('measuring')

    // Giả lập poller gửi STATUS '3' (Đo hoàn tất BIA)
    actor.send({ type: 'STATUS_UPDATE', status: '3' })

    // Đợi fetchResultActor hoàn thành
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(actor.getSnapshot().value).toBe('verifyingCompletion')

    // Giả lập poller gửi STATUS '0' (Ready) sau khi hoàn tất
    actor.send({ type: 'STATUS_UPDATE', status: '0' })
    expect(actor.getSnapshot().value).toBe('completed')
    expect(actor.getSnapshot().context.result?.height).toBe(175.0)
    expect(actor.getSnapshot().context.progress).toBe(100)
  })

  it('xử lý luồng ToF chưa lock khi cân xong: chuyển sang waitingForTofLock và gửi INFO khi TOF_LOCKED đến', async () => {
    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        tofDevice: mockTofDevice,
        getDeviceKey: async () => 'test-device-key',
        baudRate: 19200,
      },
    })

    actor.start()
    actor.send({ type: 'CONNECT' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    actor.send({
      type: 'START',
      patientInfo: { id: 'TEST_002', gender: 'F', heightCm: 0, age: 28 },
    })

    // InBody cân xong trước khi ToF lock
    actor.send({ type: 'STATUS_UPDATE', status: '1' })
    expect(actor.getSnapshot().value).toBe('waitingForTofLock')

    // ToF lock chiều cao sau đó
    actor.send({ type: 'TOF_LOCKED', heightCm: 162.0 })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockClient.sendInfo).toHaveBeenCalledWith(expect.objectContaining({ heightCm: 162.0 }))
    expect(actor.getSnapshot().value).toBe('measuring')
  })

  it('xử lý trạng thái lỗi STATUS 35: chuyển sang deviceError và tự động gửi SKIP để khôi phục', async () => {
    const actor = createActor(inbodySessionMachine, {
      input: {
        client: mockClient,
        tofDevice: mockTofDevice,
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
