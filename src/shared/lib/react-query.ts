import { QUERY_PRESETS } from '@/shared/configs'
import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager, QueryClient, UseMutationOptions } from '@tanstack/react-query'
import { AppStateStatus, Platform } from 'react-native'
import { ApiError } from './axios'

export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> = Awaited<
  ReturnType<FnType>
>

export type QueryConfig<TQueryOptionsFn extends (...args: any[]) => any> = Omit<
  ReturnType<TQueryOptionsFn>,
  'queryKey' | 'queryFn'
>

export type MutationConfig<TMutationFn extends (...args: any) => Promise<any>> = UseMutationOptions<
  ApiFnReturnType<TMutationFn>,
  ApiError,
  Parameters<TMutationFn>[0]
>

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: QUERY_PRESETS.DEFAULT,
    mutations: {
      retry: false,
    },
  },
})

export function setupReactQueryMobile() {
  // Auto refetch on network reconnect
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected)
    })
  })
}

export function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active')
  }
}
