import { Button, Container, KioskHeader, WaveBackground } from '@/shared/components/ui'
import { useAppNavigation, useAppParams, useKioskAdminGesture } from '@/shared/hooks'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HardwareErrorScreen() {
  const { replaceTo } = useAppNavigation()
  const { error, device } = useAppParams('KIOSK_HARDWARE_ERROR')
  const [showDetails, setShowDetails] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(30)

  const deviceName =
    device === 'bpbio'
      ? 'Máy đo Huyết áp'
      : device === 'inbody'
        ? 'Máy đo InBody'
        : 'Thiết bị ngoại vi'

  const toggleDetails = () => {
    setShowDetails((prev) => !prev)
  }

  // Tự động đếm ngược về màn Home sau 30s
  React.useEffect(() => {
    if (secondsRemaining <= 0) {
      replaceTo('HOME')
      return
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsRemaining, replaceTo])

  // Kiosk Admin Gesture: Chạm 3 ngón tay, 3 lần liên tiếp vào màn hình để show lỗi kỹ thuật
  const tripleThreeFingerTap = useKioskAdminGesture(toggleDetails)

  return (
    <GestureDetector gesture={tripleThreeFingerTap}>
      <View className="relative flex-1 bg-white">
        <LinearGradient
          colors={['#FFFFFF', '#FFFFFF', '#FFF1F1', '#FEE2E2', '#800000']}
          locations={[0, 0.35, 0.65, 0.88, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <WaveBackground strokeColor="rgba(220, 38, 38, 0.16)" />
        </View>

        <SafeAreaView className="flex-1">
          <KioskHeader />

          <View className="flex-1 items-center justify-center px-10">
            <Container shadow centered className="w-full max-w-2xl px-8 py-12">
              <Text className="mb-4 font-bold text-3xl text-error-default">LỖI KẾT NỐI</Text>

              <Text className="mb-8 text-center text-xl text-neutral-800">
                Không thể kết nối với {deviceName}.{'\n'}Vui lòng kiểm tra lại cáp hoặc gọi kỹ
                thuật.
              </Text>

              {showDetails && (
                <View className="mb-8 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <Text className="font-mono text-sm text-neutral-600">
                    {error || 'Không rõ nguyên nhân'}
                  </Text>
                </View>
              )}

              <View className="w-full flex-row gap-4">
                <Button
                  label={`Trở Về (${secondsRemaining}s)`}
                  size="lg"
                  variant="primary"
                  className="flex-1"
                  onPress={() => replaceTo('HOME')}
                />
              </View>
            </Container>
          </View>
        </SafeAreaView>
      </View>
    </GestureDetector>
  )
}
