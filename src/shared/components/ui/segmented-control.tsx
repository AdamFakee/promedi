import { cn } from '@/shared/utils'
import React from 'react'
import { Pressable, Text, View } from 'react-native'

export interface SegmentedControlOption<T> {
  label: string
  value: T
  icon?: React.ReactNode
}

interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[]
  value?: T
  onChange: (value: T) => void
  className?: string
  textClassName?: string
  itemClassName?: string
}

export function SegmentedControl<T>({
  options,
  value,
  onChange,
  className,
  textClassName,
  itemClassName,
}: SegmentedControlProps<T>) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-2.5 rounded-2xl border border-slate-200/60 bg-slate-100/90',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-2 rounded-xl px-3 py-3 transition-all',
              isActive
                ? 'border border-primary bg-primary'
                : 'border border-slate-200/80 bg-white active:bg-slate-50',
              itemClassName,
            )}
          >
            {option.icon}
            <Text
              className={cn(
                'text-center font-bold text-sm',
                isActive ? 'font-black text-white' : 'text-slate-700',
                textClassName,
              )}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
