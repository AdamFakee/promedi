import { colors } from '@/shared/theme'
import { cn } from '@/shared/utils'
import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, TextInput, TextInputProps, View } from 'react-native'

export type InputSize = 'sm' | 'md' | 'lg' | 'xl'

export interface InputProps extends TextInputProps {
  className?: string
  error?: boolean
  size?: InputSize
  isPassword?: boolean
  iconColorActive?: string
  iconColorMuted?: string
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-12 text-sm px-4 rounded-xl',
  md: 'h-14 text-base px-4.5 rounded-xl',
  lg: 'h-16 text-lg px-5 rounded-2xl',
  xl: 'h-20 text-xl px-6 rounded-2xl',
}

export const Input = ({
  className,
  error,
  size = 'sm',
  isPassword = false,
  secureTextEntry,
  iconColorActive = colors.info.default,
  iconColorMuted = colors.secondary,
  ...props
}: InputProps) => {
  const [showPassword, setShowPassword] = useState(false)

  const isSecure = isPassword ? !showPassword : (secureTextEntry ?? false)

  if (isPassword) {
    return (
      <View
        className={cn(
          'flex-row items-center border border-slate-300 bg-slate-50 pr-3.5',
          sizeStyles[size],
          error ? 'border-rose-500 bg-rose-50' : null,
          className,
        )}
      >
        <TextInput
          {...props}
          secureTextEntry={isSecure}
          className="h-full flex-1 p-0 font-semibold text-slate-900"
          placeholderClassName="text-slate-400 font-normal"
        />
        <Pressable
          onPress={() => setShowPassword((prev) => !prev)}
          className="ml-1 p-1"
          hitSlop={8}
        >
          {showPassword ? (
            <Eye size={20} color={iconColorActive} />
          ) : (
            <EyeOff size={20} color={iconColorMuted} />
          )}
        </Pressable>
      </View>
    )
  }

  return (
    <TextInput
      {...props}
      secureTextEntry={secureTextEntry}
      className={cn(
        'border border-slate-300 bg-slate-50 font-semibold text-slate-900 focus:border-sky-600 focus:bg-white',
        sizeStyles[size],
        error ? 'border-rose-500 bg-rose-50' : null,
        className,
      )}
      placeholderClassName="text-slate-400 font-normal"
    />
  )
}
