import { SvgDeleteIcon } from '@/shared/components/ui'
import * as Haptics from 'expo-haptics'
import React, { memo } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface VirtualNumpadProps {
  onPressDigit: (digit: string) => void
  onPressDelete: () => void
  onPressClear?: () => void
}

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export const VirtualNumpad = memo(function VirtualNumpad({
  onPressDigit,
  onPressDelete,
}: VirtualNumpadProps) {
  const handleDigit = (digit: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onPressDigit(digit)
  }

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    onPressDelete()
  }

  return (
    <View className="w-full self-center">
      <View className="flex-row flex-wrap justify-between">
        {NUMPAD_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => handleDigit(key)}
            activeOpacity={0.7}
            className="mb-3 h-16 w-[31%] items-center justify-center rounded-2xl border border-slate-200/50 bg-slate-100/90 shadow-sm active:bg-red-50"
          >
            <Text className="text-3xl font-extrabold text-slate-800">{key}</Text>
          </TouchableOpacity>
        ))}

        {/* Bottom row: Blank / 0 / Delete */}
        <View className="h-16 w-[31%]" />

        <TouchableOpacity
          onPress={() => handleDigit('0')}
          activeOpacity={0.7}
          className="mb-3 h-16 w-[31%] items-center justify-center rounded-2xl border border-slate-200/50 bg-slate-100/90 shadow-sm active:bg-red-50"
        >
          <Text className="text-3xl font-extrabold text-slate-800">0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.7}
          className="mb-3 h-16 w-[31%] items-center justify-center rounded-2xl border border-red-200/60 bg-red-50 shadow-sm active:bg-red-100"
        >
          <SvgDeleteIcon size={26} />
        </TouchableOpacity>
      </View>
    </View>
  )
})

VirtualNumpad.displayName = 'VirtualNumpad'
