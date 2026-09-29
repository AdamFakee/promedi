import { cn } from '@/shared/utils'
import { Image } from 'expo-image'
import React from 'react'
import { StyleProp, Text, View, ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

const inbodyGuide = require('@/assets/inbody_guide_male.webp')

export interface InBodyInstructionProps {
  status?: 'idle' | 'measuring' | 'error' | 'completed'
  progress?: number
  errorCode?: string | null
  className?: string
  style?: StyleProp<ViewStyle>
}

export const InBodyInstruction = ({
  status = 'idle',
  progress = 0,
  errorCode,
  className,
  style,
}: InBodyInstructionProps) => {
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

        {/* Measuring Progress Overlay */}
        {status === 'measuring' && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            className="absolute inset-0 items-center justify-center bg-black/60"
          >
            <View className="items-center justify-center rounded-full bg-white/20 p-8">
              <Text className="text-6xl font-black text-white">{progress}%</Text>
              <Text className="mt-2 font-bold text-xl text-white">Đang quét sinh học...</Text>
            </View>
          </Animated.View>
        )}

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
      <View className="-mt-1 w-full flex-row items-center justify-between gap-4 px-4 pb-2">
        <View className="flex-1 items-center gap-1.5">
          <View className="rounded-md bg-red-600 px-3 py-1">
            <Text className="text-xs font-black uppercase text-white">BƯỚC 1</Text>
          </View>
          <Text className="text-center font-bold text-xs leading-relaxed text-slate-800">
            Tháo giày dép & tất, đứng 2 chân lên điện cực bàn cân
          </Text>
        </View>

        <View className="flex-1 items-center gap-1.5">
          <View className="rounded-md bg-red-600 px-3 py-1">
            <Text className="text-xs font-black uppercase text-white">BƯỚC 2</Text>
          </View>
          <Text className="text-center font-bold text-xs leading-relaxed text-slate-800">
            Cầm 2 tay cầm điện cực, duỗi thẳng tay hơi dang hông
          </Text>
        </View>

        <View className="flex-1 items-center gap-1.5">
          <View className="rounded-md bg-red-600 px-3 py-1">
            <Text className="text-xs font-black uppercase text-white">BƯỚC 3</Text>
          </View>
          <Text className="text-center font-bold text-xs leading-relaxed text-slate-800">
            Giữ nguyên tư thế & thả lỏng cho đến khi máy đo xong
          </Text>
        </View>
      </View>
    </View>
  )
}
