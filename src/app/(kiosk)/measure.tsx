import { useHealthSession, useVoiceGuidance } from '@/core'
import { BpInstruction, InBodyInstruction, ResultSummary } from '@/features/measure'
import {
  KioskCountdownTimer,
  KioskHeader,
  KioskStepper,
  WaveBackground,
} from '@/shared/components/ui'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function KioskMeasureRoute() {
  const { state, context } = useHealthSession()
  const [overrideStep, setOverrideStep] = React.useState<number | null>(null)

  const currentStep = overrideStep ?? (state === 'measureInBody' ? 1 : state === 'summary' ? 2 : 0)

  // Automatically trigger Voice Guidance prompt when navigating/stepping through measurement workflow
  useVoiceGuidance({ currentStep })

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
              <BpInstruction />
            ) : currentStep === 1 ? (
              <InBodyInstruction />
            ) : (
              <ResultSummary />
            )}
          </View>

          {/* 4. FSM Bound Countdown Control Bar (No Buttons, Clean Timer Only) */}
          <View className="w-full items-center justify-center px-4">
            <KioskCountdownTimer
              secondsRemaining={context.secondsRemaining}
              currentStep={currentStep}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}
