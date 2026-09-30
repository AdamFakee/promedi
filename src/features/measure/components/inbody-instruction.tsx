import { useHealthSession } from '@/core/health-session'
import { cn } from '@/shared/utils'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect } from 'react'
import { StyleProp, Text, View, ViewStyle } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SvgDetailedBody } from './svg-detailed-body'

const inbodyGuide = require('@/assets/inbody_guide_male.webp')

export interface InBodyInstructionProps {
  status?: 'idle' | 'measuring' | 'error' | 'completed'
  progress?: number
  errorCode?: string | null
  gender?: 'M' | 'F'
  className?: string
  style?: StyleProp<ViewStyle>
}

export const InBodyInstruction = ({
  status = 'idle',
  progress = 0,
  errorCode,
  gender: genderProp,
  className,
  style,
}: InBodyInstructionProps) => {
  const { context } = useHealthSession()
  const gender = genderProp ?? context.customer?.gender ?? 'M'

  // Animation cho thanh scan quét lên xuống
  const scanY = useSharedValue(10)
  const textOpacity = useSharedValue(0.5)
  const pulseScale = useSharedValue(1)

  useEffect(() => {
    // Luôn chạy hiệu ứng scan khi ở trạng thái measuring
    scanY.value = withRepeat(
      withSequence(
        withTiming(255, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(15, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    )

    textOpacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.5, { duration: 800 })),
      -1,
      true,
    )

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(0.98, { duration: 800, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      true,
    )
  }, [scanY, textOpacity, pulseScale])

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }))

  const containerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }))

  // 1. Trạng thái ĐANG ĐO INBODY và đon thành công (Measuring - Đồng bộ style với huyết áp kèm SVG Scan)
  if (status === 'measuring' || status === 'completed') {
    return (
      <View
        className={cn('w-full flex-1 items-center justify-center gap-5 p-4', className)}
        style={style}
      >
        {/* SVG Scanner Container */}
        <Animated.View
          style={containerPulseStyle}
          className="relative items-center justify-center overflow-hidden rounded-3xl border-2 border-red-500/30 bg-white/95 p-4 shadow-2xl shadow-red-500/20"
        >
          {/* Vùng chứa SVG Body với chiều cao cố định để thanh scan chạy */}
          <View className="relative h-[280px] w-[190px] items-center justify-center overflow-hidden">
            <SvgDetailedBody width={165} height={270} gender={gender} />

            {/* Scanning Laser Beam with Glow effect */}
            <Animated.View
              style={[
                scanLineStyle,
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  zIndex: 50,
                  elevation: 10,
                },
              ]}
              pointerEvents="none"
            >
              {/* Laser Beam Gradient Line */}
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.1)', '#EF4444', '#DC2626', 'rgba(239, 68, 68, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 4, width: '100%', borderRadius: 2 }}
              />

              {/* Laser Halo Glow */}
              <LinearGradient
                colors={['transparent', 'rgba(239, 68, 68, 0.35)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ height: 26, width: '100%', marginTop: -15, borderRadius: 13 }}
              />
            </Animated.View>
          </View>

          {/* Badge tiến trình phần trăm góc dưới */}
          {progress > 0 && (
            <View className="absolute bottom-3 right-3 rounded-full bg-red-600 px-3 py-1 shadow-sm">
              <Text className="text-xs font-black text-white">{progress}%</Text>
            </View>
          )}
        </Animated.View>

        {/* Tiêu đề & Cảnh báo */}
        <View className="items-center gap-2">
          <Animated.Text
            style={{ opacity: textOpacity }}
            className="text-center text-3xl font-black tracking-tight text-slate-800"
          >
            Đang quét phân tích cơ thể...
          </Animated.Text>
        </View>
      </View>
    )
  }

  // 3. Trạng thái MẶC ĐỊNH / HƯỚNG DẪN (Idle) & LỖI (Error)
  return (
    <View
      className={cn('w-full flex-1 flex-col items-center justify-center gap-2 p-2 pb-6', className)}
      style={style}
    >
      {/* Top: Large InBody Demo Image */}
      <View className="relative w-full flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white">
        <Image
          source={inbodyGuide}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={200}
        />

        {/* Error Overlay */}
        {status === 'error' && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            className="absolute inset-0 items-center justify-center bg-black/80"
          >
            <View className="max-w-[80%] items-center justify-center rounded-3xl bg-white p-8">
              <Text className="text-6xl">⚠️</Text>
              <Text className="mt-4 text-center text-3xl font-black text-red-600">
                LỖI ĐO INBODY
              </Text>
              <Text className="mt-2 text-center text-xl text-slate-700">
                {errorCode === 'GENDER_ERROR'
                  ? 'Giới tính không hợp lệ.'
                  : errorCode === 'HEIGHT_ERROR'
                    ? 'Chiều cao ngoài khoảng đo (50-250cm).'
                    : errorCode === 'AGE_ERROR'
                      ? 'Độ tuổi ngoài khoảng (3-99).'
                      : 'Phát sinh lỗi kết nối hoặc sai tư thế.'}
              </Text>
              <Text className="mt-4 text-center font-bold text-lg text-slate-500">
                Vui lòng kiểm tra lại thiết bị hoặc đứng đúng tư thế.
              </Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Bottom: 3 Clean Steps */}
      <View className="w-full flex-row items-stretch justify-between gap-3 px-2 pb-2">
        <View className="flex-1 items-center justify-between rounded-2xl border border-red-100/80 bg-white/95 p-3.5 shadow-sm">
          <View className="mb-2 rounded-lg bg-red-600 px-3.5 py-1 shadow-sm">
            <Text className="text-xs font-black uppercase tracking-wider text-white">BƯỚC 1</Text>
          </View>
          <Text className="text-center font-bold text-base leading-snug text-slate-800">
            Tháo giày tất, đứng 2 chân lên điện cực bàn cân
          </Text>
        </View>

        <View className="flex-1 items-center justify-between rounded-2xl border border-red-100/80 bg-white/95 p-3.5 shadow-sm">
          <View className="mb-2 rounded-lg bg-red-600 px-3.5 py-1 shadow-sm">
            <Text className="text-xs font-black uppercase tracking-wider text-white">BƯỚC 2</Text>
          </View>
          <Text className="text-center font-bold text-base leading-snug text-slate-800">
            Cầm 2 tay cầm điện cực, duỗi thẳng tay hơi dang hông
          </Text>
        </View>

        <View className="flex-1 items-center justify-between rounded-2xl border border-red-100/80 bg-white/95 p-3.5 shadow-sm">
          <View className="mb-2 rounded-lg bg-red-600 px-3.5 py-1 shadow-sm">
            <Text className="text-xs font-black uppercase tracking-wider text-white">BƯỚC 3</Text>
          </View>
          <Text className="text-center font-bold text-base leading-snug text-slate-800">
            Giữ nguyên tư thế & thả lỏng cho đến khi máy đo xong
          </Text>
        </View>
      </View>
    </View>
  )
}
