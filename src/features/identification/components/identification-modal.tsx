import {
  Button,
  ControlledInput,
  IconButton,
  ModalBase,
  SvgBMULogo,
  SvgCloseIcon,
} from '@/shared/components/ui'
import { valibotResolver } from '@hookform/resolvers/valibot'
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import {
  identificationFormSchema,
  type IdentificationFormData,
} from '../validations/identification.schema'
import { VirtualNumpad } from './virtual-numpad'

export interface IdentificationModalRef {
  open: () => void
  close: () => void
}

interface IdentificationModalProps {
  onSubmit: (data: IdentificationFormData) => void
  isLoading?: boolean
}

export const IdentificationModal = forwardRef<IdentificationModalRef, IdentificationModalProps>(
  ({ onSubmit, isLoading }, ref) => {
    const [visible, setVisible] = useState(false)

    useImperativeHandle(ref, () => ({
      open: () => setVisible(true),
      close: () => setVisible(false),
    }))

    const { control, handleSubmit, setValue, getValues, reset } = useForm<IdentificationFormData>({
      resolver: valibotResolver(identificationFormSchema),
      mode: 'onSubmit',
      defaultValues: {
        fullName: '',
        identityCode: '',
      },
    })

    const handleClose = useCallback(() => {
      setVisible(false)
      reset()
    }, [reset])

    const handlePressDigit = useCallback(
      (digit: string) => {
        const current = getValues('identityCode') || ''
        if (current.length < 12) {
          setValue('identityCode', current + digit, {
            shouldValidate: false,
            shouldDirty: true,
            shouldTouch: true,
          })
        }
      },
      [getValues, setValue],
    )

    const handlePressDelete = useCallback(() => {
      const current = getValues('identityCode') || ''
      if (current.length > 0) {
        setValue('identityCode', current.slice(0, -1), {
          shouldValidate: false,
          shouldDirty: true,
          shouldTouch: true,
        })
      }
    }, [getValues, setValue])

    return (
      <ModalBase
        visible={visible}
        onClose={handleClose}
        size="default"
        className="max-w-xl self-center overflow-hidden rounded-3xl border border-red-100 bg-white p-0 shadow-2xl"
      >
        <View className="p-6">
          {/* Header Bar */}
          <View className="mb-4 flex-row items-center justify-between border-b border-slate-100 pb-3">
            <View className="flex-row items-center gap-2">
              <SvgBMULogo size={34} withText={true} />
            </View>

            <IconButton
              icon={SvgCloseIcon}
              onPress={handleClose}
              variant="md"
              className="bg-slate-100"
            />
          </View>

          {/* Title */}
          <Text className="mb-4 text-center text-2xl font-black uppercase tracking-tight text-slate-900">
            Nhập thông tin cá nhân
          </Text>

          {/* Form Inputs */}
          <View className="mb-3 gap-3">
            <ControlledInput
              control={control}
              name="fullName"
              label="Họ và tên"
              placeholder="Nhập họ và tên"
              required={true}
              size="lg"
              editable={!isLoading}
              autoCapitalize="words"
            />

            <ControlledInput
              control={control}
              name="identityCode"
              label="Số CCCD"
              placeholder="Nhập số căn cước công dân"
              required={true}
              size="lg"
              keyboardType="number-pad"
              editable={!isLoading}
            />
          </View>

          {/* Integrated Numpad */}
          <View className="my-2">
            <VirtualNumpad onPressDigit={handlePressDigit} onPressDelete={handlePressDelete} />
          </View>

          {/* Submit Action Button */}
          <Button
            label="Bắt đầu kiểm tra sức khỏe"
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            className="mt-3 w-full"
          />
        </View>
      </ModalBase>
    )
  },
)

IdentificationModal.displayName = 'IdentificationModal'
