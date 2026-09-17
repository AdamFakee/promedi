import { cn } from '@/shared/utils'
import React from 'react'
import { Pressable, PressableProps, View, ViewProps } from 'react-native'

export interface CardProps extends ViewProps {
  className?: string
  onPress?: PressableProps['onPress']
}

export const Card = ({ children, className, onPress, ...props }: CardProps) => {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm', className)}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        {...props}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View
      className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm', className)}
      {...props}
    >
      {children}
    </View>
  )
}
