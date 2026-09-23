import { colors } from '@/shared/theme'
import { cn } from '@/shared/utils'
import React from 'react'
import { Pressable, PressableProps, Text, View } from 'react-native'
import { LoadingIndicator } from './loading'

type IconType = React.ComponentType<any>

interface ButtonProps extends PressableProps {
  label: string
  variant?: 'primary' | 'outline' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  className?: string
  textClassName?: string
  leftIcon?: IconType
  rightIcon?: IconType
  iconSize?: number
}

const variantStyles = {
  primary: 'bg-primary border-primary',
  secondary: 'bg-background-secondary border-outline-default',
  outline: 'bg-background-white border-primary',
  destructive: 'bg-error-default border-error-default',
}

const sizeStyles = {
  sm: 'h-10 px-4 rounded-xl border',
  md: 'h-12 px-6 rounded-full border',
  lg: 'h-14 px-8 rounded-full border',
  xl: 'h-16 px-10 rounded-full border-2',
}

const textSizeStyles = {
  sm: 'text-xs font-bold',
  md: 'text-sm font-semibold',
  lg: 'text-base font-bold',
  xl: 'text-lg font-black uppercase tracking-wider',
}

const defaultIconSizes = {
  sm: 16,
  md: 20,
  lg: 22,
  xl: 26,
}

export const Button = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  textClassName,
  disabled,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconSize,
  style,
  ...props
}: ButtonProps) => {
  const iconColor =
    variant === 'primary' || variant === 'destructive'
      ? colors.text.primary.white
      : variant === 'secondary'
        ? colors.neutral[800]
        : colors.primary.default

  const resolvedIconSize = iconSize ?? defaultIconSizes[size]

  return (
    <Pressable
      disabled={disabled}
      className={cn(
        // Base flex layout
        'flex-row items-center justify-center',
        // Size preset
        sizeStyles[size],
        // Variants
        variantStyles[variant],
        // Disabled/Loading state
        disabled && 'opacity-50',
        className,
      )}
      style={(state) =>
        [
          { opacity: state.pressed && !disabled ? 0.8 : disabled ? 0.5 : 1 },
          typeof style === 'function' ? style(state) : style,
        ] as any
      }
      {...props}
    >
      {loading ? (
        <LoadingIndicator color={iconColor} />
      ) : (
        <>
          {LeftIcon && (
            <View className="mr-1.5">
              <LeftIcon size={resolvedIconSize} color={iconColor} />
            </View>
          )}
          <Text
            className={cn(
              'text-center',
              textSizeStyles[size],
              variant === 'primary' || variant === 'destructive'
                ? 'text-text-primary-white'
                : variant === 'secondary'
                  ? 'text-neutral-800'
                  : 'text-primary',
              textClassName,
            )}
          >
            {label}
          </Text>
          {RightIcon && (
            <View className="ml-1.5">
              <RightIcon size={resolvedIconSize} color={iconColor} />
            </View>
          )}
        </>
      )}
    </Pressable>
  )
}
