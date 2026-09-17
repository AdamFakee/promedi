import React, { useEffect, useRef } from 'react'
import { Animated, ViewProps } from 'react-native'
import { cn } from '@/shared/utils/cn'

interface ShimmerProps extends ViewProps {
  className?: string
}

export function Shimmer({ className, style, ...props }: ShimmerProps) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      className={cn('bg-slate-200', className)}
      style={[{ opacity }, style]}
      {...props}
    />
  )
}
