import { colors } from '@/shared/theme'
import { cn } from '@/shared/utils'
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native'

interface LoadingIndicatorProps extends ActivityIndicatorProps {
  className?: string
}

export const LoadingIndicator = ({ className, color, ...props }: LoadingIndicatorProps) => {
  return (
    <ActivityIndicator
      color={color ?? colors.primary.default}
      className={cn(className)}
      {...props}
    />
  )
}
