import React, { useImperativeHandle, useRef } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import type { ModuleHardwareConfig, ModuleKey } from '@/shared/types'

import { ActionSheet, type ActionSheetRef } from './action-sheet'
import { Button } from './button'
import { Card } from './card'
import { SwitchRow } from './switch'

const MODULE_TITLES: Record<ModuleKey, string> = {
  STOCK_IN: 'Cấu hình: Nhập kho',
  STOCK_OUT: 'Cấu hình: Xuất kho',
  INVENTORY: 'Cấu hình: Kiểm kê',
  LOCATE: 'Cấu hình: Định vị',
  RFID_WRITE: 'Cấu hình: Gán chip',
  DISPATCH: 'Cấu hình: Cấp phát',
  DISPOSAL: 'Cấu hình: Thanh lý',
  REPORT_BROKEN: 'Cấu hình: Báo hỏng',
}

const POWER_PRESETS = [
  { dbm: 5, label: '5 dBm', distance: '< 10cm' },
  { dbm: 10, label: '10 dBm', distance: '~0.5m' },
  { dbm: 15, label: '15 dBm', distance: '~1.5m' },
  { dbm: 20, label: '20 dBm', distance: '~3m' },
  { dbm: 27, label: '27 dBm', distance: '~5m' },
  { dbm: 30, label: '30 dBm', distance: '~8m' },
]

export interface ModuleHardwareSettingsSheetProps {
  moduleKey: ModuleKey
  config: ModuleHardwareConfig
  onUpdate: (patch: Partial<ModuleHardwareConfig>) => void
  onReset?: () => void
  ref?: React.Ref<ActionSheetRef>
}

export const ModuleHardwareSettingsSheet = ({
  moduleKey,
  config,
  onUpdate,
  onReset,
  ref,
}: ModuleHardwareSettingsSheetProps) => {
  const sheetRef = useRef<ActionSheetRef>(null)

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.open(),
    close: () => sheetRef.current?.close(),
  }))

  const title = MODULE_TITLES[moduleKey] || 'Cấu hình thiết bị'

  return (
    <ActionSheet ref={sheetRef} title={title} showCloseButton dismissible>
      <ScrollView className="max-h-[520px] px-1" showsVerticalScrollIndicator={false}>
        {/* ── 1. KHOẢNG CÁCH QUÉT RFID ── */}
        <Card className="shadow-xs mb-3 border border-outline-default bg-surface-50 p-3.5">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="font-bold text-xs text-neutral-900">Khoảng cách quét (RFID)</Text>
            <View className="rounded-md bg-primary-fixed px-2.5 py-0.5">
              <Text className="font-bold text-xs text-primary">{config.rfidPower} dBm</Text>
            </View>
          </View>

          {/* Grid 3 cột x 2 hàng không bị tràn */}
          <View className="flex-row flex-wrap justify-between gap-y-2">
            {POWER_PRESETS.map((p) => {
              const isSelected = config.rfidPower === p.dbm
              return (
                <Pressable
                  key={p.dbm}
                  onPress={() => onUpdate({ rfidPower: p.dbm })}
                  className={`w-[31%] items-center justify-center rounded-xl border py-2 ${
                    isSelected
                      ? 'border-primary bg-primary-fixed'
                      : 'border-outline-default bg-neutral-50 active:bg-neutral-100'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      isSelected ? 'text-primary' : 'text-neutral-800'
                    }`}
                  >
                    {p.label}
                  </Text>
                  <Text
                    className={`text-[10px] ${isSelected ? 'text-primary/70' : 'text-neutral-400'}`}
                  >
                    {p.distance}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Card>

        {/* ── 2. CHẾ ĐỘ QUÉT KHI BÓP CÒ ── */}
        <Card className="shadow-xs mb-3 border border-outline-default bg-surface-50 p-3.5">
          <Text className="mb-2 font-bold text-xs text-neutral-900">Chế độ quét khi bóp cò</Text>
          <View className="flex-row gap-2">
            {[
              { m: 'HYBRID', label: 'Cả RFID & QR' },
              { m: 'RFID', label: 'Chỉ RFID' },
              { m: 'BARCODE', label: 'Chỉ QR/Mã vạch' },
            ].map((item) => {
              const isSelected = config.defaultScanMode === item.m
              return (
                <Pressable
                  key={item.m}
                  onPress={() =>
                    onUpdate({
                      defaultScanMode: item.m as 'HYBRID' | 'RFID' | 'BARCODE',
                    })
                  }
                  className={`flex-1 items-center justify-center rounded-xl border py-2 ${
                    isSelected
                      ? 'border-primary bg-primary-fixed'
                      : 'border-outline-default bg-neutral-50 active:bg-neutral-100'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      isSelected ? 'text-primary' : 'text-neutral-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Card>

        {/* ── 3. ĐÈN & TIA NGẮM LASER ── */}
        <Card className="shadow-xs mb-3 border border-outline-default bg-surface-50 p-3.5">
          <Text className="mb-1 font-bold text-xs text-neutral-900">Đèn & Tia ngắm</Text>
          <SwitchRow
            label="Đèn Flash trợ sáng (kho tối)"
            value={config.barcodeLight}
            onValueChange={(val) => onUpdate({ barcodeLight: val })}
            showBorderBottom
          />
          <SwitchRow
            label="Tia Laser định vị tâm mã vạch"
            value={config.barcodeAimer}
            onValueChange={(val) => onUpdate({ barcodeAimer: val })}
          />
        </Card>

        {/* ── 4. ÂM THANH & RUNG ── */}
        <Card className="shadow-xs mb-3 border border-outline-default bg-surface-50 p-3.5">
          <Text className="mb-1 font-bold text-xs text-neutral-900">Âm thanh & Rung</Text>
          <SwitchRow
            label="Tiếng bíp khi đọc RFID"
            value={config.rfidBeep}
            onValueChange={(val) => onUpdate({ rfidBeep: val })}
            showBorderBottom
          />
          <SwitchRow
            label="Tiếng bíp khi đọc Barcode/QR"
            value={config.barcodeBeep}
            onValueChange={(val) => onUpdate({ barcodeBeep: val })}
            showBorderBottom
          />
          <SwitchRow
            label="Rung khi đọc thành công"
            value={config.vibrationOnSuccess}
            onValueChange={(val) => onUpdate({ vibrationOnSuccess: val })}
          />
        </Card>

        {/* ── 5. CHỐNG QUÉT LẶP (SESSION 1) ── */}
        {moduleKey === 'INVENTORY' && (
          <Card className="shadow-xs mb-3 border border-outline-default bg-surface-50 p-3.5">
            <SwitchRow
              label="Chống quét lặp (Session 1)"
              description="Tự lật cờ tag đã quét, giảm nóng máy và bắt nhanh tag ở xa"
              value={config.rfidSession === 1}
              onValueChange={(val) => onUpdate({ rfidSession: val ? 1 : 0 })}
            />
          </Card>
        )}

        {/* NÚT ACTIONS */}
        <View className="mb-6 flex-row gap-2.5 pt-1">
          {onReset && (
            <Button
              label="Khôi phục chuẩn"
              variant="outline"
              size="md"
              className="flex-1"
              onPress={onReset}
            />
          )}
          <Button
            label="Đã xong"
            variant="primary"
            size="md"
            className="flex-1"
            onPress={() => sheetRef.current?.close()}
          />
        </View>
      </ScrollView>
    </ActionSheet>
  )
}
