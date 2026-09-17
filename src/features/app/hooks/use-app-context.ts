import type { DeviceInfo } from '@/shared/types'
import { useSelector } from '@xstate/react'
import { useAppStore } from '../store/use-app-store'
import type { AppContext } from '../types/app.types'

const DEFAULT_CONTEXT: AppContext = {
  device: null,
  accessToken: null,
  error: null,
}

export const useAppContext = (): AppContext => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s: any) => s?.context) ?? DEFAULT_CONTEXT
}

export const useDevice = (): AppContext['device'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s: any) => s?.context?.device ?? null)
}

export const useAccessToken = (): AppContext['accessToken'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s: any) => s?.context?.accessToken ?? null)
}
