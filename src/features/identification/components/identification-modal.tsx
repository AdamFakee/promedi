import {
  Button,
  ControlledInput,
  IconButton,
  InputError,
  ModalBase,
  SegmentedControl,
  SvgBMULogo,
  SvgCloseIcon,
} from '@/shared/components/ui'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { valibotResolver } from '@hookform/resolvers/valibot'
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import {
  identificationFormSchema,
  type IdentificationFormData,
} from '../validations/identification.schema'

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

    const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
    } = useForm<IdentificationFormData>({
      resolver: valibotResolver(identificationFormSchema),
      mode: 'onSubmit',
      defaultValues: {
        fullName: '',
        identityCode: '',
        age: '',
        gender: undefined,
      },
    })

    // Animation rung lắc nhẹ cho phần chọn Giới tính khi chưa chọn lúc Submit
    const genderShakeX = useSharedValue(0)

    const triggerGenderShake = useCallback(() => {
      genderShakeX.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      )
    }, [genderShakeX])

    const genderAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: genderShakeX.value }],
    }))

    const handleClose = useCallback(() => {
      setVisible(false)
      reset()
    }, [reset])

    const onFormInvalid = useCallback(
      (formErrors: FieldErrors<IdentificationFormData>) => {
        if (formErrors.gender) {
          triggerGenderShake()
        }
      },
      [triggerGenderShake],
    )

    return (
      <ModalBase
        visible={visible}
        onClose={handleClose}
        size="default"
        className="max-w-xl self-center overflow-hidden rounded-3xl border border-red-100 bg-white p-0"
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
              name="age"
              label="Số tuổi"
              placeholder="Nhập số tuổi"
              required={true}
              size="lg"
              keyboardType="number-pad"
              maxLength={3}
              editable={!isLoading}
            />

            {/* Gender Selection: Nam / Nữ bằng Base Component SegmentedControl có hiệu ứng rung lắc khi chưa chọn */}
            <Animated.View style={genderAnimatedStyle} className="gap-1.5">
              <Text className="font-bold text-sm text-slate-800">
                Giới tính <Text className="text-primary">*</Text>
              </Text>
              <Controller
                control={control}
                name="gender"
                render={({ field: { value, onChange } }) => (
                  <SegmentedControl
                    options={[
                      {
                        label: 'NAM',
                        value: 'M' as const,
                        icon: (
                          <MaterialCommunityIcons
                            name="gender-male"
                            size={22}
                            color={value === 'M' ? '#FFFFFF' : '#64748B'}
                          />
                        ),
                      },
                      {
                        label: 'NỮ',
                        value: 'F' as const,
                        icon: (
                          <MaterialCommunityIcons
                            name="gender-female"
                            size={22}
                            color={value === 'F' ? '#FFFFFF' : '#64748B'}
                          />
                        ),
                      },
                    ]}
                    value={value}
                    onChange={onChange}
                    className="rounded-2xl border-0 border-none bg-transparent"
                    textClassName="text-base font-black tracking-wider"
                  />
                )}
              />
              {errors.gender?.message && <InputError message={errors.gender.message} />}
            </Animated.View>

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

          {/* Submit Action Button */}
          <Button
            label="Bắt đầu kiểm tra sức khỏe"
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit, onFormInvalid)}
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
