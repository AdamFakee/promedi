import React from 'react'
import { StyleSheet, View, ViewProps } from 'react-native'
import Svg, { Path } from 'react-native-svg'

export interface WaveBackgroundProps extends ViewProps {
  /**
   * Stroke color of the wave lines (default: white for dark backgrounds)
   */
  strokeColor?: string
  /**
   * Total number of parametric wave lines (default: 90)
   */
  lineCount?: number
  /**
   * Optional background color (default: transparent)
   */
  backgroundColor?: string
  children?: React.ReactNode
  className?: string
}

export const WaveBackground: React.FC<WaveBackgroundProps> = ({
  strokeColor = 'rgba(255, 255, 255, 0.35)',
  lineCount = 90,
  backgroundColor = 'transparent',
  children,
  style,
  className,
  ...props
}) => {
  const wavePaths = React.useMemo(() => {
    const paths: { d: string; opacity: number }[] = []
    const total = Math.max(10, lineCount)

    for (let i = 0; i < total; i++) {
      const t = i / (total - 1)

      const startX = -120 + t * 520
      const startY = 650 - t * 700

      const control1X = 250 + t * 100
      const control1Y = 420 - t * 210

      const control2X = 290 + t * 180
      const control2Y = 130 + t * 270

      const endX = 900
      const endY = 30 + t * 80

      const d = `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${control1X.toFixed(1)} ${control1Y.toFixed(1)}, ${control2X.toFixed(1)} ${control2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`

      const centerGlow = Math.exp(-Math.pow((t - 0.5) * 5, 2))
      const opacity = 0.1 + centerGlow * 0.78

      paths.push({ d, opacity })
    }

    return paths
  }, [lineCount])

  return (
    <View style={[styles.container, { backgroundColor }, style]} className={className} {...props}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      >
        {wavePaths.map((item, index) => (
          <Path
            key={index}
            d={item.d}
            stroke={strokeColor}
            strokeWidth={0.75}
            strokeOpacity={item.opacity}
            fill="none"
          />
        ))}
      </Svg>

      {children}
    </View>
  )
}

WaveBackground.displayName = 'WaveBackground'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
})
