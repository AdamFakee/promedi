// TODO: Import từ '@/features/auth' khi module auth được triển khai
// import { getDeviceContextFetcher, getMeFetcher, refreshTokenFetcher } from '@/features/auth'

import type { Employee } from '@/shared/types'
import { storage } from '@/shared/lib/storage'
import { AxiosError } from 'axios'
import { assign, fromPromise, setup } from 'xstate'
import type { AppContext, AppEvent } from '../types/app.types'

// Mock tạm thời khi chưa triển khai module auth
const refreshTokenFetcher = async (_token: string) => ({
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
})
const getMeFetcher = async (): Promise<Employee> => ({
  id: 'mock-user-id',
  code: 'EMP-01',
  fullName: 'Mock Employee',
  permissions: [],
})
const getDeviceContextFetcher = async () => ({
  deviceId: 'mock-device-id',
  deviceCode: 'DEV-01',
  deviceName: 'Kiosk K2 Mini',
  warehouseId: 'WH-01',
  isActive: true,
})

const REFRESH_TOKEN_KEY = 'auth-refresh-token'

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false
  if (!error.response) return true
  return false
}

const DEFAULT_CONTEXT: AppContext = {
  device: null,
  accessToken: null,
  employee: null,
  error: null,
}

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    input: {} as {
      device?: AppContext['device']
      accessToken?: AppContext['accessToken']
      employee?: AppContext['employee']
    },
  },
  actions: {
    saveDevice: assign(({ event }) => {
      if (event.type !== 'DEVICE_ACTIVATED') return {}
      return { device: event.device, error: null }
    }),
    saveAuth: assign(({ event }) => {
      if (event.type !== 'LOGIN_SUCCESS') return {}
      return {
        accessToken: event.accessToken,
        employee: event.employee,
        device: event.device,
        error: null,
      }
    }),
    clearAuth: assign(() => {
      try {
        storage.remove(REFRESH_TOKEN_KEY)
      } catch {}
      return {
        accessToken: null,
        employee: null,
      }
    }),
    resetDevice: assign(() => {
      try {
        storage.remove(REFRESH_TOKEN_KEY)
      } catch {}
      return DEFAULT_CONTEXT
    }),
  },
  actors: {
    refreshAuthFlow: fromPromise(
      async ({
        input,
      }: {
        input: {
          deviceId: string
          refreshToken: string | null
          onTokenRotated: (newToken: string) => void
        }
      }) => {
        if (!input.refreshToken) {
          throw new Error('No refresh token — Login required')
        }

        const { accessToken, refreshToken: newRefreshToken } = await refreshTokenFetcher(
          input.refreshToken,
        )
        input.onTokenRotated(newRefreshToken)

        const employee = await getMeFetcher()

        let device = null
        try {
          const deviceContext = await getDeviceContextFetcher()
          if (!deviceContext.isActive) {
            const err = new Error('DEVICE_INACTIVE')
            ;(err as any).code = 'DEVICE_INACTIVE'
            throw err
          }
          device = {
            id: deviceContext.deviceId,
            deviceCode: deviceContext.deviceCode,
            deviceName: deviceContext.deviceName,
            warehouseId: deviceContext.warehouseId,
            isActive: deviceContext.isActive,
          }
        } catch (e: any) {
          if (e?.code === 'DEVICE_INACTIVE') throw e
        }

        return { accessToken, employee, device }
      },
    ),

    revalidateAuthFlow: fromPromise(async ({ input }: { input: { deviceId: string } }) => {
      const deviceContext = await getDeviceContextFetcher()
      if (!deviceContext.isActive) {
        const err = new Error('DEVICE_INACTIVE')
        ;(err as any).code = 'DEVICE_INACTIVE'
        throw err
      }
      return {
        device: {
          id: deviceContext.deviceId,
          deviceCode: deviceContext.deviceCode,
          deviceName: deviceContext.deviceName,
          warehouseId: deviceContext.warehouseId,
          isActive: deviceContext.isActive,
        },
      }
    }),
  },
  guards: {
    hasDevice: ({ context }) => context.device !== null,
    isNetworkError: ({ event }) => isNetworkError((event as any).error),
    isDeviceInactive: ({ event }) => (event as any).error?.code === 'DEVICE_INACTIVE',
    hasCachedAuth: ({ context }) => context.accessToken !== null && context.employee !== null,
  },
}).createMachine({
  id: 'app',
  initial: 'initializing',
  context: ({ input }) => ({
    ...DEFAULT_CONTEXT,
    device: input?.device ?? null,
    accessToken: input?.accessToken ?? null,
    employee: input?.employee ?? null,
  }),
  on: {
    ACCESS_TOKEN_REFRESHED: {
      actions: assign({
        accessToken: ({ event }) => event.accessToken,
      }),
    },
  },
  states: {
    initializing: {
      always: [
        { guard: 'hasDevice', target: 'refreshingAuth' as const },
        { target: 'deviceInactive' as const },
      ],
    },

    refreshingAuth: {
      invoke: {
        src: 'refreshAuthFlow',
        input: ({ context }) => ({
          deviceId: context.device?.id ?? '',
          refreshToken: storage.getString(REFRESH_TOKEN_KEY) ?? null,
          onTokenRotated: (newToken: string) => {
            try {
              storage.set(REFRESH_TOKEN_KEY, newToken)
            } catch {}
          },
        }),
        onDone: {
          target: 'authenticated' as const,
          actions: assign({
            accessToken: ({ event }) => event.output.accessToken,
            employee: ({ event }) => event.output.employee,
            device: ({ event, context }) => event.output.device ?? context.device,
          }),
        },
        onError: [
          {
            guard: 'isDeviceInactive',
            target: 'deviceInactive' as const,
          },
          {
            guard: 'isNetworkError',
            target: 'restoreOffline' as const,
          },
          {
            target: 'unauthenticated' as const,
            actions: 'clearAuth',
          },
        ],
      },
    },

    restoreOffline: {
      always: [
        { guard: 'hasCachedAuth', target: 'authenticated' as const },
        { target: 'unauthenticated' as const },
      ],
    },

    deviceInactive: {
      on: {
        DEVICE_ACTIVATED: {
          target: 'unauthenticated' as const,
          actions: 'saveDevice',
        },
      },
    },

    unauthenticated: {
      on: {
        LOGIN_SUCCESS: {
          target: 'revalidatingAuth' as const,
          actions: 'saveAuth',
        },
        DEVICE_RESET: {
          target: 'deviceInactive' as const,
          actions: 'resetDevice',
        },
      },
    },

    revalidatingAuth: {
      invoke: {
        src: 'revalidateAuthFlow',
        input: ({ context }) => ({ deviceId: context.device?.id ?? '' }),
        onDone: {
          target: 'authenticated' as const,
          actions: assign({
            device: ({ event, context }) => event.output.device ?? context.device,
          }),
        },
        onError: [
          {
            guard: 'isDeviceInactive',
            target: 'deviceInactive' as const,
          },
          {
            target: 'authenticated' as const,
          },
        ],
      },
    },

    authenticated: {
      on: {
        LOGGED_OUT: {
          target: 'unauthenticated' as const,
          actions: 'clearAuth',
        },
        TOKEN_EXPIRED: {
          target: 'unauthenticated' as const,
          actions: 'clearAuth',
        },
        NETWORK_RESTORED: {
          target: 'refreshingAuth' as const,
        },
      },
    },
  },
})
