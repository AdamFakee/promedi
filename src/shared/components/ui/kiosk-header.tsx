import { cn } from '@/shared/utils'
import React from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { SvgBMULogo, SvgProMediLogo } from './svg-icons'

export interface KioskHeaderProps {
  /** ClassName bổ sung */
  className?: string
  /** Style tùy chỉnh */
  style?: StyleProp<ViewStyle>
}

export const KioskHeader = ({ className, style, ...props }: KioskHeaderProps) => {
  return (
    <View
      className={cn('relative w-full items-center justify-center', className)}
      style={style}
      {...props}
    >
      {/* Concave Arc Background SVG (Vòng cung lõm xuống sâu & phối màu gradient sang trọng) */}
      <View className="absolute inset-0 h-full w-full">
        <Svg width="100%" height="100%" viewBox="0 0 400 95" preserveAspectRatio="none">
          <Defs>
            {/* Main Header Arc Gradient: White into delicate rose blush at the dip */}
            <LinearGradient id="arcFillGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="65%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="100%" stopColor="#FFF1F1" stopOpacity={1} />
            </LinearGradient>

            {/* Glowing Backdrop Gradient */}
            <LinearGradient id="arcGlowGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FEE2E2" stopOpacity={0.6} />
              <Stop offset="100%" stopColor="#FECDD3" stopOpacity={0.4} />
            </LinearGradient>

            {/* Vibrant Red/Crimson Arc Curve Edge Line */}
            <LinearGradient id="arcLineGradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FCA5A5" stopOpacity={0.4} />
              <Stop offset="25%" stopColor="#EF4444" stopOpacity={0.9} />
              <Stop offset="50%" stopColor="#B91C1C" stopOpacity={1} />
              <Stop offset="75%" stopColor="#EF4444" stopOpacity={0.9} />
              <Stop offset="100%" stopColor="#FCA5A5" stopOpacity={0.4} />
            </LinearGradient>
          </Defs>

          {/* 1. Outer Soft Glow Layer (Deeper Dip: Q200,125) */}
          <Path d="M0,0 L400,0 L400,60 Q200,125 0,60 Z" fill="url(#arcGlowGradient)" />

          {/* 2. Main White/Blush Arc Layer (Dip: Q200,118) */}
          <Path d="M0,0 L400,0 L400,55 Q200,118 0,55 Z" fill="url(#arcFillGradient)" />

          {/* 3. Deep Curved Gradient Line */}
          <Path
            d="M0,55 Q200,118 400,55"
            stroke="url(#arcLineGradient)"
            strokeWidth="2.5"
            fill="none"
          />
        </Svg>
      </View>

      {/* Brand Logos Floating Centered in Concave Arc (Kích thước lớn sang trọng) */}
      <View className="z-10 flex-row items-center justify-center gap-5 py-3">
        <SvgBMULogo size={50} withText={true} />
        <View className="h-10 w-[2px] bg-slate-300/90" />
        <SvgProMediLogo size={46} />
      </View>
    </View>
  )
}
