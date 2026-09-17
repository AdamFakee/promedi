import { SvgClockIcon } from '@/shared/components/ui'
import React from 'react'
import { Text, View } from 'react-native'

interface PrivacyCountdownBarProps {
  secondsRemaining: number
}

export function PrivacyCountdownBar({ secondsRemaining }: PrivacyCountdownBarProps) {
  const isWarning = secondsRemaining <= 10
  const progressPercent = (secondsRemaining / 60) * 100

  return (
    <View
      className={`w-full overflow-hidden rounded-2xl border p-4 shadow-sm ${
        isWarning ? 'border-red-400 bg-red-50' : 'border-red-200 bg-red-50/50'
      }`}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <SvgClockIcon size={24} color={isWarning ? '#DC2626' : '#E11D48'} />
          <Text
            className={`font-bold text-lg ${isWarning ? 'text-error-700' : 'text-primary-800'}`}
          >
            Tự động bảo mật dữ liệu phiên khám
          </Text>
        </View>

        <Text
          className={`text-2xl font-black ${
            isWarning ? 'text-error-600 animate-pulse' : 'text-primary-700'
          }`}
        >
          {secondsRemaining}s
        </Text>
      </View>

      {/* Progress bar fill */}
      <View className="h-3 w-full overflow-hidden rounded-full bg-neutral-200">
        <View
          style={{ width: `${progressPercent}%` }}
          className={`h-full rounded-full transition-all duration-300 ${
            isWarning ? 'bg-error-500' : 'bg-primary-600'
          }`}
        />
      </View>

      {isWarning && (
        <Text className="text-error-600 mt-2 text-center font-bold text-sm">
          ⚠️ Màn hình sẽ đóng sau {secondsRemaining}s nữa. Chạm vào màn hình để giữ phiên khám.
        </Text>
      )}
    </View>
  )
}
