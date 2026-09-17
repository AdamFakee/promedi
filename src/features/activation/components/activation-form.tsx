import { Button, ControlledInput } from '@/shared/components/ui'
import { valibotResolver } from '@hookform/resolvers/valibot'
import React from 'react'
import { useForm } from 'react-hook-form'
import { View } from 'react-native'
import { activateDeviceSchema, type ActivateDeviceFormData } from '../validations'

interface ActivationFormProps {
  onSubmit: (data: ActivateDeviceFormData) => void
  isLoading?: boolean
}

export function ActivationForm({ onSubmit, isLoading }: ActivationFormProps) {
  const { control, handleSubmit } = useForm<ActivateDeviceFormData>({
    resolver: valibotResolver(activateDeviceSchema),
    defaultValues: {
      deviceCode: '',
      activationToken: '',
    },
  })

  return (
    <View className="w-full max-w-xl self-center overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl">
      <View className="p-8">
        {/* Inputs */}
        <View className="gap-2">
          <ControlledInput
            control={control}
            name="deviceCode"
            label="Mã Thiết Bị"
            placeholder="VD: 5401"
            size="lg"
            editable={!isLoading}
            autoCapitalize="characters"
          />

          <ControlledInput
            control={control}
            name="activationToken"
            label="Mã Kích Hoạt"
            placeholder="VD: 218202601"
            size="lg"
            keyboardType="number-pad"
            editable={!isLoading}
          />
        </View>

        {/* Submit Button */}
        <Button
          label="Xác Nhận"
          variant="primary"
          size="lg"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          className="mt-6"
        />
      </View>
    </View>
  )
}
