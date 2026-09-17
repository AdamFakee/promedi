import { storage } from '@/shared/lib/storage'
import { AxiosError } from 'axios'
import { assign, fromPromise, setup } from 'xstate'
import type { AppContext, AppEvent } from '../types/app.types'

const REFRESH_TOKEN_KEY = 'auth-refresh-token'

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false
  if (!error.response) return true
  return false
}

export const refreshTokenFetcher = async (refreshToken: string) => {
  return {
    accessToken: `refreshed-access-token-${Date.now()}`,
    refreshToken: refreshToken,
  }
}

const DEFAULT_CONTEXT: AppContext = {
  device: null,
  accessToken: null,
  error: null,
}

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    input: {} as {
      device?: AppContext['device']
      accessToken?: AppContext['accessToken']
    },
  },
  actors: {
    refreshTokenFlow: fromPromise(
      async ({
        input,
      }: {
        input: {
          deviceId: string
          refreshToken?: string | null
          fetcher?: (token: string) => Promise<{ accessToken: string; refreshToken?: string }>
        }
      }) => {
        const token = input.refreshToken ?? storage.getString(REFRESH_TOKEN_KEY) ?? null
        if (!token) {
          throw new Error('NO_REFRESH_TOKEN')
        }

        const fetcherFn = input.fetcher ?? refreshTokenFetcher
        const result = await fetcherFn(token)

        if (result.refreshToken) {
          try {
            storage.set(REFRESH_TOKEN_KEY, result.refreshToken)
          } catch {}
        }

        return { accessToken: result.accessToken }
      },
    ),
  },
  actions: {
    saveDevice: assign(({ event }) => {
      if (event.type !== 'DEVICE_ACTIVATED') return {}
      if (event.refreshToken) {
        try {
          storage.set(REFRESH_TOKEN_KEY, event.refreshToken)
        } catch {}
      }
      return {
        device: event.device,
        accessToken: event.accessToken ?? null,
        error: null,
      }
    }),
    resetDevice: assign(() => {
      try {
        storage.remove(REFRESH_TOKEN_KEY)
      } catch {}
      return DEFAULT_CONTEXT
    }),
  },
  guards: {
    hasDevice: ({ context }) => context.device !== null,
    isNetworkError: ({ event }) => isNetworkError((event as any).error),
    isDeviceInactive: ({ event }) => (event as any).error?.code === 'DEVICE_INACTIVE',
  },
}).createMachine({
  id: 'app',
  initial: 'initializing',
  context: ({ input }) => ({
    ...DEFAULT_CONTEXT,
    device: input?.device ?? null,
    accessToken: input?.accessToken ?? null,
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
        { guard: 'hasDevice', target: 'refreshingToken' as const },
        { target: 'deviceInactive' as const },
      ],
    },

    refreshingToken: {
      invoke: {
        src: 'refreshTokenFlow',
        input: ({ context }) => ({
          deviceId: context.device?.id ?? '',
        }),
        onDone: {
          target: 'authenticated' as const,
          actions: assign({
            accessToken: ({ event }) => event.output.accessToken,
          }),
        },
        onError: [
          {
            guard: 'isDeviceInactive',
            target: 'deviceInactive' as const,
            actions: 'resetDevice',
          },
          {
            guard: 'isNetworkError',
            target: 'authenticated' as const,
          },
          {
            target: 'deviceInactive' as const,
            actions: 'resetDevice',
          },
        ],
      },
    },

    deviceInactive: {
      on: {
        DEVICE_ACTIVATED: {
          target: 'authenticated' as const,
          actions: 'saveDevice',
        },
      },
    },

    authenticated: {
      on: {
        DEVICE_RESET: {
          target: 'deviceInactive' as const,
          actions: 'resetDevice',
        },
        DEVICE_ACTIVATED: {
          actions: 'saveDevice',
        },
        REFRESH_TOKEN: {
          target: 'refreshingToken' as const,
        },
        NETWORK_RESTORED: {
          target: 'refreshingToken' as const,
        },
      },
    },
  },
})
