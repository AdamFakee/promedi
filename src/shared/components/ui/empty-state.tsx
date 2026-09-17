import { colors } from '@/shared/theme'
import { cn } from '@/shared/utils'
import { LucideIcon, SearchX } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'
import { Button } from './button'

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ComponentType<any> | LucideIcon | any
  iconColor?: string
  iconContainerClassName?: string
  actionLabel?: string
  onAction?: () => void
  isFiltered?: boolean
  onClearFilter?: () => void
  children?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = colors.primary.default,
  iconContainerClassName = 'bg-red-50',
  actionLabel,
  onAction,
  isFiltered,
  onClearFilter,
  children,
  className,
}) => {
  const displayIcon = isFiltered ? SearchX : Icon
  const displayTitle = title ?? (isFiltered ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu')
  const displayDescription =
    description ??
    (isFiltered
      ? 'Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại các tiêu chí bộ lọc.'
      : 'Hiện tại chưa có dữ liệu ghi nhận tại đây.')
  const displayActionLabel = actionLabel ?? (isFiltered ? 'Xóa bộ lọc' : undefined)
  const displayOnAction = onAction ?? (isFiltered ? onClearFilter : undefined)

  return (
    <View className={cn('flex-1 items-center justify-center p-8 py-16', className)}>
      {displayIcon && (
        <View
          className={cn(
            'mb-4 h-16 w-16 items-center justify-center rounded-full',
            iconContainerClassName,
          )}
        >
          {React.isValidElement(displayIcon) ? (
            displayIcon
          ) : (
            <React.Fragment>
              {/* Render lucide icon component */}
              {React.createElement(displayIcon as any, {
                size: 32,
                color: iconColor,
                strokeWidth: 1.75,
              })}
            </React.Fragment>
          )}
        </View>
      )}

      <Text className="mb-1 text-center font-bold text-base text-slate-800">{displayTitle}</Text>

      {displayDescription && (
        <Text className="mb-4 max-w-[280px] text-center text-xs font-normal leading-relaxed text-slate-500">
          {displayDescription}
        </Text>
      )}

      {children}

      {displayActionLabel && displayOnAction && (
        <Button
          label={displayActionLabel}
          onPress={displayOnAction}
          variant="secondary"
          size="sm"
          className="mt-2 min-w-[130px]"
        />
      )}
    </View>
  )
}
