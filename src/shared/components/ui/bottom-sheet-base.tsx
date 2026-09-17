import { colors } from '@/shared/theme'
import { cn } from '@/shared/utils'
import { X } from 'lucide-react-native'
import React, { useImperativeHandle, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IconButton } from './icon-button'

export interface BottomSheetBaseRef {
  open: () => void
  close: () => void
}

export interface BottomSheetBaseProps {
  /** Callback triggered when the bottom sheet is closed */
  onClose?: () => void
  /** Inner content of the bottom sheet */
  children: React.ReactNode
  /** Custom Tailwind classes for the bottom sheet container */
  className?: string
  /** Whether clicking the backdrop triggers close. Default: true */
  dismissible?: boolean
  /** Whether to show a close icon button in the top right. Default: false */
  showCloseButton?: boolean
}

export const BottomSheetBase = React.forwardRef<BottomSheetBaseRef, BottomSheetBaseProps>(
  ({ onClose, children, className, dismissible = true, showCloseButton = false }, ref) => {
    const insets = useSafeAreaInsets()
    const [modalVisible, setModalVisible] = useState(false)

    const close = () => {
      setModalVisible(false)
      onClose?.()
    }

    useImperativeHandle(ref, () => ({
      open: () => setModalVisible(true),
      close,
    }))

    const handleDismiss = () => {
      if (dismissible) close()
    }

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleDismiss}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleDismiss} />

          <View
            className={cn('relative rounded-t-3xl bg-white p-6', className)}
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-neutral-200" />
            </View>

            {showCloseButton && (
              <View className="absolute right-4 top-4 z-10">
                <IconButton icon={X} variant="sm" color={colors.neutral[400]} onPress={close} />
              </View>
            )}

            {children}
          </View>
        </View>
      </Modal>
    )
  },
)

BottomSheetBase.displayName = 'BottomSheetBase'
export default BottomSheetBase
