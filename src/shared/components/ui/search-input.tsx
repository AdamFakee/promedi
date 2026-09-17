import React, { useState } from 'react'
import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { Search, X } from 'lucide-react-native'
import { colors } from '@/shared/theme'

export interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  containerClassName?: string
  containerStyle?: StyleProp<ViewStyle>
  onClear?: () => void
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm...',
  containerClassName = '',
  containerStyle,
  onClear,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = () => {
    onChangeText('')
    onClear?.()
  }

  const handleFocus = (e: any) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: any) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  return (
    <View
      style={containerStyle}
      className={`h-11 flex-row items-center rounded-2xl border bg-white px-3.5 shadow-sm transition-all ${
        isFocused ? 'border-red-500 bg-white ring-1 ring-red-200' : 'border-slate-200 bg-white'
      } ${containerClassName}`}
    >
      {/* Search Icon */}
      <Search
        size={18}
        color={isFocused ? colors.primary.default : '#94A3B8'}
        style={{ marginRight: 10 }}
      />

      {/* Input Field */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        onFocus={handleFocus}
        onBlur={handleBlur}
        textAlignVertical="center"
        className="m-0 h-full flex-1 p-0 font-semibold text-xs text-slate-900"
        style={{ includeFontPadding: false }}
        {...props}
      />

      {/* Clear Button */}
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-slate-200"
        >
          <X size={12} color="#475569" />
        </TouchableOpacity>
      )}
    </View>
  )
}
