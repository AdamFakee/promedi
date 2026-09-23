import {
  ActivationForm,
  useActivateDevice,
  type ActivateDeviceFormData,
} from '@/features/activation'
import { SvgBMULogo, WaveBackground } from '@/shared/components/ui'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DeviceActivationRoute() {
  const { mutate: activateDevice, isPending } = useActivateDevice()

  const handleFormSubmit = (data: ActivateDeviceFormData) => {
    activateDevice(data)
  }

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

      {/* 2. Wave Background Layer (Positioned behind content at same layer as gradient) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <WaveBackground
          strokeColor="rgba(220, 38, 38, 0.16)"
          lineCount={95}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* 3. Foreground Content */}
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with BMU Logo and Light Background Contrast */}
          <View className="mb-4 items-center pt-2">
            <View className="mb-3 flex-row items-center gap-2.5 rounded-2xl border border-red-200 bg-white/80 px-5 py-2.5 shadow-sm">
              <SvgBMULogo size={32} withText={true} />
            </View>
            <Text className="text-center text-3xl font-black uppercase tracking-tight text-slate-900">
              KÍCH HOẠT THIẾT BỊ
            </Text>
          </View>

          {/* Form Container */}
          <View className="my-auto py-2">
            <ActivationForm onSubmit={handleFormSubmit} isLoading={isPending} />
          </View>

          {/* Footer Bar */}
          <View className="items-center border-t border-white/20 pt-4">
            <Text className="text-center font-medium text-xs text-white/90">
              Công ty CP Đầu tư và Công nghệ GHD • Bệnh viện Đại học Y Dược Buôn Ma Thuột (BMU)
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
