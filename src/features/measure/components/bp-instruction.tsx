import { cn } from '@/shared/utils'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import React, { useEffect } from 'react'
import { StyleProp, Text, View, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const bpGuide = require('@/assets/bp_guide.png')

export interface BpInstructionProps {
  /** ClassName bổ sung */
  className?: string
  /** Style tùy chỉnh */
  style?: StyleProp<ViewStyle>
  /** Trạng thái đo */
  status?: 'idle' | 'measuring' | 'error' | 'completed'
}

export const BpInstruction = ({ className, style, status = 'idle' }: BpInstructionProps) => {
  // Animation for "measuring" text (infinite pulse)
  const opacity = useSharedValue(0.4)
  const scale = useSharedValue(0.98)

  useEffect(() => {
    if (status === 'measuring') {
      opacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
        -1,
        true,
      )
      scale.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 800 }), withTiming(0.98, { duration: 800 })),
        -1,
        true,
      )
    } else {
      opacity.value = withTiming(1)
      scale.value = withTiming(1)
    }
  }, [status, opacity, scale])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  if (status === 'measuring' || status === 'completed') {
    return (
      <View
        className={cn('w-full flex-1 items-center justify-center gap-6 p-4', className)}
        style={style}
      >
        <Animated.View
          style={animatedStyle}
          className="items-center justify-center rounded-full border-4 border-red-500/20 bg-red-50 p-8"
        >
          <MaterialCommunityIcons name="heart-pulse" size={80} color="#EF4444" />
        </Animated.View>
        <Animated.Text style={{ opacity }} className="text-2xl font-black text-slate-800">
          Đang đo huyết áp...
        </Animated.Text>
        <Text className="text-center font-bold text-base text-slate-500">
          Xin vui lòng giữ yên và không nói chuyện
        </Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View
        className={cn('w-full flex-1 items-center justify-center gap-6 p-4', className)}
        style={style}
      >
        <View className="items-center justify-center rounded-full border-4 border-red-500 bg-red-50 p-8">
          <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#EF4444" />
        </View>
        <Text className="text-center text-2xl font-black text-red-600">Đã xảy ra lỗi</Text>
        <Text className="px-8 text-center font-bold text-base text-slate-600">
          Máy đo phát hiện cử động hoặc lỗi không xác định. Quý khách vui lòng chỉnh lại tư thế, máy
          sẽ tự động đo lại.
        </Text>
      </View>
    )
  }

  // Mặc định (idle) hiển thị hướng dẫn tư thế ban đầu
  return (
    <View
      className={cn('w-full flex-1 flex-col justify-center gap-4 p-1', className)}
      style={style}
    >
      {/* Hàng 1: Bước 1 (Ảnh bên trái ── Chữ bên phải) */}
      <View className="flex-row items-center gap-5 overflow-hidden rounded-3xl border border-red-100/80 bg-white/90 p-4 backdrop-blur-md">
        <View className="shadow-inner h-36 w-44 overflow-hidden rounded-2xl bg-slate-100">
          <Image
            source={bpGuide}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        </View>

        <View className="flex-1 justify-center">
          <View className="mb-2 self-start rounded-lg bg-red-600 px-3.5 py-1">
            <Text className="text-xs font-black uppercase tracking-wider text-white">BƯỚC 1</Text>
          </View>
          <Text className="mb-1.5 text-2xl font-black tracking-tight text-slate-900">
            XỎ TAY VÀO VÒNG ĐO
          </Text>
          <Text className="font-bold text-lg leading-snug text-slate-700">
            Cho tay trái vào vòng ôm, đặt cùi chỏ lên thảm đệm và ngồi thẳng lưng thư giãn.
          </Text>
        </View>
      </View>

      {/* Hàng 2: Bước 2 (Ảnh bên trái ── Chữ bên phải) */}
      <View className="flex-row items-center gap-5 overflow-hidden rounded-3xl border border-red-100/80 bg-white/90 p-4 backdrop-blur-md">
        <View className="shadow-inner h-36 w-44 overflow-hidden rounded-2xl bg-slate-100">
          <Image
            source={bpGuide}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        </View>

        <View className="flex-1 justify-center">
          <View className="mb-2 self-start rounded-lg bg-red-600 px-3.5 py-1">
            <Text className="text-xs font-black uppercase tracking-wider text-white">BƯỚC 2</Text>
          </View>
          <Text className="mb-1.5 text-2xl font-black tracking-tight text-slate-900">
            THẢ LỎNG & GIỮ YÊN
          </Text>
          <Text className="font-bold text-lg leading-snug text-slate-700">
            Giữ nguyên tư thế, không cử động hoặc nói chuyện trong suốt quá trình máy đo.
          </Text>
        </View>
      </View>
    </View>
  )
}
