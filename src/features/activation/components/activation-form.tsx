import { Button } from '@/shared/components/ui'
import React, { useState } from 'react'
import { Text, TextInput, View } from 'react-native'

interface ActivationFormProps {
  onSubmit: (code: string) => void
  isLoading?: boolean
}

export function ActivationForm({ onSubmit, isLoading }: ActivationFormProps) {
  const [code, setCode] = useState('PROMEDI-KIOSK-01')

  const handleSubmit = () => {
    if (!code.trim()) return
    onSubmit(code.trim())
  }

  return (
    <View className="w-full max-w-xl self-center rounded-3xl bg-white p-8 shadow-xl">
      <Text className="mb-2 text-center font-bold text-3xl text-neutral-900">
        Kích Hoạt Thiết Bị Kiosk
      </Text>
      <Text className="mb-8 text-center text-lg text-neutral-500">
        Nhập mã kích hoạt cơ sở y tế được cấp để mở khóa Kiosk
      </Text>

      <Text className="mb-2 font-semibold text-base text-neutral-700">Mã kích hoạt Kiosk</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="VD: PROMEDI-KIOSK-01"
        className="mb-8 h-16 rounded-2xl border-2 border-neutral-200 bg-surface-50 px-6 font-bold text-2xl text-neutral-900"
        autoCapitalize="characters"
        editable={!isLoading}
      />

      <Button
        label="KÍCH HOẠT THIẾT BỊ"
        variant="primary"
        size="lg"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={!code.trim() || isLoading}
      />
    </View>
  )
}
