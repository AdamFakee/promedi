import type { Employee, PermissionValue } from '@/shared/types'
import { useSelector } from '@xstate/react'
import { useAppStore } from '../store/use-app-store'
import type { AppContext } from '../types/app.types'

const DEFAULT_CONTEXT: AppContext = {
  device: null,
  accessToken: null,
  employee: null,
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

export const useEmployee = (): AppContext['employee'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s: any) => s?.context?.employee ?? null)
}

export const useAccessToken = (): AppContext['accessToken'] => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(appService ?? undefined, (s: any) => s?.context?.accessToken ?? null)
}

/** Check quyền sử dụng PermissionValue type chuẩn */
export const useHasPermission = (permission: PermissionValue): boolean => {
  const appService = useAppStore((s) => s.appService)
  return useSelector(
    appService ?? undefined,
    (s: any) => s?.context?.employee?.permissions?.includes(permission) ?? false,
  )
}

/** Pure helper function check quyền không qua hook */
export const hasPermission = (employee: Employee | null, permission: PermissionValue): boolean => {
  return employee?.permissions?.includes(permission) ?? false
}
