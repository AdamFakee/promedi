/**
 * Unit Test cho BPBIO750 Session Machine (XState v5)
 * @module src/core/hardware/bpbio/__tests__/bpbio-session.machine.test.ts
 */

import { createActor } from 'xstate'
import { bpbioSessionMachine } from '../machine/bpbio-session.machine'
import type { BpbioClient } from '../client/bpbio-client'

describe('bpbioSessionMachine (XState v5 FSM)', () => {
  let mockClient: jest.Mocked<BpbioClient>
  let frameCallback: ((frame: any) => void) | null = null

  beforeEach(() => {
    frameCallback = null
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      requestResult: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      lock: jest.fn().mockResolvedValue(undefined),
      unlock: jest.fn().mockResolvedValue(undefined),
      onFrame: jest.fn().mockImplementation((cb) => {
        frameCallback = cb
        return () => {
          frameCallback = null
        }
      }),
      isResultComplete: jest.fn().mockReturnValue(false),
      consumeResult: jest.fn().mockReturnValue({ systolic: 120, diastolic: 80, pulse: 75 }),
      clearPending: jest.fn(),
    } as any
  })

  it('khởi tạo ở trạng thái disconnected và chuyển sang ready khi gửi CONNECT & CONNECTED', () => {
    const actor = createActor(bpbioSessionMachine, {
      input: { client: mockClient },
    })

    actor.start()
    expect(actor.getSnapshot().value).toBe('disconnected')

    actor.send({ type: 'CONNECT' })
    expect(actor.getSnapshot().value).toBe('connecting')

    actor.send({ type: 'CONNECTED' })
    expect(actor.getSnapshot().value).toBe('ready')
  })

  it('chuyển sang collectingResult khi gửi event START và gọi requestResult', () => {
    const actor = createActor(bpbioSessionMachine, {
      input: { client: mockClient },
    })

    actor.start()
    actor.send({ type: 'CONNECT' })
    actor.send({ type: 'CONNECTED' })

    actor.send({ type: 'START' })
    expect(actor.getSnapshot().value).toBe('collectingResult')
    expect(mockClient.requestResult).toHaveBeenCalled()
  })

  it('chuyển sang completed khi nhận đủ 3 gói (isResultComplete = true)', () => {
    const actor = createActor(bpbioSessionMachine, {
      input: { client: mockClient },
    })

    actor.start()
    actor.send({ type: 'CONNECT' })
    actor.send({ type: 'CONNECTED' })
    actor.send({ type: 'START' })

    // Đánh dấu đã nhận đủ kết quả
    mockClient.isResultComplete.mockReturnValue(true)

    // Kích hoạt frameWatcher event
    if (frameCallback) frameCallback({})

    expect(actor.getSnapshot().value).toBe('completed')
    expect(actor.getSnapshot().context.result).toEqual({ systolic: 120, diastolic: 80, pulse: 75 })
  })

  it('quay về ready khi gửi event RESET ở trạng thái completed', () => {
    const actor = createActor(bpbioSessionMachine, {
      input: { client: mockClient },
    })

    actor.start()
    actor.send({ type: 'CONNECT' })
    actor.send({ type: 'CONNECTED' })
    actor.send({ type: 'START' })

    mockClient.isResultComplete.mockReturnValue(true)
    if (frameCallback) frameCallback({})

    expect(actor.getSnapshot().value).toBe('completed')

    actor.send({ type: 'RESET' })
    expect(actor.getSnapshot().value).toBe('ready')
  })
})
