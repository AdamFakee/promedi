/**
 * State Machine XState v5 quản lý vòng đời đo thiết bị InBody 260S.
 * @module src/core/hardware/inbody/machine/inbody-session.machine.ts
 */

import { setup, assign, fromCallback, fromPromise } from 'xstate'
import type { InBodyMachineContext, InBodyMachineEvent } from './inbody-session.types'
import type { InBodyErrorCode } from '../types/inbody.types'
import { STATUS_CODE, ERROR_CODE } from '../protocol/constants'

/** Helper phân loại mã lỗi từ STATUS 35 */
function parseErrorCode(code?: string): InBodyErrorCode {
  if (code === ERROR_CODE.GENDER) return 'GENDER_ERROR'
  if (code === ERROR_CODE.HEIGHT) return 'HEIGHT_ERROR'
  if (code === ERROR_CODE.AGE) return 'AGE_ERROR'
  return 'UNKNOWN_ERROR'
}

export const inbodySessionMachine = setup({
  types: {} as {
    context: InBodyMachineContext
    events: InBodyMachineEvent
    input: {
      client: InBodyMachineContext['client']
      config: InBodyMachineContext['config']
    }
  },
  actions: {
    onMeasuringStart: () => {},
    onMeasurementCompleted: () => {},
    onConnectionError: () => {},
    onDeviceError: () => {},
  },
  actors: {
    /** Actor thực thi kết nối TCP */
    connectActor: fromPromise(
      async ({
        input,
      }: {
        input: { client: InBodyMachineContext['client']; config: InBodyMachineContext['config'] }
      }) => {
        await input.client.connect(input.config)
      },
    ),

    /** Actor thực thi lệnh Khóa máy */
    lockActor: fromPromise(
      async ({ input }: { input: { client: InBodyMachineContext['client'] } }) => {
        await input.client.lock('1')
      },
    ),

    /** Actor thực thi lệnh Mở khóa máy */
    unlockActor: fromPromise(
      async ({ input }: { input: { client: InBodyMachineContext['client'] } }) => {
        await input.client.lock('2')
      },
    ),

    /** Actor nạp thông tin khách hàng xuống InBody */
    sendInfoActor: fromPromise(
      async ({
        input,
      }: {
        input: {
          client: InBodyMachineContext['client']
          patientInfo: InBodyMachineContext['patientInfo']
        }
      }) => {
        if (!input.patientInfo) throw new Error('Thiếu thông tin khách hàng')
        await input.client.sendInfo(input.patientInfo)
      },
    ),

    /** Actor rút mảng dữ liệu RESULT */
    fetchResultActor: fromPromise(
      async ({ input }: { input: { client: InBodyMachineContext['client'] } }) => {
        return await input.client.requestResult()
      },
    ),

    /** Actor gửi lệnh SKIP bỏ qua thông báo lỗi */
    sendSkipActor: fromPromise(
      async ({ input }: { input: { client: InBodyMachineContext['client'] } }) => {
        await input.client.skip()
      },
    ),

    /** Actor Polling STATUS định kỳ 500ms */
    statusPoller: fromCallback(
      ({
        sendBack,
        input,
      }: {
        sendBack: (event: InBodyMachineEvent) => void
        input: { client: InBodyMachineContext['client'] }
      }) => {
        let noEtxCount = 0

        const interval = setInterval(async () => {
          try {
            const status = await input.client.pollStatusOnce()
            noEtxCount = 0 // Reset đếm lỗi khi nhận thành công
            sendBack({
              type: 'STATUS_UPDATE',
              status: status.code,
              errorCode: status.errorCode,
            })
          } catch {
            noEtxCount++
            if (noEtxCount >= 3) {
              sendBack({ type: 'TRANSPORT_TIMEOUT' })
            }
          }
        }, 500)

        return () => clearInterval(interval)
      },
    ),
  },
}).createMachine({
  id: 'inbodySession',
  initial: 'disconnected',
  context: ({ input }) => ({
    client: input.client,
    config: input.config,
    patientInfo: null,
    result: null,
    consecutiveNoEtxCount: 0,
    progress: 0,
    lastErrorCode: null,
  }),
  states: {
    disconnected: {
      on: {
        CONNECT: 'connecting',
      },
    },

    connecting: {
      invoke: {
        src: 'connectActor',
        input: ({ context }) => ({ client: context.client, config: context.config }),
        onDone: {
          target: 'initializing',
        },
        onError: {
          target: 'disconnected',
          actions: [assign({ lastErrorCode: () => 'UNKNOWN_ERROR' as const }), 'onConnectionError'],
        },
      },
    },

    initializing: {
      invoke: {
        src: 'sendSkipActor',
        input: ({ context }) => ({ client: context.client }),
        onDone: 'locking',
        onError: 'locking', // Vẫn tiếp tục nếu timeout
      },
    },

    locking: {
      invoke: {
        src: 'lockActor',
        input: ({ context }) => ({ client: context.client }),
        onDone: 'ready',
        onError: 'ready', // Vẫn tiếp tục nếu lock cảnh báo
      },
    },

    ready: {
      on: {
        START: {
          target: 'waitingForWeight',
          actions: assign({
            patientInfo: ({ event }) => (event.type === 'START' ? event.patientInfo : null),
            progress: 0,
            lastErrorCode: null,
          }),
        },
        DISCONNECT: 'disconnecting',
      },
    },

    waitingForWeight: {
      invoke: {
        src: 'statusPoller',
        input: ({ context }) => ({ client: context.client }),
      },
      on: {
        STATUS_UPDATE: [
          {
            guard: ({ event }) => event.status === STATUS_CODE.WEIGHT_DONE_INPUT_INFO,
            target: 'sendingInfo',
          },
          {
            guard: ({ event }) => event.status === STATUS_CODE.ERROR,
            target: 'deviceError',
            actions: [
              assign({ lastErrorCode: ({ event }) => parseErrorCode(event.errorCode) }),
              'onDeviceError',
            ],
          },
        ],
        TRANSPORT_TIMEOUT: 'transportTimeout',
        DISCONNECT: 'lockingThenDisconnect',
      },
    },

    sendingInfo: {
      invoke: {
        src: 'sendInfoActor',
        input: ({ context }) => ({ client: context.client, patientInfo: context.patientInfo }),
        onDone: {
          target: 'measuring',
          actions: 'onMeasuringStart',
        },
        onError: 'deviceError',
      },
    },

    measuring: {
      invoke: {
        src: 'statusPoller',
        input: ({ context }) => ({ client: context.client }),
      },
      on: {
        STATUS_UPDATE: [
          {
            guard: ({ event }) => event.status === STATUS_CODE.MEASURE_COMPLETED,
            target: 'fetchingResult',
          },
          {
            guard: ({ event }) => event.status === STATUS_CODE.ERROR,
            target: 'deviceError',
            actions: [
              assign({ lastErrorCode: ({ event }) => parseErrorCode(event.errorCode) }),
              'onDeviceError',
            ],
          },
          {
            actions: assign({
              progress: ({ context }) => Math.min(context.progress + 5, 95),
            }),
          },
        ],
        TRANSPORT_TIMEOUT: 'transportTimeout',
        DISCONNECT: 'lockingThenDisconnect',
      },
    },

    fetchingResult: {
      invoke: {
        src: 'fetchResultActor',
        input: ({ context }) => ({ client: context.client }),
        onDone: {
          target: 'verifyingCompletion',
          actions: assign({
            result: ({ event }) => event.output,
            progress: 100,
          }),
        },
        onError: 'deviceError',
      },
    },

    verifyingCompletion: {
      invoke: {
        src: 'statusPoller',
        input: ({ context }) => ({ client: context.client }),
      },
      on: {
        STATUS_UPDATE: {
          guard: ({ event }) =>
            event.status === STATUS_CODE.READY || event.status === STATUS_CODE.LOCKED,
          target: 'completed',
          actions: 'onMeasurementCompleted',
        },
        TRANSPORT_TIMEOUT: {
          target: 'completed',
          actions: 'onMeasurementCompleted',
        },
        DISCONNECT: 'lockingThenDisconnect',
      },
    },

    deviceError: {
      invoke: {
        src: 'sendSkipActor',
        input: ({ context }) => ({ client: context.client }),
        onDone: 'relockingError',
        onError: 'relockingError',
      },
    },

    relockingError: {
      invoke: {
        src: 'lockActor',
        input: ({ context }) => ({ client: context.client }),
        onDone: 'waitingForWeight',
        onError: 'waitingForWeight',
      },
    },

    transportTimeout: {
      entry: assign({
        lastErrorCode: () => 'UNKNOWN_ERROR' as const,
      }),
      always: 'lockingThenDisconnect',
    },

    completed: {
      on: {
        RESET: 'ready',
        DISCONNECT: 'lockingThenDisconnect',
      },
    },

    lockingThenDisconnect: {
      invoke: {
        src: 'lockActor',
        input: ({ context }) => ({ client: context.client }),
        onDone: 'disconnecting',
        onError: 'disconnecting',
      },
    },

    disconnecting: {
      invoke: {
        src: fromPromise(
          async ({ input }: { input: { client: InBodyMachineContext['client'] } }) => {
            await input.client.disconnect()
          },
        ),
        input: ({ context }) => ({ client: context.client }),
        onDone: 'disconnected',
        onError: 'disconnected',
      },
    },
  },
})
