import { storage } from '@/shared/lib/storage'
import { ActorRefFrom, createActor } from 'xstate'
import { create } from 'zustand'
import { appMachine } from '../machines/app.machine'
import type { AppContext } from '../types/app.types'

const STORAGE_KEY = 'app-machine-persist'
const REFRESH_TOKEN_KEY = 'auth-refresh-token'

interface PersistedAppState {
  device: AppContext['device']
  accessToken: AppContext['accessToken']
}

function loadFromStorage(): PersistedAppState {
  try {
    const raw = storage.getString(STORAGE_KEY)
    if (!raw)
      return {
        device: null,
        accessToken: null,
      }
    return JSON.parse(raw) as PersistedAppState
  } catch {
    return {
      device: null,
      accessToken: null,
    }
  }
}

function loadRefreshToken(): string | null {
  try {
    return storage.getString(REFRESH_TOKEN_KEY) ?? null
  } catch {
    return null
  }
}

function saveRefreshToken(token: string) {
  try {
    storage.set(REFRESH_TOKEN_KEY, token)
  } catch {}
}

function clearRefreshToken() {
  try {
    storage.remove(REFRESH_TOKEN_KEY)
  } catch {}
}

function saveToStorage(ctx: AppContext) {
  try {
    const toSave: PersistedAppState = {
      device: ctx.device,
      accessToken: ctx.accessToken,
    }
    storage.set(STORAGE_KEY, JSON.stringify(toSave))
  } catch {}
}

interface AppStoreState {
  appService: ActorRefFrom<typeof appMachine> | null
  initApp: () => void
  destroyApp: () => void
  getRefreshToken: () => string | null
  saveRefreshToken: (token: string) => void
  clearRefreshToken: () => void
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  appService: null,

  getRefreshToken: () => loadRefreshToken(),
  saveRefreshToken: (token: string) => saveRefreshToken(token),
  clearRefreshToken: () => clearRefreshToken(),

  initApp: () => {
    if (get().appService) return

    const persisted = loadFromStorage()

    const service = createActor(appMachine, {
      input: {
        device: persisted.device,
        accessToken: persisted.accessToken,
      },
    }).start()

    service.subscribe((state) => {
      saveToStorage(state.context)
    })

    set({ appService: service })
  },

  destroyApp: () => {
    const service = get().appService
    if (service) {
      service.stop()
      set({ appService: null })
    }
  },
}))
