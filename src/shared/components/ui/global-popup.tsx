import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useAlertStore } from '@/shared/store'
import { Button } from './button'
import { Popup, PopupRef } from './popup'

/**
 * Component hiển thị thông báo Global (Popup Confirm / Popup Info)
 * Đặt tại Root của ứng dụng
 */
export const GlobalPopup = () => {
  const { visible, type, title, message, isConfirm, confirmText, cancelText, onConfirm, onCancel } =
    useAlertStore()
  const popupRef = useRef<PopupRef>(null)

  useEffect(() => {
    if (visible && isConfirm) {
      popupRef.current?.open()
    } else {
      popupRef.current?.close()
    }
  }, [visible, isConfirm])

  if (!isConfirm && visible) return null

  return (
    <Popup ref={popupRef} type={type} title={title} description={message} dismissible={false}>
      <View className="mt-2 flex-row gap-3">
        {onCancel ? (
          <Button
            label={cancelText || 'Bỏ qua'}
            onPress={onCancel}
            variant="secondary"
            className="flex-1"
          />
        ) : null}
        <Button
          label={confirmText || 'Xác nhận'}
          onPress={onConfirm}
          variant="primary"
          className="flex-1"
        />
      </View>
    </Popup>
  )
}
