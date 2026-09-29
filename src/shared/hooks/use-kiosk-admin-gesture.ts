import { useMemo } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

export function useKioskAdminGesture(onTrigger: () => void) {
  // Sử dụng useMemo để Gesture object ổn định
  const gesture = useMemo(() => {
    return Gesture.Tap()
      .numberOfTaps(3)
      .minPointers(3)
      .onEnd(() => {
        runOnJS(onTrigger)()
      })
  }, [onTrigger])

  return gesture
}
