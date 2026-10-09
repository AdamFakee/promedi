import { useHealthSession } from '@/core/health-session'
import {
  IdentificationModal,
  type IdentificationFormData,
  type IdentificationModalRef,
} from '@/features/identification'
import { HardwareTestModal } from '@/shared/components/common'
import { useAppNavigation } from '@/shared/hooks'
import { useIsFocused } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import { addNFCScanListener } from 'modules/expo-sunmi-k2'
import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const videoSource = require('@/assets/video-intro.mp4')

export default function KioskIdleRoute() {
  const isFocused = useIsFocused()
  const identModalRef = useRef<IdentificationModalRef>(null)
  const { startSession, submitIdentification, resetSession } = useHealthSession()
  const { navigateTo } = useAppNavigation()
  const [testModalVisible, setTestModalVisible] = useState(false)

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true
    p.muted = false
    p.volume = 1.0
  })

  useEffect(() => {
    if (isFocused) {
      player.play()
      resetSession()
    } else {
      player.pause()
    }
  }, [player, isFocused, resetSession])

  // Lắng nghe sự kiện quẹt thẻ NFC tại màn hình Idle (Chờ)
  useEffect(() => {
    if (!isFocused) return

    const subscription = addNFCScanListener((event) => {
      if (!event.cardUid) return

      // 1. Khởi tạo phiên khám mới
      startSession()

      // 2. Tự động điền dữ liệu định danh theo mã thẻ
      submitIdentification({
        fullName: `Khách hàng (NFC ${event.cardUid.slice(-4).toUpperCase()})`,
        identityCode: event.cardUid,
        age: 30,
        gender: 'M',
      })

      // 3. Đóng popup nếu đang mở
      identModalRef.current?.close()

      // 4. Nhảy thẳng qua màn hình đo (KIOSK_MEASURE)
      setTimeout(() => {
        navigateTo('KIOSK_MEASURE')
      }, 150)
    })

    return () => {
      subscription.remove()
    }
  }, [isFocused, navigateTo, startSession, submitIdentification])

  const handleStartSession = () => {
    startSession()
    identModalRef.current?.open()
  }

  const handleIdentificationSubmit = (data: IdentificationFormData) => {
    identModalRef.current?.close()
    submitIdentification({
      fullName: data.fullName,
      identityCode: data.identityCode,
      age: Number(data.age),
      gender: data.gender,
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

      {/* Vignette Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.6)']}
        locations={[0, 0.5, 1]}
        className="absolute inset-0"
      />

      {/* Floating Dev Buttons Container on Idle Screen */}
      <View style={styles.floatingDevContainer}>
        <Pressable
          onPress={() => navigateTo('KIOSK_HEIGHT_DEMO')}
          style={styles.floatingHeightDemoBtn}
          hitSlop={10}
        >
          <Text style={styles.floatingHeightDemoBtnText}>📏 DEMO ĐO CHIỀU CAO (TOF)</Text>
        </Pressable>

        <Pressable
          onPress={() => setTestModalVisible(true)}
          style={styles.floatingDevBtn}
          hitSlop={10}
        >
          <Text style={styles.floatingDevBtnText}>🛠 TEST HARDWARE (15 UCs)</Text>
        </Pressable>
      </View>

      {/* Fullscreen Touchable Backdrop to start session on tap anywhere */}
      <Pressable className="absolute inset-0" onPress={handleStartSession} />

      {/* Bottom Action Bar - Light Frosted Glassmorphism (20% Larger) */}
      <SafeAreaView edges={['bottom']} className="pointer-events-box-none flex-1 justify-end">
        <View className="pointer-events-auto w-full bg-white/20 px-12 py-11 backdrop-blur-3xl">
          <View className="flex-row items-center justify-between">
            {/* Title & Subtitle on Left */}
            <View className="flex-1 pr-10">
              <Text className="text-5xl font-extrabold tracking-wide text-white drop-shadow-lg">
                ProMedi
              </Text>
              <Text className="mt-3 font-semibold text-xl leading-relaxed text-white/95 drop-shadow-md">
                Giải pháp kiểm tra sức khỏe tự động toàn diện
              </Text>
            </View>

            {/* Pill Button 'Bắt đầu' on Right - 20% Larger */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleStartSession}
              className="rounded-full bg-primary px-16 py-6 shadow-2xl shadow-pink-600/60"
            >
              <Text className="text-3xl font-black tracking-wider text-white">Bắt đầu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Imperative Ref-controlled Identification Popup Modal */}
      <IdentificationModal ref={identModalRef} onSubmit={handleIdentificationSubmit} />

      {/* Detailed Hardware & Network Usecase Test Modal */}
      <HardwareTestModal visible={testModalVisible} onClose={() => setTestModalVisible(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  floatingDevContainer: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    right: 24,
    top: 24,
    zIndex: 999,
  },
  floatingHeightDemoBtn: {
    backgroundColor: '#0F172A',
    borderColor: '#34D399',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingHeightDemoBtnText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingDevBtn: {
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingDevBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
})
