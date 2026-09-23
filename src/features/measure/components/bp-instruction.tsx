import { cn } from '@/shared/utils'
import { Image } from 'expo-image'
import React from 'react'
import { StyleProp, Text, View, ViewStyle } from 'react-native'

const bpGuide = require('@/assets/bp_guide.png')

export interface BpInstructionProps {
  /** ClassName bổ sung */
  className?: string
  /** Style tùy chỉnh */
  style?: StyleProp<ViewStyle>
}

export const BpInstruction = ({ className, style }: BpInstructionProps) => {
  return (
    <View
      className={cn('w-full flex-1 flex-col justify-center gap-3 p-1', className)}
      style={style}
    >
      {/* Hàng 1: Bước 1 (Ảnh bên trái ── Chữ bên phải) */}
      <View className="flex-row items-center gap-4 overflow-hidden rounded-2xl border border-red-100/60 bg-white/85 p-3.5 backdrop-blur-md">
        {/* Left: Demo Image (Full cover, no inner padding) */}
        <View className="h-28 w-36 overflow-hidden rounded-xl bg-slate-100">
          <Image
            source={bpGuide}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        </View>

        {/* Right: Text Info */}
        <View className="flex-1 justify-center">
          <View className="mb-1.5 self-start rounded-md bg-red-600 px-2.5 py-0.5">
            <Text className="text-[11px] font-black uppercase tracking-wider text-white">
              BƯỚC 1
            </Text>
          </View>
          <Text className="mb-1 text-base font-black tracking-tight text-slate-900">
            XỎ TAY VÀO VÒNG ĐO
          </Text>
          <Text className="font-bold text-xs leading-relaxed text-slate-600">
            Cho tay trái vào vòng ôm, đặt cùi chỏ lên thảm đệm và ngồi thẳng lưng thư giãn.
          </Text>
        </View>
      </View>

      {/* Hàng 2: Bước 2 (Ảnh bên trái ── Chữ bên phải) */}
      <View className="flex-row items-center gap-4 overflow-hidden rounded-2xl border border-red-100/60 bg-white/85 p-3.5 backdrop-blur-md">
        {/* Left: Demo Image (Full cover, no inner padding) */}
        <View className="h-28 w-36 overflow-hidden rounded-xl bg-slate-100">
          <Image
            source={bpGuide}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        </View>

        {/* Right: Text Info */}
        <View className="flex-1 justify-center">
          <View className="mb-1.5 self-start rounded-md bg-red-600 px-2.5 py-0.5">
            <Text className="text-[11px] font-black uppercase tracking-wider text-white">
              BƯỚC 2
            </Text>
          </View>
          <Text className="mb-1 text-base font-black tracking-tight text-slate-900">
            THẢ LỎNG & GIỮ YÊN
          </Text>
          <Text className="font-bold text-xs leading-relaxed text-slate-600">
            Giữ nguyên tư thế, không cử động hoặc nói chuyện trong suốt quá trình máy đo.
          </Text>
        </View>
      </View>
    </View>
  )
}
