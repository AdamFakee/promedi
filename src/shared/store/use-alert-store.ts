import { create } from 'zustand'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: AlertType
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface AlertState {
  // Confirm/Info Dialog State
  visible: boolean
  type: AlertType
  title: string
  message: string
  isConfirm: boolean
  popupType: 'confirm' | 'info' | null
  confirmText: string
  cancelText: string
  onConfirm?: () => void
  onCancel?: () => void

  // Toasts State
  toasts: Toast[]

  // Easy Loading State
  isLoading: boolean
  loadingMessage?: string

  /**
   * Hiển thị thông báo (Toast) - Tự động biến mất
   */
  show: (params: {
    type?: AlertType
    title: string
    message: string
    duration?: number
    actionLabel?: string
    onAction?: () => void
  }) => void
  /**
   * Ẩn một Toast cụ thể
   */
  hideToast: (id: string) => void
  /**
   * Hiển thị hộp thoại xác nhận (Confirm Dialog - 2 nút)
   */
  confirm: (params: {
    title: string
    message: string
    type?: AlertType
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  /**
   * Hiển thị hộp thoại thông tin (Info Popup Dialog - Nút bấm tùy chỉnh)
   */
  infoPopup: (params: {
    title: string
    message: string
    type?: AlertType
    confirmText?: string
    onConfirm?: () => void
  }) => void
  /**
   * Đóng hộp thoại
   */
  hide: () => void
  /** EasyLoading: hiển thị spinner toàn màn hình */
  showLoading: (message?: string) => void
  /** EasyLoading: ẩn spinner */
  hideLoading: () => void
}

export const useAlertStore = create<AlertState>((set, get) => ({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  isConfirm: false,
  popupType: null,
  confirmText: 'Xác nhận',
  cancelText: 'Bỏ qua',
  onConfirm: undefined,
  onCancel: undefined,
  toasts: [],
  isLoading: false,
  loadingMessage: undefined,

  show: ({ type = 'info', title, message, duration = 5000, actionLabel, onAction }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = { id, type, title, message, actionLabel, onAction }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id)
      }, duration)
    }
  },

  hideToast: (id: string) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  confirm: ({
    title,
    message,
    type = 'warning',
    confirmText = 'Xác nhận',
    cancelText = 'Bỏ qua',
    onConfirm,
    onCancel,
  }) =>
    set({
      visible: true,
      type,
      title,
      message,
      isConfirm: true,
      popupType: 'confirm',
      confirmText,
      cancelText,
      onConfirm: () => {
        set({ visible: false })
        onConfirm()
      },
      onCancel: () => {
        set({ visible: false })
        onCancel?.()
      },
    }),

  infoPopup: ({ title, message, type = 'info', confirmText = 'Xác nhận', onConfirm }) =>
    set({
      visible: true,
      type,
      title,
      message,
      isConfirm: true,
      popupType: 'info',
      confirmText,
      cancelText: 'Đóng',
      onConfirm: () => {
        set({ visible: false })
        onConfirm?.()
      },
      onCancel: undefined,
    }),

  hide: () => set({ visible: false }),

  showLoading: (message?: string) => set({ isLoading: true, loadingMessage: message }),
  hideLoading: () => set({ isLoading: false, loadingMessage: undefined }),
}))

/**
 * Utility giống GetX: toast.error('lỗi'), toast.success('xong')
 * Có thể gọi ở bất cứ đâu (.ts, .tsx, api, flows...)
 */
export const toast = {
  error: (
    message: string,
    title = 'Lỗi hệ thống',
    options?: { actionLabel?: string; onAction?: () => void; duration?: number },
  ) =>
    useAlertStore.getState().show({
      type: 'error',
      title,
      message,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
      duration: options?.duration,
    }),
  success: (
    message: string,
    title = 'Thành công',
    options?: { actionLabel?: string; onAction?: () => void; duration?: number },
  ) =>
    useAlertStore.getState().show({
      type: 'success',
      title,
      message,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
      duration: options?.duration,
    }),
  warning: (
    message: string,
    title = 'Cảnh báo',
    options?: { actionLabel?: string; onAction?: () => void; duration?: number },
  ) =>
    useAlertStore.getState().show({
      type: 'warning',
      title,
      message,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
      duration: options?.duration,
    }),
  info: (
    message: string,
    title = 'Thông báo',
    options?: { actionLabel?: string; onAction?: () => void; duration?: number },
  ) =>
    useAlertStore.getState().show({
      type: 'info',
      title,
      message,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
      duration: options?.duration,
    }),
  confirm: (params: {
    title: string
    message: string
    type?: AlertType
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel?: () => void
  }) => useAlertStore.getState().confirm(params),
  infoPopup: (params: {
    title: string
    message: string
    type?: AlertType
    confirmText?: string
    onConfirm?: () => void
  }) => useAlertStore.getState().infoPopup(params),
  showLoading: (message?: string) => useAlertStore.getState().showLoading(message),
  hideLoading: () => useAlertStore.getState().hideLoading(),
}
