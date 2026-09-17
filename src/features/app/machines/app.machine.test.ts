import { storage } from '@/shared/lib/storage'
import { createActor } from 'xstate'
import { appMachine } from './app.machine'

describe('appMachine (Kiosk Device Activation & Refresh Token Flow)', () => {
  const mockDevice = {
    id: 'dev-1',
    deviceCode: 'PROMEDI-K2-01',
    deviceName: 'Kiosk Sumi Mini K2',
    warehouseId: 'wh-1',
    isActive: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize to deviceInactive when no device is provided', () => {
    const actor = createActor(appMachine, { input: {} })
    actor.start()

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('deviceInactive')
    expect(snapshot.context.device).toBeNull()
    expect(snapshot.context.accessToken).toBeNull()
  })

  it('should transition from deviceInactive to authenticated on DEVICE_ACTIVATED', () => {
    const actor = createActor(appMachine, { input: {} })
    actor.start()

    expect(actor.getSnapshot().value).toBe('deviceInactive')

    actor.send({
      type: 'DEVICE_ACTIVATED',
      device: mockDevice,
      accessToken: 'token-xyz-123',
      refreshToken: 'refresh-xyz-123',
    })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('authenticated')
    expect(snapshot.context.device).toEqual(mockDevice)
    expect(snapshot.context.accessToken).toBe('token-xyz-123')
    expect(storage.set as jest.Mock<any, any>).toHaveBeenCalledWith(
      'auth-refresh-token',
      'refresh-xyz-123',
    )
  })

  it('should trigger refreshingToken flow on initialization when device exists', async () => {
    ;(storage.getString as jest.Mock<any, any>).mockReturnValue('valid-refresh-token')

    const actor = createActor(appMachine, {
      input: {
        device: mockDevice,
        accessToken: 'initial-access-token',
      },
    })
    actor.start()

    // Immediately enters refreshingToken state
    expect(actor.getSnapshot().value).toBe('refreshingToken')

    // Wait for promise resolution
    await new Promise((resolve) => setTimeout(resolve, 50))

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('authenticated')
    expect(snapshot.context.accessToken).toContain('refreshed-access-token')
  })

  it('should update access token when ACCESS_TOKEN_REFRESHED event is sent', () => {
    ;(storage.getString as jest.Mock<any, any>).mockReturnValue('valid-refresh-token')
    const actor = createActor(appMachine, {
      input: {
        device: mockDevice,
        accessToken: 'token-old',
      },
    })
    actor.start()

    actor.send({
      type: 'ACCESS_TOKEN_REFRESHED',
      accessToken: 'token-new-refreshed',
    })

    expect(actor.getSnapshot().context.accessToken).toBe('token-new-refreshed')
  })

  it('should transition from authenticated to deviceInactive on DEVICE_RESET', async () => {
    ;(storage.getString as jest.Mock<any, any>).mockReturnValue('valid-refresh-token')
    const actor = createActor(appMachine, {
      input: {
        device: mockDevice,
        accessToken: 'token-123',
      },
    })
    actor.start()

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(actor.getSnapshot().value).toBe('authenticated')

    actor.send({ type: 'DEVICE_RESET' })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('deviceInactive')
    expect(snapshot.context.device).toBeNull()
    expect(snapshot.context.accessToken).toBeNull()
    expect(storage.remove as jest.Mock<any, any>).toHaveBeenCalledWith('auth-refresh-token')
  })

  it('should trigger refreshingToken on NETWORK_RESTORED or REFRESH_TOKEN event', async () => {
    ;(storage.getString as jest.Mock<any, any>).mockReturnValue('valid-refresh-token')
    const actor = createActor(appMachine, {
      input: {
        device: mockDevice,
        accessToken: 'token-123',
      },
    })
    actor.start()

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(actor.getSnapshot().value).toBe('authenticated')

    actor.send({ type: 'NETWORK_RESTORED' })
    expect(actor.getSnapshot().value).toBe('refreshingToken')
  })
})
