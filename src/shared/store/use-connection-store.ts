import NetInfo from '@react-native-community/netinfo'
import { create } from 'zustand'

interface ConnectionState {
  isOnline: boolean
  initListeners: () => () => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isOnline: true,
  initListeners: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({ isOnline: !!state.isConnected })
    })

    return unsubscribe
  },
}))
