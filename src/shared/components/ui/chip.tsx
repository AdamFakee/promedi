import { cn } from '@/shared/utils'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

export interface ChipProps {
  label: string
  icon?: React.ReactNode
  count?: number
  active?: boolean
  onPress?: () => void
  className?: string
  textClassName?: string
  disabled?: boolean
  variant?: 'pill' | 'rounded'
}

export const Chip = ({
  label,
  icon,
  count,
  active = false,
  onPress,
  className,
  textClassName,
  disabled,
  variant = 'rounded',
}: ChipProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'flex-row items-center border transition-all',
        variant === 'pill' ? 'rounded-full px-4 py-2' : 'rounded-xl px-3.5 py-2',
        active
          ? 'border-primary bg-primary'
          : 'border-outline-default bg-surface-100 active:bg-surface-200',
        disabled && 'opacity-50',
        className,
      )}
    >
      {icon && <View className="mr-1.5">{icon}</View>}
      <Text
        className={cn(
          'font-bold text-xs',
          active ? 'text-primary-on' : 'text-neutral-700',
          textClassName,
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View
          className={cn('ml-2 rounded-full px-2 py-0.5')}
          style={{
            backgroundColor: active ? 'rgba(255, 255, 255, 0.3)' : 'rgba(70, 69, 85, 0.15)',
          }}
        >
          <Text
            className={cn(
              'font-bold text-[11px]',
              active ? 'text-primary-on' : 'text-surface-on-variant',
            )}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
