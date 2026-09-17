import { useAppStore } from '@/features/app/store/use-app-store'
import i18n from '@/shared/lib/i18n'
import { useEffect } from 'react'
import { appSettings, useConnectionStore } from '../store'

/**
 * Hook khởi tạo ứng dụng ở tầng core.
 */
export const useAppInit = () => {
  useEffect(() => {
    // 1. Init App FSM Actor
    useAppStore.getState().initApp()

    // 2. Language setting
    const savedLanguage = appSettings.get('language')
    if (i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage)
    }

    // 3. Network listeners
    const cleanupConnection = useConnectionStore.getState().initListeners()

    return () => {
      cleanupConnection()
    }
  }, [])
}
