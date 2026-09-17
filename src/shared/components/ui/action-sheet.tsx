import { colors } from '@/shared/theme'
import { cn } from '@/shared/utils'
import { X } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { GlobalToast } from './global-toast'
import { useKeyboardHandler } from 'react-native-keyboard-controller'
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IconButton } from './icon-button'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface ActionSheetRef {
  open: () => void
  close: () => void
}

export interface ActionSheetProps {
  /** Title of the action sheet */
  title?: string
  /** Small description under the title */
  subtitle?: string
  /** Array of React elements to show on the left of the title area */
  leftActions?: React.ReactNode[]
  /** Array of React elements to show on the right of the title area */
  rightActions?: React.ReactNode[]
  /** Whether to show the default close button. Default: true */
  showCloseButton?: boolean
  /** Whether backdrop tap closes the sheet. Default: true */
  dismissible?: boolean
  /** Custom children content */
  children?: React.ReactNode
  /** Extra container styles */
  className?: string
  /**
   * Keyboard behavior:
   * 'push-all': Entire modal slides up (default)
   * 'fixed': Only the content moves if you wrap it in KeyboardAvoidingView (selective)
   */
  keyboardBehavior?: 'push-all' | 'fixed'
  /** Optional callback on close */
  onClose?: () => void
  /** React 19 Ref */
  ref?: React.Ref<ActionSheetRef>
}

export const ActionSheet = ({
  title,
  subtitle,
  leftActions,
  rightActions,
  showCloseButton = true,
  dismissible = true,
  children,
  className,
  keyboardBehavior = 'push-all',
  onClose,
  ref,
}: ActionSheetProps) => {
  const [visible, setVisible] = useState(false)
  const insets = useSafeAreaInsets()
  const keyboardHeight = useSharedValue(0)

  useKeyboardHandler({
    onStart: (e) => {
      'worklet'
      keyboardHeight.value = e.height
    },
    onMove: (e) => {
      'worklet'
      keyboardHeight.value = e.height
    },
    onEnd: (e) => {
      'worklet'
      keyboardHeight.value = e.height
    },
  })

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
    close: () => {
      setVisible(false)
      onClose?.()
    },
  }))

  const handleDismiss = () => {
    if (dismissible) {
      setVisible(false)
      onClose?.()
    }
  }

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: keyboardBehavior === 'push-all' ? keyboardHeight.value : 0,
    }
  })

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <AnimatedPressable
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          onPress={handleDismiss}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        />

        {/* Modal Container */}
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(200)}
          style={[containerAnimatedStyle, { paddingBottom: Math.max(insets.bottom, 20) }]}
          className={cn('rounded-t-2xl bg-surface-50 px-4 pb-5 pt-3 shadow-lg', className)}
        >
          {/* Handle bar */}
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-neutral-300" />

          {/* Header */}
          <View className="mb-3.5 flex-row items-center justify-between">
            {/* Left Section */}
            <View className="flex-1 flex-row items-center gap-2.5">
              {leftActions?.map((action, idx) => (
                <React.Fragment key={`left-${idx}`}>{action}</React.Fragment>
              ))}
              {(title || subtitle) && (
                <View className="flex-1">
                  {title && (
                    <Text className="font-bold text-base text-neutral-900" numberOfLines={1}>
                      {title}
                    </Text>
                  )}
                  {subtitle && <Text className="mt-0.5 text-xs text-neutral-500">{subtitle}</Text>}
                </View>
              )}
            </View>

            {/* Right Section */}
            <View className="flex-row items-center gap-2">
              {rightActions?.map((action, idx) => (
                <React.Fragment key={`right-${idx}`}>{action}</React.Fragment>
              ))}
              {showCloseButton && (
                <IconButton
                  icon={X}
                  variant="sm"
                  size={16}
                  color={colors.neutral[500]}
                  className="h-7 w-7 rounded-full bg-neutral-100 active:bg-neutral-200"
                  onPress={() => {
                    setVisible(false)
                    onClose?.()
                  }}
                />
              )}
            </View>
          </View>

          {/* Body Content */}
          <View className="w-full">{children}</View>
        </Animated.View>
      </View>
      <GlobalToast />
    </Modal>
  )
}

ActionSheet.displayName = 'ActionSheet'
