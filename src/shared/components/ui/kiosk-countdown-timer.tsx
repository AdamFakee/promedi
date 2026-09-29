import { cn } from '@/shared/utils'
import React from 'react'
import { Text, View, ViewProps } from 'react-native'

export interface KioskCountdownTimerProps extends ViewProps {
  /** Số giây còn lại */
  secondsRemaining?: number
  /** Tổng số giây ban đầu (Mặc định: 60) */
  totalSeconds?: number
  /** Bước hiện tại của luồng khám (0: BP, 1: InBody, 2: Kết Quả) */
  currentStep?: number
  /** Trạng thái tạm dừng đếm ngược khi đang đo */
  isPaused?: boolean
  /** ClassName bổ sung */
  className?: string
}

export const KioskCountdownTimer = ({
  secondsRemaining = 60,
  totalSeconds = 60,
  currentStep,
  isPaused = false,
  className,
  style,
  ...props
}: KioskCountdownTimerProps) => {
  const seconds = Math.max(0, secondsRemaining)
  const isResultStep = currentStep === 2

  // Dynamic color palette based on remaining time
  const isUrgent = !isPaused && seconds <= 10
  const isWarning = !isPaused && seconds > 10 && seconds <= 20

  const bgColor = isPaused
    ? 'bg-red-50/80 border-red-200'
    : isUrgent
      ? 'bg-red-50/95 border-red-300'
      : isWarning
        ? 'bg-amber-50/95 border-amber-300'
        : 'bg-white/95 border-red-100'

  return (
    <View
      className={cn(
        'w-full flex-row items-center justify-center rounded-2xl border px-6 py-3',
        bgColor,
        className,
      )}
      style={style}
      {...props}
    >
      {/* Clear Instructional Guidance Text Without Icon */}
      <Text className="text-center font-semibold text-sm tracking-tight text-slate-700">
        {isPaused ? (
          <Text className="font-bold text-red-700">
            Đang tiến hành đo chỉ số... Vui lòng giữ yên tư thế
          </Text>
        ) : isResultStep ? (
          <>
            Phiên khám sẽ tự động hoàn tất & dọn dẹp dữ liệu sau{' '}
            <Text
              className={cn('text-base font-black', isUrgent ? 'text-red-600' : 'text-red-700')}
            >
              {seconds}s
            </Text>
          </>
        ) : (
          <>
            Vui lòng thực hiện đo trong vòng{' '}
            <Text
              className={cn('text-base font-black', isUrgent ? 'text-red-600' : 'text-red-700')}
            >
              {seconds}s
            </Text>{' '}
            (phiên khám sẽ tự động hủy nếu hết giờ)
          </>
        )}
      </Text>
    </View>
  )
}
