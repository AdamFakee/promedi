import { useHealthSession, useVoiceGuidance, voicePlayerService } from '@/core'
import {
  BpInstruction,
  InBodyInstruction,
  ResultSummary,
  useBpMeasurement,
  useInBodyMeasurement,
} from '@/features/measure'
import {
  KioskCountdownTimer,
  KioskHeader,
  KioskStepper,
  WaveBackground,
} from '@/shared/components/ui'
import { useAppNavigation } from '@/shared/hooks'
import { useIsFocused } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const STEP_DURATIONS: Record<number, number> = {
  0: 60, // Bước 0: Huyết áp (60s)
  1: 90, // Bước 1: InBody (90s)
  2: 90, // Bước 2: Bảng kết quả (90s)
}

export default function KioskMeasureRoute() {
  const isFocused = useIsFocused()
  const { replaceTo } = useAppNavigation()
  const { state, resetSession } = useHealthSession()
  const [overrideStep, setOverrideStep] = React.useState<number | null>(null)

  const activeMeasureStep =
    state === 'measureBp' ? 0 : state === 'measureInBody' ? 1 : state === 'summary' ? 2 : null

  const currentStep = overrideStep ?? activeMeasureStep ?? 0
  const isMeasuringActive = isFocused && activeMeasureStep !== null

  // Automatically trigger Voice Guidance prompt only when active on measurement screen and not in idle
  useVoiceGuidance({
    currentStep: activeMeasureStep !== null ? currentStep : undefined,
    enabled: isMeasuringActive,
  })

  // Khởi tạo logic đo Huyết áp khi ở Step 0 VÀ state thực sự là measureBp
  const bpState = useBpMeasurement(isFocused && currentStep === 0 && state === 'measureBp')

  // Khởi tạo logic đo InBody khi ở Step 1 VÀ state thực sự là measureInBody
  const inbodyState = useInBodyMeasurement(
    isFocused && currentStep === 1 && state === 'measureInBody',
  )

  // Kiểm tra trạng thái đang đo để tạm dừng bộ đếm (Chỉ dừng ở step 0 và step 1, step 2 không dừng)
  const isMeasuring =
    (currentStep === 0 && bpState.status === 'measuring') ||
    (currentStep === 1 && inbodyState.status === 'measuring')

  // Bộ đếm đếm ngược độc lập cho từng step
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(
    STEP_DURATIONS[currentStep] ?? 60,
  )

  // Reset bộ đếm khi chuyển step
  React.useEffect(() => {
    setSecondsRemaining(STEP_DURATIONS[currentStep] ?? 60)
  }, [currentStep])

  // Xử lý khi hết thời gian đếm ngược
  const handleTimeout = React.useCallback(() => {
    voicePlayerService.stop()
    if (currentStep === 2) {
      voicePlayerService.speak('SESSION_TERMINATED')
    }
    resetSession()
    replaceTo('HOME')
  }, [currentStep, resetSession, replaceTo])

  // Quản lý interval đếm ngược với cleanup kiểm soát isFocused và isMounted
  React.useEffect(() => {
    if (!isFocused) return
    if (isMeasuring) return

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [isFocused, currentStep, isMeasuring, handleTimeout])

  return (
    <View className="relative flex-1 bg-white">
      {/* 1. Base Gradient Background */}
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF', '#FFF1F1', '#FEE2E2', '#800000']}
        locations={[0, 0.35, 0.65, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. Wave Background (Positioned behind content at same layer as gradient) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <WaveBackground
          strokeColor="rgba(220, 38, 38, 0.16)"
          lineCount={95}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* 3. Foreground Content */}
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-between gap-2 py-4">
          {/* 1. Concave Arc Header (Logo BMU | ProMedi GHD) */}
          <KioskHeader />

          {/* 2. Stepper Ribbon (Trắng Đỏ) */}
          <View className="px-4">
            <KioskStepper
              currentStep={currentStep}
              onStepPress={(stepIdx) => setOverrideStep(stepIdx)}
            />
          </View>

          {/* 3. Dynamic Measurement Instruction Area */}
          <View className="w-full flex-1 overflow-hidden px-2">
            {currentStep === 0 ? (
              <BpInstruction status={bpState.status} />
            ) : currentStep === 1 ? (
              <InBodyInstruction
                status={inbodyState.status}
                progress={inbodyState.progress}
                errorCode={inbodyState.errorCode}
              />
            ) : (
              <ResultSummary />
            )}
          </View>

          {/* 4. FSM Bound Countdown Control Bar (No Buttons, Clean Timer Only) - Ẩn khi đang đo */}
          {!isMeasuring && (
            <View className="w-full items-center justify-center px-4">
              <KioskCountdownTimer
                secondsRemaining={secondsRemaining}
                totalSeconds={STEP_DURATIONS[currentStep] ?? 60}
                currentStep={currentStep}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  )
}
