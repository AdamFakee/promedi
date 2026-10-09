/**
 * State Machine XState v5 quản lý vòng đời đo thiết bị InBody 260S.
 * @module src/core/hardware/inbody/machine/inbody-session.machine.ts
 */

import { assign, fromCallback, fromPromise, setup } from 'xstate'
import { ERROR_CODE, STATUS_CODE } from '../protocol/constants'
import type { InBodyErrorCode } from '../types/inbody.types'
import type { InBodyMachineContext, InBodyMachineEvent } from './inbody-session.types'

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
      tofDevice: InBodyMachineContext['tofDevice']
      getDeviceKey: InBodyMachineContext['getDeviceKey']
      baudRate?: number
    }
  },
  actions: {
    onMeasuringStart: () => {},
    onMeasurementCompleted: () => {},
    onConnectionError: () => {},
    onDeviceError: () => {},
  },
  actors: {
    /** Actor thực thi kết nối USB Serial InBody & ToF (cả hai đều bắt buộc) */
    connectActor: fromPromise(
      async ({
        input,
      }: {
        input: {
          client: InBodyMachineContext['client']
          tofDevice: InBodyMachineContext['tofDevice']
          getDeviceKey: InBodyMachineContext['getDeviceKey']
          baudRate: number
        }
      }) => {
        const deviceKey = await input.getDeviceKey()
        if (!deviceKey) {
          throw new Error(
            'Chưa thiết lập được cổng kết nối tới máy InBody! Vui lòng vào màn hình Test Thiết Bị chạy tính năng Dò cổng để kiểm tra.',
          )
        }
        await Promise.all([
          input.client.connect({
            type: 'usb-serial',
            portId: 'inbody-port',
            deviceKey,
            baudRate: input.baudRate,
          }),
          input.tofDevice.connect(),
        ])
      },
    ),

    /** Actor thực thi ngắt kết nối cả InBody và ToF */
    disconnectActor: fromPromise(
      async ({
        input,
      }: {
        input: {
          client: InBodyMachineContext['client']
          tofDevice: InBodyMachineContext['tofDevice']
        }
      }) => {
        await Promise.allSettled([input.client.disconnect(), input.tofDevice.disconnect()])
      },
    ),

    /** Actor lắng nghe luồng kết quả đo Chiều cao từ Cảm biến ToF */
    tofHeightActor: fromCallback(
      ({
        sendBack,
        input,
      }: {
        sendBack: (event: InBodyMachineEvent) => void
        input: { tofDevice: InBodyMachineContext['tofDevice'] }
      }) => {
        const unsubscribe = input.tofDevice.onHeightResult((result) => {
          sendBack({
            type: 'TOF_UPDATE',
            result,
          })
          if (result.state === 'LOCKED') {
            const lockedHeight = result.result?.heightCm ?? result.measuredHeightCm
            if (lockedHeight && lockedHeight > 0) {
              sendBack({
                type: 'TOF_LOCKED',
                heightCm: lockedHeight,
              })
            }
          }
        })

        return () => {
          unsubscribe()
        }
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

    /** Actor Polling STATUS định kỳ tuần tự (Sequential Async Poller) */
    statusPoller: fromCallback(
      ({
        sendBack,
        input,
      }: {
        sendBack: (event: InBodyMachineEvent) => void
        input: { client: InBodyMachineContext['client'] }
      }) => {
        let isRunning = true
        let noEtxCount = 0

        const pollLoop = async () => {
          if (!isRunning) return

          try {
            const status = await input.client.pollStatusOnce()
            if (!isRunning) return

            noEtxCount = 0 // Reset đếm lỗi khi nhận thành công
            sendBack({
              type: 'STATUS_UPDATE',
              status: status.code,
              errorCode: status.errorCode,
            })
          } catch (err: unknown) {
            if (!isRunning) return

            const errorMessage = err instanceof Error ? err.message : String(err)
            const isMutexError = errorMessage.includes('bận xử lý')

            // Bỏ qua lỗi Mutex lock tạm thời nếu có
            if (!isMutexError) {
              noEtxCount++
              if (noEtxCount >= 5) {
                sendBack({ type: 'TRANSPORT_TIMEOUT' })
                return
              }
            }
          }

          if (isRunning) {
            setTimeout(pollLoop, 500)
          }
        }

        pollLoop()

        return () => {
          isRunning = false
        }
      },
    ),
  },
}).createMachine({
  id: 'inbodySession',
  initial: 'disconnected',
  context: ({ input }) => ({
    client: input.client,
    tofDevice: input.tofDevice,
    getDeviceKey: input.getDeviceKey,
    baudRate: input.baudRate ?? 19200,
    patientInfo: null,
    result: null,
    tofHeightCm: null,
    tofState: 'IDLE',
    tofProgress: 0,
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
        input: ({ context }) => ({
          client: context.client,
          tofDevice: context.tofDevice,
          getDeviceKey: context.getDeviceKey,
          baudRate: context.baudRate,
        }),
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
        // UNLOCK ('2') khi vào màn đo để InBody về status '0' (READY),
        // cảm biến cân mới detect được người bước lên.
        // LOCK '1' chỉ dùng khi rời màn đo (lockingThenDisconnect).
        src: 'unlockActor',
        input: ({ context }) => ({ client: context.client }),
        onDone: 'ready',
        onError: 'ready',
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
            tofHeightCm: null,
            tofState: 'IDLE',
            tofProgress: 0,
          }),
        },
        DISCONNECT: 'disconnecting',
      },
    },

    waitingForWeight: {
      invoke: [
        {
          src: 'statusPoller',
          input: ({ context }) => ({ client: context.client }),
        },
        {
          src: 'tofHeightActor',
          input: ({ context }) => ({ tofDevice: context.tofDevice }),
        },
      ],
      on: {
        TOF_UPDATE: {
          actions: assign({
            tofHeightCm: ({ event }) =>
              event.type === 'TOF_UPDATE' ? event.result.measuredHeightCm : null,
            tofState: ({ event }) => (event.type === 'TOF_UPDATE' ? event.result.state : 'IDLE'),
            tofProgress: ({ event }) => (event.type === 'TOF_UPDATE' ? event.result.progress : 0),
          }),
        },
        TOF_LOCKED: {
          actions: assign({
            tofHeightCm: ({ event }) => (event.type === 'TOF_LOCKED' ? event.heightCm : null),
            tofState: () => 'LOCKED',
            tofProgress: () => 100,
          }),
        },
        STATUS_UPDATE: [
          {
            guard: ({ event, context }) =>
              event.status === STATUS_CODE.WEIGHT_DONE_INPUT_INFO &&
              context.tofState === 'LOCKED' &&
              Boolean(context.tofHeightCm && context.tofHeightCm > 50),
            target: 'sendingInfo',
            actions: assign({
              patientInfo: ({ context }) => {
                if (!context.patientInfo || !context.tofHeightCm) return null
                return {
                  ...context.patientInfo,
                  heightCm: Number(context.tofHeightCm.toFixed(1)),
                }
              },
            }),
          },
          {
            guard: ({ event }) => event.status === STATUS_CODE.WEIGHT_DONE_INPUT_INFO,
            target: 'waitingForTofLock',
          },
          {
            guard: ({ event }) => event.status === STATUS_CODE.MEASURING,
            target: 'measuring',
            actions: 'onMeasuringStart',
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

    waitingForTofLock: {
      invoke: {
        src: 'tofHeightActor',
        input: ({ context }) => ({ tofDevice: context.tofDevice }),
      },
      after: {
        3000: [
          {
            guard: ({ context }) => Boolean(context.tofHeightCm && context.tofHeightCm > 100),
            target: 'sendingInfo',
            actions: assign({
              patientInfo: ({ context }) => {
                if (!context.patientInfo || !context.tofHeightCm) return null
                return {
                  ...context.patientInfo,
                  heightCm: Number(context.tofHeightCm.toFixed(1)),
                }
              },
            }),
          },
          {
            // Quá thời gian chờ mà ToF vẫn không đo được chiều cao hợp lệ -> Báo lỗi tư thế / cảm biến
            target: 'deviceError',
            actions: [assign({ lastErrorCode: () => 'HEIGHT_ERROR' as const }), 'onDeviceError'],
          },
        ],
      },
      on: {
        TOF_UPDATE: {
          actions: assign({
            tofHeightCm: ({ event }) =>
              event.type === 'TOF_UPDATE' ? event.result.measuredHeightCm : null,
            tofState: ({ event }) => (event.type === 'TOF_UPDATE' ? event.result.state : 'IDLE'),
            tofProgress: ({ event }) => (event.type === 'TOF_UPDATE' ? event.result.progress : 0),
          }),
        },
        TOF_LOCKED: {
          target: 'sendingInfo',
          actions: assign({
            tofHeightCm: ({ event }) => (event.type === 'TOF_LOCKED' ? event.heightCm : null),
            tofState: () => 'LOCKED',
            tofProgress: () => 100,
            patientInfo: ({ context, event }) => {
              if (!context.patientInfo) return null
              const height = event.type === 'TOF_LOCKED' ? event.heightCm : 0
              return {
                ...context.patientInfo,
                heightCm: Number(height.toFixed(1)),
              }
            },
          }),
        },
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
            result: ({ event, context }) => {
              const res = event.output
              return {
                ...res,
                height: res.height ?? context.patientInfo?.heightCm ?? null,
              }
            },
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
      entry: [
        assign({
          lastErrorCode: () => 'UNKNOWN_ERROR' as const,
        }),
        'onConnectionError',
      ],
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
        src: 'disconnectActor',
        input: ({ context }) => ({ client: context.client, tofDevice: context.tofDevice }),
        onDone: 'disconnected',
        onError: 'disconnected',
      },
    },
  },
})
