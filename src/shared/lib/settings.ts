/**
 * C72 Settings store — persist qua MMKV (react-native-mmkv).
 *
 * Lưu cấu hình UHF: power, session, Q, region, và profiles theo khu vực.
 * Mỗi lần thay đổi → persist ngay → lần sau mở app tự khôi phục.
 *
 * Dùng Zustand + persist middleware với MMKV Storage.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { zustandStorage } from '@/shared/lib/storage'

export interface ActiveModules {
  uhfScan: boolean
  locate: boolean
  radar: boolean
  ledTag: boolean
  readWrite: boolean
  lockKill: boolean
  advancedOps: boolean
  hfCard: boolean
  barcode: boolean
  printer: boolean
  ble: boolean
  gps: boolean
  firmware: boolean
}

export interface UHFProfile {
  id: string
  name: string
  power: number
  session: 0 | 1 | 2 | 3
  qValue: number
  freqMode: number
}

export interface SettingsState {
  // ── UHF Config ─────────────────────────────────────────────────────────
  power: number
  session: 0 | 1 | 2 | 3
  qValue: number
  freqMode: number
  autoStopEnabled: boolean
  autoStopWindowMs: number
  lowBatteryThreshold: number

  // ── Active Modules ─────────────────────────────────────────────────────
  activeModules: ActiveModules

  // ── Profiles ───────────────────────────────────────────────────────────
  profiles: UHFProfile[]
  activeProfileId: string | null

  // ── Actions ────────────────────────────────────────────────────────────
  setPower: (p: number) => void
  setSession: (s: 0 | 1 | 2 | 3) => void
  setQValue: (q: number) => void
  setAutoStop: (enabled: boolean) => void
  setLowBatteryThreshold: (pct: number) => void
  toggleModule: (key: keyof ActiveModules) => void
  saveProfile: (name: string) => void
  loadProfile: (id: string) => void
  deleteProfile: (id: string) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      power: 27,
      session: 0,
      qValue: 4,
      freqMode: 2, // CN920 default
      autoStopEnabled: false,
      autoStopWindowMs: 3000,
      lowBatteryThreshold: 15,

      activeModules: {
        uhfScan: true,
        locate: true,
        radar: false,
        ledTag: true,
        readWrite: true,
        lockKill: false,
        advancedOps: false,
        hfCard: false,
        barcode: true,
        printer: false,
        ble: false,
        gps: false,
        firmware: false,
      },

      profiles: [],
      activeProfileId: null,

      setPower: (power) => set({ power }),
      setSession: (session) => set({ session }),
      setQValue: (qValue) => set({ qValue }),
      setAutoStop: (autoStopEnabled) => set({ autoStopEnabled }),
      setLowBatteryThreshold: (lowBatteryThreshold) => set({ lowBatteryThreshold }),

      toggleModule: (key) =>
        set((state) => ({
          activeModules: {
            ...state.activeModules,
            [key]: !state.activeModules[key],
          },
        })),

      saveProfile: (name) => {
        const { power, session, qValue, freqMode, profiles } = get()
        const id = `profile-${Date.now()}`
        set({
          profiles: [
            ...profiles,
            { id, name, power, session: session as 0 | 1 | 2 | 3, qValue, freqMode },
          ],
          activeProfileId: id,
        })
      },

      loadProfile: (id) => {
        const profile = get().profiles.find((p) => p.id === id)
        if (!profile) return
        set({
          power: profile.power,
          session: profile.session,
          qValue: profile.qValue,
          freqMode: profile.freqMode,
          activeProfileId: id,
        })
      },

      deleteProfile: (id) => {
        const profiles_ = get().profiles.filter((p) => p.id !== id)
        set({
          profiles: profiles_,
          activeProfileId: get().activeProfileId === id ? null : get().activeProfileId,
        })
      },
    }),
    {
      name: 'c72-settings',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
)
