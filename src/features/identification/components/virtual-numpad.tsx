import * as Haptics from 'expo-haptics'
import { Delete } from 'lucide-react-native'
import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

interface VirtualNumpadProps {
  onPressDigit: (digit: string) => void
  onPressDelete: () => void
  onPressClear?: () => void
}

export function VirtualNumpad({ onPressDigit, onPressDelete }: VirtualNumpadProps) {
  const handleDigit = (digit: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPressDigit(digit)
  }

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPressDelete()
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <View className="w-full max-w-lg self-center px-4">
      <View className="flex-row flex-wrap justify-between">
        {keys.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => handleDigit(key)}
            activeOpacity={0.7}
            className="active:bg-primary-50 mb-4 h-20 w-[30%] items-center justify-center rounded-2xl bg-surface-100 shadow-sm"
          >
            <Text className="font-bold text-4xl text-neutral-800">{key}</Text>
          </TouchableOpacity>
        ))}

        {/* Hàng cuối: Trắng / 0 / Delete */}
        <View className="h-20 w-[30%]" />

        <TouchableOpacity
          onPress={() => handleDigit('0')}
          activeOpacity={0.7}
          className="active:bg-primary-50 mb-4 h-20 w-[30%] items-center justify-center rounded-2xl bg-surface-100 shadow-sm"
        >
          <Text className="font-bold text-4xl text-neutral-800">0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.7}
          className="bg-error-50 active:bg-error-100 mb-4 h-20 w-[30%] items-center justify-center rounded-2xl shadow-sm"
        >
          <Delete size={36} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  )
}
