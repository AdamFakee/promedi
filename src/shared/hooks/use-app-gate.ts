import { useAppStore } from '@/features/app/store/use-app-store'
import { useSelector } from '@xstate/react'
import { useRootNavigationState, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'

export const useAppGate = () => {
  const appService = useAppStore((s) => s.appService)
  const stateValue = useSelector(appService ?? undefined, (s: any) => s?.value)
  const router = useRouter()
  const segments = useSegments() as string[]
  const rootNavigationState = useRootNavigationState()

  const segment0 = segments[0]
  const segment1 = segments[1]

  useEffect(() => {
    if (!rootNavigationState?.key) return

    const inKioskGroup = segment0 === '(kiosk)'

    if (stateValue === 'deviceInactive') {
      if (segment1 !== 'device-activation') {
        router.replace('/(auth)/device-activation' as any)
      }
    } else {
      if (!inKioskGroup || !segment0) {
        router.replace('/(kiosk)/idle' as any)
      }
    }
  }, [stateValue, segment0, segment1, rootNavigationState?.key, router])
}
