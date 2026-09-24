/**
 * XState v5 State Machine quản lý phiên đo huyết áp BPBIO750.
 *
 * Chức năng:
 * - Quản lý các trạng thái phiên đo: `disconnected` ➔ `connecting` ➔ `ready` ➔ `collectingResult` ➔ `completed` / `deviceError`.
 * - Tích hợp Timeout thu thập 2000ms (`after: 2000`): Tự động phát hiện lỗi sai tư thế / cử động tay ngắt đo giữa chừng để chuyển `deviceError`.
 *
 * @module src/core/hardware/bpbio/machine/bpbio-session.machine.ts
 */

import { setup, assign, fromCallback } from 'xstate'
import type { BpbioClient } from '../client/bpbio-client'
import type { BloodPressureResult } from '../types/bpbio.types'

interface Context {
  client: BpbioClient
  result: BloodPressureResult | null
  collectStartedAt: number | null
}

export const bpbioSessionMachine = setup({
  types: {} as {
    context: Context
    events:
      | { type: 'CONNECT' }
      | { type: 'CONNECTED' }
      | { type: 'ERROR' }
      | { type: 'START' }
      | { type: 'FRAME_RECEIVED' }
      | { type: 'RESET' }
    input: {
      client: BpbioClient
    }
  },
  actors: {
    // Actor callback theo dõi gói dữ liệu trả về từ BpbioClient
    frameWatcher: fromCallback(
      ({ sendBack, input }: { sendBack: any; input: { client: BpbioClient } }) => {
        return input.client.onFrame(() => sendBack({ type: 'FRAME_RECEIVED' }))
      },
    ),
  },
}).createMachine({
  id: 'bpbioSession',
  initial: 'disconnected',
  context: ({ input }) => ({
    client: input.client,
    result: null,
    collectStartedAt: null,
  }),
  states: {
    disconnected: {
      on: { CONNECT: 'connecting' },
    },
    connecting: {
      on: {
        CONNECTED: 'ready',
        ERROR: 'disconnected',
      },
    },
    ready: {
      on: {
        START: {
          target: 'collectingResult',
          actions: ({ context }) => {
            // Gửi lệnh yêu cầu rút kết quả đo
            context.client.requestResult().catch(() => {})
          },
        },
      },
    },
    collectingResult: {
      entry: assign({ collectStartedAt: () => Date.now() }),
      invoke: {
        src: 'frameWatcher',
        input: ({ context }) => ({ client: context.client }),
      },
      on: {
        FRAME_RECEIVED: {
          // Chỉ chuyển completed khi đã gom đủ cả 3 gói S, D, P
          guard: ({ context }) => context.client.isResultComplete(),
          target: 'completed',
          actions: assign({
            result: ({ context }) => context.client.consumeResult(),
          }),
        },
      },
      // Timeout 2000ms: Nếu di chuyển tay/sai tư thế khiến máy ngắt đo không đủ 3 gói -> Chuyển deviceError
      after: {
        2000: {
          target: 'deviceError',
          actions: ({ context }) => {
            context.client.clearPending()
          },
        },
      },
    },
    deviceError: {
      entry: ({ context }) => context.client.clearPending(),
      always: 'ready',
    },
    completed: {
      on: { RESET: 'ready' },
    },
  },
})
