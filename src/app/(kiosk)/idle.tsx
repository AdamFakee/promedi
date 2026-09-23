import { useHealthSession } from '@/core/health-session'
import {
  IdentificationModal,
  type IdentificationFormData,
  type IdentificationModalRef,
} from '@/features/identification'
import { Button, SvgBMULogo } from '@/shared/components/ui'
import { useAppNavigation } from '@/shared/hooks'
import { useIsFocused } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import React, { useEffect, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const videoSource = require('@/assets/video-intro.mp4')

export default function KioskIdleRoute() {
  const isFocused = useIsFocused()
  const identModalRef = useRef<IdentificationModalRef>(null)
  const { startSession, submitIdentification } = useHealthSession()
  const { navigateTo } = useAppNavigation()

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true
    p.muted = true
  })

  useEffect(() => {
    if (isFocused) {
      player.play()
    } else {
      player.pause()
    }
  }, [player, isFocused])

  const handleStartSession = () => {
    startSession()
    identModalRef.current?.open()
  }

  const handleIdentificationSubmit = (data: IdentificationFormData) => {
    identModalRef.current?.close()
    submitIdentification({
      fullName: data.fullName,
      identityCode: data.identityCode,
    })
    setTimeout(() => {
      navigateTo('KIOSK_MEASURE')
    }, 120)
  }

  return (
    <View className="flex-1 bg-black">
      {/* Fullscreen Looping Video Background (Only rendered when screen is focused) */}
      {isFocused && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          surfaceType="textureView"
          useExoShutter={false}
        />
      )}

      {/* Subtle Vignette Overlay */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.6)', 'transparent', 'rgba(0, 0, 0, 0.75)']}
        locations={[0, 0.4, 1]}
        className="absolute inset-0"
      />

      {/* Touchable Backdrop to open popup via ref */}
      <Pressable className="absolute inset-0" onPress={handleStartSession} />

      <SafeAreaView className="pointer-events-box-none flex-1 justify-between px-8 py-6">
        {/* Header - Bệnh viện BMU */}
        <View className="pointer-events-auto items-start">
          <View className="h-14 items-center justify-center rounded-2xl border border-red-200 bg-white/95 px-4 py-1.5 shadow-lg">
            <SvgBMULogo size={38} withText={true} />
          </View>
        </View>

        {/* Center Main Action - Hướng dẫn khám */}
        <View className="pointer-events-auto my-auto w-full max-w-xl items-center self-center">
          <Button label="Bắt đầu Khám" variant="primary" size="xl" onPress={handleStartSession} />
        </View>

        {/* Footer - GHD & BMU */}
        <View className="pointer-events-none items-center border-t border-white/20 pt-4">
          <Text className="text-center font-medium text-xs text-white/90">
            Công ty CP Đầu tư và Công nghệ GHD • Bệnh viện Đại học Y Dược Buôn Ma Thuột (BMU)
          </Text>
        </View>
      </SafeAreaView>

      {/* Imperative Ref-controlled Identification Popup Modal */}
      <IdentificationModal ref={identModalRef} onSubmit={handleIdentificationSubmit} />
    </View>
  )
}
