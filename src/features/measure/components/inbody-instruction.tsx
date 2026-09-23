import { cn } from '@/shared/utils'
import { Image } from 'expo-image'
import React from 'react'
import { StyleProp, Text, View, ViewStyle } from 'react-native'

const inbodyGuide = require('@/assets/inbody_guide_male.webp')

export interface InBodyInstructionProps {
  /** ClassName bổ sung */
  className?: string
  /** Style tùy chỉnh */
  style?: StyleProp<ViewStyle>
}

export const InBodyInstruction = ({ className, style }: InBodyInstructionProps) => {
  return (
    <View
      className={cn('w-full flex-1 flex-col items-center justify-center gap-2 p-2 pb-6', className)}
      style={style}
    >
      {/* Top: Large InBody Demo Image (No Card Container) */}
      <View className="w-full flex-1 items-center justify-center overflow-hidden rounded-2xl">
        <Image
          source={inbodyGuide}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={200}
        />
      </View>

      {/* Bottom: 3 Clean Steps (BƯỚC 1, BƯỚC 2, BƯỚC 3) */}
      <View className="-mt-1 w-full flex-row items-center justify-between gap-4 px-4 pb-2">
        {/* Step 1 */}
        <View className="flex-1 items-center gap-1.5">
          <View className="rounded-md bg-red-600 px-3 py-1">
            <Text className="text-xs font-black uppercase text-white">BƯỚC 1</Text>
          </View>
          <Text className="text-center font-bold text-xs leading-relaxed text-slate-800">
            Tháo giày dép & tất, đứng 2 chân lên điện cực bàn cân
          </Text>
        </View>

        {/* Step 2 */}
        <View className="flex-1 items-center gap-1.5">
          <View className="rounded-md bg-red-600 px-3 py-1">
            <Text className="text-xs font-black uppercase text-white">BƯỚC 2</Text>
          </View>
          <Text className="text-center font-bold text-xs leading-relaxed text-slate-800">
            Cầm 2 tay cầm điện cực, duỗi thẳng tay hơi dang hông
          </Text>
        </View>

        {/* Step 3 */}
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
