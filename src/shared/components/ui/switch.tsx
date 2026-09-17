import { colors } from '@/shared/theme'
import { cn } from '@/shared/utils'
import React, { memo } from 'react'
import { Switch as RNSwitch, type SwitchProps as RNSwitchProps, Text, View } from 'react-native'

export interface SwitchProps extends RNSwitchProps {
  className?: string
}

export const Switch = memo(function Switch({
  trackColor,
  thumbColor,
  className,
  ...props
}: SwitchProps) {
  return (
    <RNSwitch
      trackColor={trackColor || { false: colors.outline.default, true: colors.primary.default }}
      thumbColor={thumbColor || colors.surface[50]}
      {...props}
    />
  )
})

export interface SwitchRowProps {
  label: string
  description?: string
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  showBorderBottom?: boolean
  className?: string
}

export const SwitchRow = memo(function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  showBorderBottom = false,
  className,
}: SwitchRowProps) {
  return (
    <View
      className={cn(
        'flex-row items-center justify-between py-2.5',
        showBorderBottom && 'border-b border-outline-variant',
        disabled && 'opacity-50',
        className,
      )}
    >
      <View className="flex-1 pr-3">
        <Text className="font-medium text-xs text-neutral-800">{label}</Text>
        {description && <Text className="mt-0.5 text-[11px] text-neutral-500">{description}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  )
})
