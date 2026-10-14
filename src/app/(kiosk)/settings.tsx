/**
 * @file settings.tsx
 * @brief Màn hình Cài Đặt & Kiểm Tra Phần Cứng Kiosk (Cổng USB, Loa, Thông Tin Kiosk).
 * @module src/app/(kiosk)/settings.tsx
 */

import {
  DeviceResolver,
  bindingStore,
  listCandidateDevices,
  requestUsbPermission,
  type DeviceBinding,
  type DeviceRole,
} from '@/core/hardware/resolver'
import { voicePlayerService } from '@/core/voice-engine'
import { useDevice } from '@/features/app'
import { AppHeader, Button } from '@/shared/components/ui'
import { useAppNavigation } from '@/shared/hooks'
import { CheckCircle2, Info, RotateCw, Volume2, VolumeX, XCircle } from 'lucide-react-native'
import type { UsbDeviceCandidate } from 'modules/expo-usb-serial-bridge'
import React, { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface DeviceItem {
  role: DeviceRole
  name: string
  baudrate: string
}

const DEVICES: DeviceItem[] = [
  { role: 'inbody', name: 'InBody (260S / 270 / 380)', baudrate: '19200 / 9600' },
  { role: 'bpbio', name: 'Máy đo huyết áp BPBIO 750', baudrate: '9600' },
  { role: 'tof', name: 'Cảm biến chiều cao ToF', baudrate: '460800' },
]

interface SettingInfoRowProps {
  label: string
  value: string
  description?: string
  valueClassName?: string
}

function SettingInfoRow({ label, value, description, valueClassName }: SettingInfoRowProps) {
  return (
    <View className="flex-row items-center justify-between px-6 py-4">
      <View className="flex-1 pr-4">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-medium text-base text-slate-500">{label}</Text>
          {description ? <Info size={14} color="#94A3B8" /> : null}
        </View>
        {description ? <Text className="mt-0.5 text-xs text-slate-400">{description}</Text> : null}
      </View>
      <Text className={valueClassName ?? 'font-bold text-base text-slate-900'}>{value}</Text>
    </View>
  )
}

export default function KioskSettingsRoute() {
  const { navigateTo, goBack } = useAppNavigation()

  // Đọc thông tin Kiosk trực tiếp từ State Machine
  const device = useDevice()

  // State Cổng USB
  const [bindings, setBindings] = useState<Map<DeviceRole, DeviceBinding>>(new Map())
  const [candidates, setCandidates] = useState<UsbDeviceCandidate[]>([])
  const [loading, setLoading] = useState(false)

  // State Âm Thanh
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)

  // Quét cổng trực tiếp tại chỗ, không popup
  const handleScan = useCallback(async () => {
    setLoading(true)
    try {
      const liveList = await listCandidateDevices()
      setCandidates(liveList || [])

      const resolver = new DeviceResolver(listCandidateDevices, requestUsbPermission, bindingStore)
      const map = await resolver.resolveAll()
      setBindings(map)
    } catch {
      // Bỏ qua lỗi
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    handleScan()
  }, [handleScan])

  // Dọn dẹp âm thanh khi rời màn hình
  useEffect(() => {
    return () => {
      voicePlayerService.stop().catch(() => {})
    }
  }, [])

  // Thao tác phát thử âm thanh / dừng loa
  const handleTestVoice = async () => {
    if (isPlayingVoice) {
      await voicePlayerService.stop()
      setIsPlayingVoice(false)
      return
    }

    setIsPlayingVoice(true)
    await voicePlayerService.speak('SESSION_TERMINATED', { force: true })
    setTimeout(() => {
      setIsPlayingVoice(false)
    }, 4000)
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
      {/* AppHeader Base Component */}
      <AppHeader
        title="Cài đặt Kỹ thuật"
        variant="white"
        showBorderBottom
        titleClassName="font-extrabold text-xl text-slate-900"
        onLeftPress={() => (navigateTo ? navigateTo('KIOSK_IDLE') : goBack())}
      />

      {/* Main Container */}
      <ScrollView className="flex-1 px-8 py-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="gap-6">
          {/* Cụm 1: Quản Lý Cổng USB */}
          <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Header Cụm Cổng USB */}
            <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <Text className="text-xl font-extrabold text-slate-900">Cổng USB Thiết Bị</Text>

              <Button
                label="Quét lại"
                size="sm"
                variant="primary"
                loading={loading}
                leftIcon={RotateCw}
                onPress={handleScan}
              />
            </View>

            {/* Danh Sách 3 Thiết Bị */}
            <View className="divide-y divide-slate-100">
              {DEVICES.map((dev) => {
                const binding = bindings.get(dev.role)
                const isConnected = !!binding

                const candidate = isConnected
                  ? candidates.find((c) => c.deviceKey === binding.deviceKey)
                  : null

                const info = isConnected
                  ? candidate
                    ? `VID: 0x${candidate.vendorId.toString(16).toUpperCase()} | PID: 0x${candidate.productId.toString(16).toUpperCase()} • Baud: ${dev.baudrate}`
                    : `Cổng: ${binding.deviceKey} • Baud: ${dev.baudrate}`
                  : 'Chưa phát hiện thiết bị'

                return (
                  <View key={dev.role} className="flex-row items-center justify-between p-6">
                    <View className="flex-1 pr-4">
                      <Text className="font-bold text-lg text-slate-900">{dev.name}</Text>
                      <Text className="mt-1 font-mono text-xs text-slate-500">{info}</Text>
                    </View>

                    {/* Trạng thái Nhận / Chưa nhận */}
                    <View className="flex-row items-center gap-1.5">
                      {isConnected ? (
                        <>
                          <CheckCircle2 size={20} color="#16A34A" />
                          <Text className="text-sm font-extrabold text-green-600">Đã nhận</Text>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} color="#DC2626" />
                          <Text className="text-sm font-extrabold text-red-600">Chưa nhận</Text>
                        </>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Cụm 2: Kiểm Tra Loa & Âm Thanh */}
          <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Header Cụm Loa */}
            <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <Text className="text-xl font-extrabold text-slate-900">Loa & Âm Thanh</Text>

              <Button
                label={isPlayingVoice ? 'Dừng' : 'Phát thử'}
                size="sm"
                variant={isPlayingVoice ? 'outline' : 'primary'}
                leftIcon={isPlayingVoice ? VolumeX : Volume2}
                onPress={handleTestVoice}
              />
            </View>

            {/* Nội dung cụm loa */}
            <View className="p-6">
              <Text className="font-bold text-lg text-slate-900">Giọng nói Tiếng Việt</Text>
              <Text className="mt-1 text-sm text-slate-500">
                Phát câu thoại hướng dẫn để kiểm tra âm lượng loa ngoài Kiosk
              </Text>
            </View>
          </View>

          {/* Cụm 3: Thông Tin Kiosk (Từ Admin) */}
          <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Header Cụm Thiết Bị */}
            <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <Text className="text-xl font-extrabold text-slate-900">Thông Tin Kiosk</Text>

              <Button
                label="Kích hoạt lại"
                size="sm"
                variant="outline"
                onPress={() => navigateTo('DEVICE_ACTIVATION')}
              />
            </View>

            {/* Danh sách Key - Value Thông Tin Kiosk */}
            <View className="divide-y divide-slate-100">
              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Tên Kiosk</Text>
                <Text className="font-bold text-base text-slate-900">
                  {device?.deviceName || '---'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Mã thiết bị</Text>
                <Text className="font-bold font-mono text-base text-slate-900">
                  {device?.deviceCode || device?.deviceSerial || '---'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Dòng máy</Text>
                <Text className="font-bold text-base text-slate-900">
                  {device?.deviceModel || '---'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Cơ sở y tế</Text>
                <Text className="font-bold text-base text-slate-900">
                  {device?.facility?.name || '---'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Khoa / Phòng</Text>
                <Text className="font-bold text-base text-slate-900">
                  {device?.departmentName || '---'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Vị trí đặt</Text>
                <Text className="font-bold text-base text-slate-900">
                  {device?.location || '---'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Địa chỉ</Text>
                <Text className="font-bold text-base text-slate-900">
                  {device?.facility?.address || '---'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between px-6 py-4">
                <Text className="font-medium text-base text-slate-500">Trạng thái</Text>
                <View className="flex-row items-center gap-1.5">
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${
                      device ? (device.isActive ? 'bg-emerald-500' : 'bg-red-500') : 'bg-slate-400'
                    }`}
                  />
                  <Text
                    className={`font-bold text-base ${
                      device
                        ? device.isActive
                          ? 'text-green-600'
                          : 'text-red-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {device ? (device.isActive ? 'Đang hoạt động' : 'Tạm khóa') : 'Chưa kích hoạt'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cụm 4: Cấu Hình Vận Hành (Từ Admin) */}
          <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <View className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <Text className="text-xl font-extrabold text-slate-900">Cấu Hình Vận Hành</Text>
            </View>

            <View className="divide-y divide-slate-100">
              <SettingInfoRow
                label="Phiên bản cấu hình"
                value={device?.config?.configVersion ? `v${device.config.configVersion}` : '---'}
                description="Phiên bản thiết lập do hệ thống máy chủ Admin phát hành"
              />

              <SettingInfoRow
                label="Giọng nói hướng dẫn"
                value={
                  device?.config?.voiceGuidanceEnabled === undefined
                    ? '---'
                    : device.config.voiceGuidanceEnabled
                      ? 'Đang bật'
                      : 'Đã tắt'
                }
                valueClassName={
                  device?.config?.voiceGuidanceEnabled
                    ? 'font-bold text-base text-green-600'
                    : 'font-bold text-base text-slate-500'
                }
                description="Phát âm thanh chỉ dẫn từng bước khám cho khách hàng"
              />

              <SettingInfoRow
                label="Thời gian chờ tối đa đo InBody"
                value={
                  device?.config?.timeouts?.measureInbodySeconds !== undefined
                    ? `${device.config.timeouts.measureInbodySeconds} giây`
                    : '---'
                }
                description="Thời hạn tối đa cho bước đo phân tích cơ thể InBody"
              />

              <SettingInfoRow
                label="Thời gian chờ tối đa đo Huyết áp"
                value={
                  device?.config?.timeouts?.measureBpSeconds !== undefined
                    ? `${device.config.timeouts.measureBpSeconds} giây`
                    : '---'
                }
                description="Thời hạn tối đa cho bước đo huyết áp bơm xả khí"
              />

              <SettingInfoRow
                label="Thời gian chờ tối đa màn hình kết quả"
                value={
                  device?.config?.timeouts?.summarySeconds !== undefined
                    ? `${device.config.timeouts.summarySeconds} giây`
                    : '---'
                }
                description="Thời hạn tối đa hiển thị kết quả trước khi tự động về màn hình chờ"
              />

              <SettingInfoRow
                label="Chu kỳ giám sát (Heartbeat)"
                value={
                  device?.config?.monitoring?.heartbeatIntervalSeconds !== undefined
                    ? `${device.config.monitoring.heartbeatIntervalSeconds} giây`
                    : '---'
                }
                description="Khoảng thời gian Kiosk gửi tín hiệu sống định kỳ lên máy chủ Admin"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
