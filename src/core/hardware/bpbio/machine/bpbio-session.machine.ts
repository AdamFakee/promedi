/**
 * XState v5 State Machine quản lý phiên đo huyết áp BPBIO750 ở chế độ Lắng nghe thụ động (Passive Listen).
 *
 * Chức năng:
 * - Mở cổng Serial và lắng nghe Broadcast Event 64-byte từ máy đo.
 * - Trạng thái: `disconnected` ➔ `connecting` (auto retry x3) ➔ `active.listening` ➔ `active.measuring` ➔ `active.completed` / `active.error`.
 * - Hỗ trợ auto-retry khi rớt kết nối (`connection_error`).
 * - Hỗ trợ thao tác `RESET` để dọn dẹp và đo lại dễ dàng.
 *
 * @module src/core/hardware/bpbio/machine/bpbio-session.machine.ts
 */

import { assign, fromCallback, fromPromise, setup } from 'xstate'
import type { BpbioClient } from '../client/bpbio-client'
import type { BloodPressureResult, BpbioEvent } from '../types/bpbio.types'

interface Context {
  client: BpbioClient
  getDeviceKey: () => Promise<string | undefined>
  result: BloodPressureResult | null
  retryCount: number
  errorMessage: string | null
}

type MachineEvent =
  | { type: 'START' }
  | { type: 'RETRY' }
  | { type: 'BP_EVENT'; payload: BpbioEvent }
  | { type: 'RESET' }
  | { type: 'DISCONNECT' }

export const bpbioSessionMachine = setup({
  types: {} as {
    context: Context
    events: MachineEvent
    input: {
      client: BpbioClient
      getDeviceKey: () => Promise<string | undefined>
    }
  },
  actions: {
    // Action placeholders for side-effects (âm thanh, điều hướng, lưu data)
    onListeningStart: () => {},
    onMeasuringStart: () => {},
    onMeasurementCompleted: ({ context }: { context: Context }) => {},
    onErrorAlert: ({ event }: { event: MachineEvent }) => {},
    onConnectionError: ({ context }: { context: Context }) => {},
  },
  actors: {
    // Actor chạy Promise để mở kết nối thiết bị Serial
    connector: fromPromise(
      async ({
        input,
      }: {
        input: { client: BpbioClient; getDeviceKey: () => Promise<string | undefined> }
      }) => {
        const deviceKey = await input.getDeviceKey()

        if (!deviceKey) {
          throw new Error(
            'Chưa thiết lập được cổng kết nối tới máy Huyết áp! Vui lòng vào màn hình Test Thiết Bị chạy tính năng Dò cổng để kiểm tra.',
          )
        }

        console.log('[BP_MACHINE] Kết nối cổng BPBIO với deviceKey:', deviceKey)

        await input.client.connect({
          type: 'usb-serial',
          portId: 'bpbio-port',
          deviceKey,
          baudRate: 9600,
        })

        console.log('[BP_MACHINE] Đã CONNECTED thành công')
        return true
      },
    ),

    // Actor callback theo dõi luồng sự kiện Broadcast 64-byte từ máy đo
    eventWatcher: fromCallback(
      ({ sendBack, input }: { sendBack: any; input: { client: BpbioClient } }) => {
        const unsubscribe = input.client.onEvent((event) => {
          console.log('[BP_MACHINE] Nhận event:', event.type)
          sendBack({ type: 'BP_EVENT', payload: event })
        })
        return () => unsubscribe()
      },
    ),
  },
}).createMachine({
  id: 'bpbioSession',
  initial: 'disconnected',
  context: ({ input }) => ({
    client: input.client,
    getDeviceKey: input.getDeviceKey,
    result: null,
    retryCount: 0,
    errorMessage: null,
  }),
  states: {
    disconnected: {
      on: { START: 'connecting' },
    },
    connecting: {
      invoke: {
        src: 'connector',
        input: ({ context }) => ({ client: context.client, getDeviceKey: context.getDeviceKey }),
        onDone: {
          target: 'active',
          actions: assign({ retryCount: 0, errorMessage: null }),
        },
        onError: [
          {
            guard: ({ context }) => context.retryCount < 3,
            target: 'waiting_retry',
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1,
              errorMessage: ({ event }) =>
                (event.error as Error)?.message || 'Lỗi kết nối không xác định',
            }),
          },
          {
            target: 'connection_error',
            actions: assign({
              errorMessage: ({ event }) =>
                (event.error as Error)?.message || 'Lỗi kết nối không xác định',
            }),
          },
        ],
      },
    },
    waiting_retry: {
      after: {
        1000: 'connecting',
      },
    },
    connection_error: {
      entry: ['onConnectionError'],
      on: {
        RETRY: {
          target: 'connecting',
          actions: assign({ retryCount: 0, errorMessage: null }),
        },
      },
    },
    active: {
      // Invoke watcher ở scope cha `active` để duy trì lắng nghe liên tục, không bị ngắt quãng khi chuyển state con.
      invoke: {
        src: 'eventWatcher',
        input: ({ context }) => ({ client: context.client }),
      },
      initial: 'listening',
      states: {
        listening: {
          entry: ['onListeningStart'],
          on: {
            BP_EVENT: [
              {
                guard: ({ event }) => event.payload.type === 'START_MEASUREMENT',
                target: 'measuring',
              },
              {
                // Trường hợp nhận được kết quả hoàn tất trực tiếp
                guard: ({ event }) => event.payload.type === 'MEASUREMENT_COMPLETED',
                target: 'completed',
                actions: assign({
                  result: ({ context }) => context.client.consumeResult(),
                }),
              },
              {
                // Các event lỗi hoặc huỷ
                guard: ({ event }) =>
                  event.payload.type === 'DEVICE_ERROR' || event.payload.type === 'MANUAL_CANCEL',
                target: 'error',
                actions: ({ context }) => context.client.clearPending(),
              },
            ],
          },
        },
        measuring: {
          entry: ['onMeasuringStart'],
          on: {
            BP_EVENT: [
              {
                guard: ({ event }) => event.payload.type === 'MEASUREMENT_COMPLETED',
                target: 'completed',
                actions: assign({
                  result: ({ context }) => context.client.consumeResult(),
                }),
              },
              {
                guard: ({ event }) =>
                  event.payload.type === 'DEVICE_ERROR' || event.payload.type === 'MANUAL_CANCEL',
                target: 'error',
                actions: ({ context }) => context.client.clearPending(),
              },
            ],
            RESET: {
              target: 'listening',
              actions: ({ context }) => {
                context.client.clearPending()
              },
            },
          },
        },
        error: {
          entry: ['onErrorAlert'],
          after: {
            5000: {
              target: 'listening',
              actions: ({ context }) => {
                context.client.clearPending()
              },
            },
          },
          on: {
            RESET: {
              target: 'listening',
              actions: ({ context }) => {
                context.client.clearPending()
              },
            },
          },
        },
        completed: {
          entry: ['onMeasurementCompleted'],
          on: {
            RESET: {
              target: 'listening',
              actions: assign({
                result: null,
              }),
            },
          },
        },
      },
      on: {
        DISCONNECT: {
          target: 'disconnected',
          actions: ({ context }) => {
            context.client.clearPending()
          },
        },
      },
    },
  },
})
