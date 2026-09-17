import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Portal } from '@gorhom/portal'
import { colors } from '@/shared/theme'
import { Toast, useAlertStore } from '@/shared/store'
import { SvgAlertTriangleIcon, SvgCheckCircleIcon, SvgXCircleIcon } from './svg-icons'

const TOAST_CONFIG = {
  success: {
    icon: SvgCheckCircleIcon,
    accentColor: colors.success.default,
    bgColor: colors.success.container,
    borderColor: '#a7f3d0',
    titleColor: '#065f46',
    messageColor: '#047857',
  },
  error: {
    icon: SvgXCircleIcon,
    accentColor: colors.error.default,
    bgColor: colors.error.container,
    borderColor: '#fecaca',
    titleColor: '#991b1b',
    messageColor: '#b91c1c',
  },
  warning: {
    icon: SvgAlertTriangleIcon,
    accentColor: colors.warning.default,
    bgColor: colors.warning.container,
    borderColor: '#fde68a',
    titleColor: '#92400e',
    messageColor: '#b45309',
  },
  info: {
    icon: SvgAlertTriangleIcon,
    accentColor: colors.info.default,
    bgColor: colors.info.container,
    borderColor: '#bfdbfe',
    titleColor: '#1e40af',
    messageColor: '#1d4ed8',
  },
}

interface ToastItemProps {
  toast: Toast
}

const ToastItem = ({ toast }: ToastItemProps) => {
  const hideToast = useAlertStore((s) => s.hideToast)
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info
  const IconComponent = config.icon

  // Animation values
  const translateY = useRef(new Animated.Value(-40)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Slide in + Fade in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start()
  }, [translateY, opacity])

  const handleDismiss = () => {
    // Slide out + Fade out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -30,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast(toast.id)
    })
  }

  const handleAction = () => {
    handleDismiss()
    toast.onAction?.()
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderLeftColor: config.accentColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {/* Icon Indicator */}
      <View style={styles.iconContainer}>
        <IconComponent size={22} color={config.accentColor} />
      </View>

      {/* Text Content */}
      <View style={styles.textContainer}>
        <Text style={styles.titleText} numberOfLines={1}>
          {toast.title}
        </Text>

        <Text style={styles.messageText} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>

      {/* Optional Action Button */}
      {toast.actionLabel ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleAction}
          style={[styles.actionButton, { backgroundColor: `${config.accentColor}15` }]}
        >
          <Text style={[styles.actionText, { color: config.accentColor }]}>
            {toast.actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  )
}

/**
 * Component render danh sách Toasts nổi ở góc trên màn hình.
 * Render qua Portal từ @gorhom/portal
 */
export const GlobalToast = () => {
  const insets = useSafeAreaInsets()
  const toasts = useAlertStore((s) => s.toasts)

  return (
    <Portal>
      {toasts.length > 0 ? (
        <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 16 }]}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} />
          ))}
        </View>
      ) : null}
    </Portal>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 320,
    minWidth: 260,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface[50],
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.outline.default,
    borderRightColor: colors.outline.default,
    borderBottomColor: colors.outline.default,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#0F0F0F',
    marginBottom: 2,
  },
  messageText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    color: colors.text.secondary,
  },
  actionButton: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
})
