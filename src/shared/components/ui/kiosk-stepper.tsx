import { cn } from '@/shared/utils'
import React, { type ReactNode } from 'react'
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'

/** Rich definition for a step in the Kiosk Stepper */
export interface KioskStepItem {
  id?: string
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

export type StepInput = string | KioskStepItem

export type StepperVariant = 'pill' | 'card'

export interface KioskStepperProps {
  /** Index của bước đang kích hoạt (0-indexed) */
  currentStep?: number
  /** Danh sách tên hoặc chi tiết các bước */
  steps?: StepInput[]
  /** Biến thể hiển thị ('pill' | 'card') */
  variant?: StepperVariant
  /** Cho phép bấm chuyển bước (Mặc định: true) */
  interactive?: boolean
  /** Sự kiện khi bấm chọn bước */
  onStepPress?: (stepIndex: number) => void
  /** ClassName bổ sung cho container */
  className?: string
  /** Style bổ sung */
  style?: StyleProp<ViewStyle>
}

const DEFAULT_STEPS: KioskStepItem[] = [
  { label: 'Đo Huyết Áp' },
  { label: 'Đo Chỉ Số Cơ Thể' },
  { label: 'Kết Quả' },
]

function normalizeStep(step: string | KioskStepItem): KioskStepItem {
  if (typeof step === 'string') {
    return { label: step }
  }
  return step
}

export const KioskStepper = ({
  currentStep = 0,
  steps = DEFAULT_STEPS,
  interactive = true,
  onStepPress,
  className,
  style,
}: KioskStepperProps) => {
  const normalizedSteps = steps.map(normalizeStep)

  return (
    <View
      className={cn(
        'h-14 w-full flex-row items-center justify-between rounded-2xl border border-red-100 bg-white/95',
        className,
      )}
      style={style}
    >
      {normalizedSteps.map((step, index) => {
        const isActive = index === currentStep
        const isDisabled = Boolean(step.disabled)

        return (
          <React.Fragment key={step.id || index}>
            {/* Step Item Button */}
            <Pressable
              onPress={() => {
                if (!isDisabled && onStepPress && interactive) {
                  onStepPress(index)
                }
              }}
              disabled={isDisabled}
              className={cn(
                'h-full flex-1 flex-row items-center justify-center rounded-xl px-4',
                isActive ? 'bg-primary' : 'bg-transparent',
                isDisabled && !isActive && 'opacity-50',
              )}
            >
              <Text
                numberOfLines={1}
                className={cn(
                  'text-center text-base tracking-tight',
                  isActive ? 'font-black text-white' : 'font-bold text-slate-600',
                )}
              >
                {step.label}
              </Text>
            </Pressable>

            {/* Separator Chevron */}
            {index < normalizedSteps.length - 1 && (
              <View className="items-center justify-center px-1">
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18L15 12L9 6"
                    stroke={isActive ? '#DC2626' : '#CBD5E1'}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            )}
          </React.Fragment>
        )
      })}
    </View>
  )
}
