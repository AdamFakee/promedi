import { LAYOUT } from '@/shared/constants'
import { colors as themeColors } from '@/shared/theme'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { isValidElement, ReactNode } from 'react'
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgChevronLeftIcon } from './svg-icons'

type IconType = ImageSourcePropType | ReactNode | React.ComponentType<any>

/**
 * Props for the AppHeader component.
 */
interface AppHeaderProps {
  /**
   * Title displayed in the center of the header.
   */
  title?: string
  /**
   * Subtitle displayed below the title.
   */
  subtitle?: string
  /**
   * Visual variant of the header:
   * - 'gradient': Uses the primary gradient background (default).
   * - 'white': Uses a solid white background.
   */
  variant?: 'gradient' | 'white'
  /**
   * Custom handler for the left (back) button press.
   * If not provided, it defaults to `router.back()`.
   */
  onLeftPress?: () => void
  /**
   * Icon to display on the right side.
   * Can be an ImageSource, ReactNode, or custom SVG Component.
   */
  rightIcon?: IconType
  /**
   * Custom right ReactNode element (e.g. action button).
   */
  rightElement?: ReactNode
  /**
   * Handler for the right icon press.
   */
  onRightPress?: () => void
  /**
   * Whether to show the left (back) button.
   * Defaults to `true`.
   */
  showLeftButton?: boolean
  /**
   * Custom title text color class or string.
   */
  titleClassName?: string
  /**
   * Custom icon color.
   */
  iconColor?: string
  /**
   * Custom colors for the gradient variant.
   * Defaults to `themeColors.background.headerGradient`.
   */
  colors?: readonly [string, string, ...string[]]
  /**
   * Whether to show a bottom border.
   * Defaults to `false`.
   */
  showBorderBottom?: boolean
  /**
   * Color of the bottom border.
   * Defaults to `themeColors.outline.default`.
   */
  borderBottomColor?: string
}

/**
 * A reusable header component with support for Gradient and White variants.
 * Handles safe area, back navigation, and optional right actions.
 */
export const AppHeader = ({
  title,
  subtitle,
  variant = 'gradient',
  onLeftPress,
  rightIcon,
  rightElement,
  onRightPress,
  showLeftButton = true,
  titleClassName,
  iconColor,
  colors,
  showBorderBottom = false,
  borderBottomColor = themeColors.outline.default,
}: AppHeaderProps) => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isGradient = variant === 'gradient'

  const defaultColors = [
    themeColors.background.headerGradient.start,
    themeColors.background.headerGradient.end,
  ] as const

  const handleLeftPress = () => {
    if (onLeftPress) {
      onLeftPress()
    } else {
      if (router.canGoBack()) {
        router.back()
      }
    }
  }

  const textColorClass = isGradient ? 'text-white' : titleClassName || 'text-slate-900 font-bold'
  const subtitleColorClass = isGradient ? 'text-white/80' : 'text-slate-500 font-medium'
  const resolvedIconColor = iconColor || (isGradient ? themeColors.text.primary.white : '#334155')

  const renderRightIcon = () => {
    if (rightElement) return rightElement
    if (!rightIcon) return null

    if (isValidElement(rightIcon)) {
      return rightIcon
    }

    if (typeof rightIcon === 'function' || typeof rightIcon === 'object') {
      const Icon = rightIcon as React.ComponentType<any>
      return <Icon size={20} color={resolvedIconColor} />
    }

    return (
      <Image
        source={rightIcon as ImageSourcePropType}
        className="h-5 w-5"
        style={{ tintColor: resolvedIconColor }}
        resizeMode="contain"
      />
    )
  }

  const Content = (
    <View
      className="w-full flex-row items-center justify-between px-4"
      style={{
        paddingTop: insets.top,
        height: LAYOUT.headerHeight + insets.top / 2,
      }}
    >
      {/* Left Section: Back Button */}
      <View className="w-16 items-start">
        {showLeftButton && (
          <Pressable
            onPress={handleLeftPress}
            className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-100"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <SvgChevronLeftIcon size={20} color={resolvedIconColor} />
          </Pressable>
        )}
      </View>

      {/* Center Section: Title & Subtitle */}
      <View className="flex-1 items-center justify-center">
        {title && (
          <Text className={`text-center text-base ${textColorClass}`} numberOfLines={1}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text className={`text-center text-xs ${subtitleColorClass}`} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Section: Action Element / Icon */}
      <View className="w-16 items-end">
        {rightElement ? (
          rightElement
        ) : rightIcon ? (
          <Pressable
            onPress={onRightPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            {renderRightIcon()}
          </Pressable>
        ) : null}
      </View>
    </View>
  )

  if (isGradient) {
    return (
      <LinearGradient
        colors={colors || defaultColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[showBorderBottom && { borderBottomWidth: 1, borderBottomColor }]}
      >
        {Content}
      </LinearGradient>
    )
  }

  return (
    <View
      style={[
        { backgroundColor: themeColors.background.white },
        showBorderBottom && { borderBottomWidth: 1, borderBottomColor },
      ]}
    >
      {Content}
    </View>
  )
}
