import { useHealthSession, voicePlayerService } from '@/core'
import { Button, SvgQrCode } from '@/shared/components/ui'
import { useAppNavigation } from '@/shared/hooks'
import { cn } from '@/shared/utils'
import React from 'react'
import { StyleProp, Text, View, ViewStyle } from 'react-native'
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg'
import { SvgDetailedBody } from './svg-detailed-body'

export interface ResultSummaryProps {
  className?: string
  style?: StyleProp<ViewStyle>
}

export const ResultSummary = ({ className, style }: ResultSummaryProps) => {
  const { context } = useHealthSession()
  const { replaceTo } = useAppNavigation()

  const handleFinish = React.useCallback(() => {
    voicePlayerService.stop()
    voicePlayerService.speak('SESSION_TERMINATED')
    replaceTo('HOME')
  }, [replaceTo])

  const bpData = context.bpResults
  const inBodyData = context.inBodyResults

  const gender = context.customer?.gender ?? 'M'
  const bmi = inBodyData?.bmi ? inBodyData.bmi.toFixed(1) : '---'
  const bodyAge = context.customer?.age ? context.customer.age : '---'
  const visceralFat = inBodyData?.vfl ?? '---'
  const tbw = inBodyData?.tbw ? inBodyData.tbw.toFixed(1) : '---'

  return (
    <View className={cn('w-full flex-1 flex-col gap-3 p-1', className)} style={style}>
      <View>
        {/* ==================== 1. HUYẾT ÁP & TIM MẠCH ==================== */}
        <View className="w-full py-1">
          <View className="mb-3 flex-row items-center justify-between border-b border-slate-200/60 pb-2">
            <View className="rounded-md bg-primary px-3.5 py-1">
              <Text className="text-sm font-black uppercase tracking-wider text-white">
                HUYẾT ÁP & TIM MẠCH
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <View className="w-1/3 items-center border-r border-slate-200/60">
              <Text className="font-bold text-sm uppercase text-slate-500">Tâm Thu</Text>
              <View className="mt-1 flex-row items-baseline gap-1">
                <Text className="text-3xl font-black tracking-tight text-slate-900">
                  {bpData?.systolic ?? '---'}
                </Text>
                <Text className="font-bold text-sm text-slate-500">mmHg</Text>
              </View>
            </View>

            <View className="w-1/3 items-center border-r border-slate-200/60">
              <Text className="font-bold text-sm uppercase text-slate-500">Tâm Trương</Text>
              <View className="mt-1 flex-row items-baseline gap-1">
                <Text className="text-3xl font-black tracking-tight text-slate-900">
                  {bpData?.diastolic ?? '---'}
                </Text>
                <Text className="font-bold text-sm text-slate-500">mmHg</Text>
              </View>
            </View>

            <View className="w-1/3 items-center">
              <Text className="font-bold text-sm uppercase text-slate-500">Nhịp Tim</Text>
              <View className="mt-1 flex-row items-baseline gap-1">
                <Text className="text-3xl font-black tracking-tight text-primary">
                  {bpData?.pulse ?? '---'}
                </Text>
                <Text className="font-bold text-sm text-slate-500">bpm</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ==================== 2. PHÂN TÍCH CHỈ SỐ CƠ THỂ ==================== */}
        <View className="w-full py-1">
          {/* Header */}
          <View className="mb-2 flex-row items-center justify-between border-b border-slate-200/60 pb-2">
            <View className="rounded-md bg-primary px-3.5 py-1">
              <Text className="text-sm font-black uppercase tracking-wider text-white">
                PHÂN TÍCH CHỈ SỐ CƠ THỂ
              </Text>
            </View>
          </View>

          {/* CHỈ SỐ CƠ THỂ 2 DÒNG THẲNG CỘT TẮP (PERFECT 4-COLUMN GRID) */}
          <View className="mb-4 gap-3 pb-3">
            {/* DÒNG 1 (4 CỘT BẰNG NHAU) */}
            <View className="flex-row items-center">
              {/* Cột 1: Điểm Sức Khỏe */}
              <View className="w-1/4 items-center border-r border-slate-200/60 py-1">
                <View className="relative items-center justify-center">
                  <Svg width="48" height="48" viewBox="0 0 100 100">
                    <Circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="12" fill="none" />
                    <Circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#DC2626"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray="251"
                      strokeDashoffset="50"
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </Svg>
                  <View className="absolute items-center justify-center">
                    <Text className="text-base font-black text-slate-900">
                      {inBodyData?.inBodyScore ?? '---'}
                    </Text>
                  </View>
                </View>
                <Text className="mt-1 font-bold text-xs uppercase text-slate-500">
                  Điểm Sức Khỏe
                </Text>
              </View>

              {/* Cột 2: Cân nặng */}
              <View className="w-1/4 items-center border-r border-slate-200/60 py-1">
                <Text className="font-bold text-xs uppercase text-slate-500">Cân Nặng</Text>
                <View className="mt-1 flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black text-slate-900">
                    {inBodyData?.weight ?? '---'}
                  </Text>
                  <Text className="font-bold text-xs text-slate-500">kg</Text>
                </View>
              </View>

              {/* Cột 3: Khối lượng cơ */}
              <View className="w-1/4 items-center border-r border-slate-200/60 py-1">
                <Text className="font-bold text-xs uppercase text-slate-500">Khối Lượng Cơ</Text>
                <View className="mt-1 flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black text-primary">
                    {inBodyData?.smm ?? '---'}
                  </Text>
                  <Text className="font-bold text-xs text-slate-500">kg</Text>
                </View>
              </View>

              {/* Cột 4: Tỷ lệ mỡ */}
              <View className="w-1/4 items-center py-1">
                <Text className="font-bold text-xs uppercase text-slate-500">Tỷ Lệ Mỡ</Text>
                <View className="mt-1 flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black text-slate-900">
                    {inBodyData?.pbf ?? '---'}
                  </Text>
                  <Text className="font-bold text-xs text-slate-500">%</Text>
                </View>
              </View>
            </View>

            {/* DÒNG 2 (4 CỘT BẰNG NHAU THẲNG HÀNG THẲNG CỘT) */}
            <View className="flex-row items-center border-t border-slate-200/60 pt-4">
              {/* Cột 1: BMI */}
              <View className="w-1/4 items-center border-r border-slate-200/60 py-1">
                <Text className="font-bold text-xs uppercase text-slate-500">Chỉ Số BMI</Text>
                <View className="mt-1 flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black text-slate-900">{bmi}</Text>
                  <Text className="font-bold text-xs text-slate-500">kg/m²</Text>
                </View>
              </View>

              {/* Cột 2: Tuổi cơ thể */}
              <View className="w-1/4 items-center border-r border-slate-200/60 py-1">
                <Text className="font-bold text-xs uppercase text-slate-500">Tuổi Cơ Thể</Text>
                <View className="mt-1 flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black text-slate-900">{bodyAge}</Text>
                  <Text className="font-bold text-xs text-slate-500">tuổi</Text>
                </View>
              </View>

              {/* Cột 3: Mỡ nội tạng */}
              <View className="w-1/4 items-center border-r border-slate-200/60 py-1">
                <Text className="font-bold text-xs uppercase text-slate-500">Mỡ Nội Tạng</Text>
                <View className="mt-1 flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black text-slate-900">
                    {visceralFat !== '---' ? `Level ${visceralFat}` : '---'}
                  </Text>
                </View>
              </View>

              {/* Cột 4: Nước TBW */}
              <View className="w-1/4 items-center py-1">
                <Text className="font-bold text-xs uppercase text-slate-500">Nước Cơ Thể</Text>
                <View className="mt-1 flex-row items-baseline gap-0.5">
                  <Text className="text-2xl font-black text-slate-900">{tbw}</Text>
                  <Text className="font-bold text-xs text-slate-500">L</Text>
                </View>
              </View>
            </View>
          </View>

          {/* EXTRA LARGE BODY SVG DIAGRAM VỚI TỰ DO KHÔNG THẺ CARD */}
          <View className="w-full items-center justify-center py-2">
            <Text className="mb-3 text-center text-sm font-black uppercase tracking-wider text-slate-800">
              PHÂN TÍCH VÙNG CƠ & MỠ
            </Text>

            <View className="relative min-h-[470px] w-full items-center justify-center">
              {/* Unified SVG Canvas: Body + Floating Text + Solid Pointer Lines */}
              <Svg width="100%" height="470" viewBox="0 0 700 470">
                {/* 1. SOLID CONNECTOR LINES & PURE SVG 1-HEAD ARROWHEADS */}
                {/* Line Tay Trái */}
                <Line x1="120" y1="80" x2="285" y2="140" stroke="#DC2626" strokeWidth="1.5" />

                {/* Line Tay Phải */}
                <Line x1="585" y1="70" x2="417" y2="140" stroke="#DC2626" strokeWidth="1.5" />

                {/* Line Thân Người */}
                <Line x1="585" y1="220" x2="380" y2="180" stroke="#DC2626" strokeWidth="1.5" />

                {/* Line Chân Trái */}
                <Line x1="120" y1="375" x2="315" y2="330" stroke="#DC2626" strokeWidth="1.5" />

                {/* Line Chân Phải */}
                <Line x1="587" y1="360" x2="387" y2="325" stroke="#DC2626" strokeWidth="1.5" />

                {/* 2. CLEAN FLOATING TEXT LABELS */}
                {/* Tay Trái */}
                <G>
                  <SvgText x="35" y="45" fontSize="16" fontWeight="bold" fill="#0F172A">
                    Tay Trái
                  </SvgText>
                  <SvgText x="35" y="68" fontSize="15" fontWeight="bold" fill="#DC2626">
                    Cơ: {inBodyData?.segmental?.ffmLeftArm?.toFixed(1) ?? '---'} kg
                  </SvgText>
                  <SvgText x="35" y="88" fontSize="15" fontWeight="bold" fill="#334155">
                    Mỡ: {inBodyData?.segmental?.bfmLeftArm?.toFixed(1) ?? '---'} kg
                  </SvgText>
                </G>

                {/* Tay Phải */}
                <G>
                  <SvgText x="590" y="35" fontSize="16" fontWeight="bold" fill="#0F172A">
                    Tay Phải
                  </SvgText>
                  <SvgText x="590" y="58" fontSize="15" fontWeight="bold" fill="#DC2626">
                    Cơ: {inBodyData?.segmental?.ffmRightArm?.toFixed(1) ?? '---'} kg
                  </SvgText>
                  <SvgText x="590" y="78" fontSize="15" fontWeight="bold" fill="#334155">
                    Mỡ: {inBodyData?.segmental?.bfmRightArm?.toFixed(1) ?? '---'} kg
                  </SvgText>
                </G>

                {/* Thân Người */}
                <G>
                  <SvgText x="590" y="205" fontSize="16" fontWeight="bold" fill="#0F172A">
                    Thân Người
                  </SvgText>
                  <SvgText x="590" y="228" fontSize="15" fontWeight="bold" fill="#DC2626">
                    Cơ: {inBodyData?.segmental?.ffmTrunk?.toFixed(1) ?? '---'} kg
                  </SvgText>
                  <SvgText x="590" y="248" fontSize="15" fontWeight="bold" fill="#334155">
                    Mỡ: {inBodyData?.segmental?.bfmTrunk?.toFixed(1) ?? '---'} kg
                  </SvgText>
                </G>

                {/* Chân Trái */}
                <G>
                  <SvgText x="35" y="355" fontSize="16" fontWeight="bold" fill="#0F172A">
                    Chân Trái
                  </SvgText>
                  <SvgText x="35" y="378" fontSize="15" fontWeight="bold" fill="#DC2626">
                    Cơ: {inBodyData?.segmental?.ffmLeftLeg?.toFixed(1) ?? '---'} kg
                  </SvgText>
                  <SvgText x="35" y="398" fontSize="15" fontWeight="bold" fill="#334155">
                    Mỡ: {inBodyData?.segmental?.bfmLeftLeg?.toFixed(1) ?? '---'} kg
                  </SvgText>
                </G>

                {/* Chân Phải */}
                <G>
                  <SvgText x="590" y="345" fontSize="16" fontWeight="bold" fill="#0F172A">
                    Chân Phải
                  </SvgText>
                  <SvgText x="590" y="368" fontSize="15" fontWeight="bold" fill="#DC2626">
                    Cơ: {inBodyData?.segmental?.ffmRightLeg?.toFixed(1) ?? '---'} kg
                  </SvgText>
                  <SvgText x="590" y="388" fontSize="15" fontWeight="bold" fill="#334155">
                    Mỡ: {inBodyData?.segmental?.bfmRightLeg?.toFixed(1) ?? '---'} kg
                  </SvgText>
                </G>

                {/* 3. CENTERED DETAILED BODY SVG */}
                <G transform="translate(195, 0)">
                  <SvgDetailedBody width={310} height={465} gender={gender} />
                </G>
              </Svg>
            </View>
          </View>
        </View>

        {/* ==================== 3. QUÉT MÃ QR & HOÀN TẤT PHIÊN ==================== */}
        <View className="flex-row items-center justify-between gap-4 overflow-hidden rounded-2xl border border-red-100/60 bg-white/90 p-4 backdrop-blur-md">
          <View className="flex-1 justify-between gap-3">
            <View>
              <Text className="text-xl font-black text-slate-900">
                Quét mã QR để xem kết quả chi tiết
              </Text>
              <Text className="mt-1 font-bold text-sm text-slate-500">
                Dùng Zalo, VNeID hoặc Camera điện thoại
              </Text>
            </View>

            {/* Nút Hoàn Tất / Tắt màn hình */}
            <Button
              label="HOÀN TẤT"
              variant="destructive"
              size="lg"
              onPress={handleFinish}
              textClassName="font-black uppercase tracking-wider text-white text-base"
            />
          </View>

          {/* Clean QR Code Display Box (Không viền) */}
          <View className="items-center justify-center rounded-xl bg-white p-1">
            <SvgQrCode size={105} />
          </View>
        </View>
      </View>
    </View>
  )
}
