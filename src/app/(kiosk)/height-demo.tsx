/**
 * @file height-demo.tsx
 * @brief Màn hình Demo & Hiệu Chuẩn Cảm Biến Đo Chiều Cao ToF VL53L5CX (Production Test Bench).
 * @module src/app/(kiosk)/height-demo.tsx
 *
 * Chức năng:
 * - Giám sát Realtime Heatmap ma trận 8x8 vùng đo (khoảng cách mm, chiều cao cm, cờ status).
 * - Hiển thị trực quan cụm đỉnh đầu, bàn tay giơ, tâm chuẩn crosshair (x0, y0).
 * - Dashboard HUD: Chiều cao tức thời/chốt, tiến trình ổn định progress 0-100%, mã trạng thái & hướng dẫn.
 * - Hỗ trợ cả 2 chế độ: Phần cứng thật (USB Serial 460800 baud) và Giả lập Mock Stream 15Hz.
 * - Bộ công cụ Hiệu chuẩn sàn Admin (Floor Calibration) thu thập 30 frames baseline.
 * - Bảng tinh chỉnh tham số trực tiếp: Chiều cao trần, Gain scale, Offset mm.
 * - Tích hợp hệ thống Giọng nói tiếng Việt (VoiceEngine) tự động nhắc nhở khi chuyển trạng thái.
 */

import {
  HeightMeasurementEngine,
  ToFDistanceDevice,
  type FloorCalibrationData,
  type HeightCalculationResult,
  type VL53L5CXFramePayload,
} from '@/core/hardware/tof'
import { voicePlayerService, type VoicePromptKey } from '@/core/voice-engine'
import { useAppNavigation } from '@/shared/hooks'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Crosshair,
  Gauge,
  Play,
  RotateCcw,
  Sliders,
  Square,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function KioskHeightDemoRoute() {
  const { navigateTo } = useAppNavigation()

  // Hardware Adapter & Engine References
  const tofDeviceRef = useRef<ToFDistanceDevice | null>(null)
  const engineRef = useRef<HeightMeasurementEngine>(
    new HeightMeasurementEngine({
      expectedFloorMm: 2460,
      calibration: {
        floorZ: new Array(64).fill(2460),
        floorOk: new Array(64).fill(true),
        refX0: 0,
        refY0: 0,
        calibratedAt: Date.now(),
      },
    }),
  )

  // Connection & Stream State
  const [isStreaming, setIsStreaming] = useState(false)
  const [isMockMode, setIsMockMode] = useState(false) // Mặc định mở Cổng Thật (USB)
  const [hardwareStatus, setHardwareStatus] = useState<string>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Realtime Data State
  const [currentFrame, setCurrentFrame] = useState<VL53L5CXFramePayload | null>(null)
  const [engineResult, setEngineResult] = useState<HeightCalculationResult | null>(null)
  const [fps, setFps] = useState<number>(0)
  const lastFrameTimeRef = useRef<number>(Date.now())
  const frameCounterRef = useRef<number>(0)

  // Voice Guidance State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const lastGuidanceRef = useRef<string>('')

  // Calibration Parameters State (Mặc định 2460mm = 246.0cm chiều cao gắn cảm biến setup: 210 + 21 + 15)
  const [expectedFloorMm, setCeilingHeightMm] = useState<number>(2460)
  const [gainScale, setGainScale] = useState<number>(1.0)
  const [offsetMm, setOffsetMm] = useState<number>(0)
  const [calibrationData, setCalibrationData] = useState<FloorCalibrationData | null>({
    floorZ: new Array(64).fill(2460),
    floorOk: new Array(64).fill(true),
    refX0: 0,
    refY0: 0,
    calibratedAt: Date.now(),
  })

  // Floor Calibration Admin Mode
  const [isCalibratingFloor, setIsCalibratingFloor] = useState(false)
  const calibrationFramesRef = useRef<VL53L5CXFramePayload[]>([])
  const [calibrationProgress, setCalibrationProgress] = useState(0)

  // Record Logs to File State
  const [isRecordingLog, setIsRecordingLog] = useState(false)
  const isRecordingLogRef = useRef(false)
  const recordedFramesRef = useRef<any[]>([])

  // Parameter Tuning Modal
  const [tuningModalVisible, setTuningModalVisible] = useState(false)

  // Khởi tạo lại Engine khi tham số hiệu chỉnh thay đổi
  const rebuildEngine = useCallback(
    (newCeiling: number, newGain: number, newOffset: number, newCalib?: FloorCalibrationData) => {
      const activeCalib = newCalib ??
        calibrationData ?? {
          floorZ: new Array(64).fill(newCeiling),
          floorOk: new Array(64).fill(true),
          refX0: 0,
          refY0: 0,
          calibratedAt: Date.now(),
        }

      engineRef.current = new HeightMeasurementEngine({
        expectedFloorMm: newCeiling,
        gainScale: newGain,
        offsetMm: newOffset,
        calibration: activeCalib,
      })
      if (tofDeviceRef.current) {
        tofDeviceRef.current.updateEngineConfig({
          expectedFloorMm: newCeiling,
          gainScale: newGain,
          offsetMm: newOffset,
          calibration: activeCalib,
        })
      }
    },
    [calibrationData],
  )

  // Dọn dẹp tài nguyên khi unmount
  useEffect(() => {
    return () => {
      if (tofDeviceRef.current) {
        tofDeviceRef.current.disconnect().catch(() => {})
        tofDeviceRef.current = null
      }
      voicePlayerService.stop().catch(() => {})
    }
  }, [])

  // Xử lý Voice Guidance tự động khi Engine đổi mã chỉ dẫn
  // Xử lý Voice Guidance tự động khi Engine đổi mã chỉ dẫn
  const handleAutoVoice = useCallback(
    (guidance: string, heightCm?: number) => {
      if (!isVoiceEnabled) return
      if (lastGuidanceRef.current === guidance) return

      lastGuidanceRef.current = guidance

      // Khi chốt kết quả đo: Phát âm số đo chiều cao chi tiết bằng tiếng Việt
      if (guidance === 'LOCKED') {
        if (heightCm && heightCm > 0) {
          voicePlayerService.speakHeightResult(heightCm)
        } else {
          voicePlayerService.speak('HEIGHT_COMPLETE')
        }
        return
      }

      let promptKey: VoicePromptKey | null = null
      switch (guidance) {
        case 'STEP_IN':
          promptKey = 'HEIGHT_STEP_IN'
          break
        case 'HOLD_STILL':
          promptKey = 'HEIGHT_HOLD_STILL'
          break
        case 'TIMEOUT':
          promptKey = 'HEIGHT_TIMEOUT'
          break
        default:
          break
      }

      if (promptKey) {
        voicePlayerService.speak(promptKey)
      }
    },
    [isVoiceEnabled],
  )

  // Xử lý Frame nhận được từ Driver
  const handleIncomingFrame = useCallback(
    (frame: VL53L5CXFramePayload) => {
      setCurrentFrame(frame)

      // 1. Tính toán FPS
      frameCounterRef.current++
      const now = Date.now()
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(frameCounterRef.current)
        frameCounterRef.current = 0
        lastFrameTimeRef.current = now
      }

      // 2. Chế độ thu thập frames Hiệu chuẩn sàn Admin
      // (Đã tạm thời bypass logic hiệu chuẩn khắt khe, nhưng vẫn nhận dạng baseline)
      if (isCalibratingFloor) {
        calibrationFramesRef.current.push(frame)
        setCalibrationProgress(calibrationFramesRef.current.length)

        if (calibrationFramesRef.current.length >= 30) {
          try {
            const result = engineRef.current.calibrateFloor(calibrationFramesRef.current)
            if (typeof result === 'object' && 'error' in result) {
              Alert.alert('Lỗi hiệu chuẩn', result.error)
            } else {
              const calib = engineRef.current.getBaseline()
              if (calib) {
                setCalibrationData(calib)
                setIsCalibratingFloor(false)
                calibrationFramesRef.current = []
                Alert.alert(
                  'Hiệu chuẩn sàn thành công',
                  `Đã tính toán xong baseline cho 64 zones. Số zone sàn chuẩn: ${calib.floorOk.filter(Boolean).length}/64`,
                )
              }
            }
          } catch (err: any) {
            setIsCalibratingFloor(false)
            Alert.alert('Lỗi hiệu chuẩn', err.message)
          }
        }
        return
      }

      // 3. Đưa vào 8 bước của Engine xử lý
      const result = engineRef.current.calculateHeight(frame)
      setEngineResult(result)

      // 4. Nếu đang ghi log, lưu frame vào danh sách (rút gọn)
      if (isRecordingLogRef.current) {
        recordedFramesRef.current.push({
          caseId: 'MANUAL_RECORDING',
          frameIdx: recordedFramesRef.current.length + 1,
          frameId: frame.frameId,
          timestampMs: frame.timestampMs,
          distances: frame.distances,
          targetStatuses: frame.targetStatuses,
          isValid: frame.isValid,
          engineResult: {
            state: result.state,
            measuredHeightCm: result.measuredHeightCm,
          },
        })
      }

      // 5. Phát giọng nói nếu có sự kiện mới
      const finalHeight =
        result.result?.heightCm ??
        (result.measuredHeightCm > 0 ? result.measuredHeightCm : undefined)
      handleAutoVoice(result.guidance, finalHeight)
    },
    [isCalibratingFloor, handleAutoVoice],
  )

  // Bắt đầu luồng đo
  const startStream = async () => {
    try {
      setErrorMessage(null)
      if (!tofDeviceRef.current) {
        tofDeviceRef.current = new ToFDistanceDevice({ expectedFloorMm })
      }
      const dev = tofDeviceRef.current

      dev.setMockMode(isMockMode)

      dev.onFrame((frame) => {
        handleIncomingFrame(frame)
      })

      dev.onStatusChange((status) => {
        setHardwareStatus(status)
        if (status === 'error') {
          setIsStreaming(false)
          setErrorMessage('Mất kết nối với Cảm biến ToF. Kiểm tra cáp USB hoặc baudrate 460800.')
        }
      })

      await dev.connect()
      engineRef.current.start()
      setIsStreaming(true)

      if (isVoiceEnabled) {
        voicePlayerService.speak('HEIGHT_START')
      }
    } catch (err: any) {
      setIsStreaming(false)
      setErrorMessage(err.message || 'Không thể kết nối cảm biến ToF')
    }
  }

  // Dừng luồng đo
  const stopStream = async () => {
    try {
      if (tofDeviceRef.current) {
        await tofDeviceRef.current.disconnect()
        tofDeviceRef.current = null
      }
      engineRef.current.stop()
      setIsStreaming(false)
      setHardwareStatus('idle')
      voicePlayerService.stop().catch(() => {})
    } catch (err: any) {
      setErrorMessage(err.message)
    }
  }

  // Reset Engine & Phiên đo
  const handleResetSession = () => {
    engineRef.current.reset()
    lastGuidanceRef.current = ''
    setEngineResult(null)
  }

  // Bắt đầu hiệu chuẩn sàn Admin
  const startFloorCalibration = () => {
    if (!isStreaming) {
      Alert.alert('Chưa bật Stream', 'Vui lòng nhấn Bắt đầu Stream trước khi hiệu chuẩn sàn.')
      return
    }
    Alert.alert(
      'Xác nhận Hiệu Chuẩn Sàn',
      'Đảm bảo sàn Kiosk hoàn toàn trống (không có người hoặc vật thể). Hệ thống sẽ thu thập 30 frames.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắt đầu',
          onPress: () => {
            calibrationFramesRef.current = []
            setCalibrationProgress(0)
            setIsCalibratingFloor(true)
          },
        },
      ],
    )
  }

  // Toggle ghi log & Lưu file .jsonl
  const toggleRecording = async () => {
    if (isRecordingLogRef.current) {
      // Kết thúc ghi và lưu file
      setIsRecordingLog(false)
      isRecordingLogRef.current = false
      if (recordedFramesRef.current.length === 0) {
        Alert.alert('Chưa có dữ liệu', 'Không có frame nào được ghi lại.')
        return
      }

      try {
        const fileUri = FileSystem.documentDirectory + `tof_recording_${Date.now()}.jsonl`
        const jsonlData = recordedFramesRef.current.map((f) => JSON.stringify(f)).join('\n')
        await FileSystem.writeAsStringAsync(fileUri, jsonlData, {
          encoding: FileSystem.EncodingType.UTF8,
        })

        Alert.alert(
          'Thành công',
          `Đã lưu ${recordedFramesRef.current.length} frames vào:\n${fileUri}\n\nBạn có thể dùng lệnh adb pull để lấy file về máy tính.`,
        )
      } catch (err: any) {
        Alert.alert('Lỗi lưu file', err.message)
      }
    } else {
      // Bắt đầu ghi
      recordedFramesRef.current = []
      setIsRecordingLog(true)
      isRecordingLogRef.current = true
    }
  }

  // Màu sắc Heatmap cho từng zone
  const getCellColor = (r: number, c: number, rawDist: number, status: number) => {
    if (status < 5 || status > 13 || status === 7 || status === 8) {
      return { bg: '#1E293B', text: '#64748B', isHead: false }
    }

    const cosVal =
      1.0 /
      Math.sqrt(
        1.0 +
          Math.pow(Math.tan((c - 3.5) * 0.09817), 2) +
          Math.pow(Math.tan((r - 3.5) * 0.09817), 2),
      )
    const z = rawDist * cosVal
    const h = Math.max(0, expectedFloorMm - z)

    // Nếu nằm trong cụm đỉnh đầu
    if (engineResult?.instantHeightMm && Math.abs(h - engineResult.instantHeightMm) <= 80) {
      return { bg: '#B45309', text: '#FDE68A', isHead: true }
    }

    // Phần thân / vai
    if (h >= 800) {
      return { bg: '#065F46', text: '#6EE7B7', isHead: false }
    }

    // Sàn nhà
    return { bg: '#0F172A', text: '#38BDF8', isHead: false }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-slate-950">
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigateTo('KIOSK_IDLE')}
            className="mr-4 rounded-xl bg-slate-800 p-3"
          >
            <ArrowLeft size={24} color="#94A3B8" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-extrabold tracking-wide text-white">
              CẢM BIẾN TOF VL53L5CX - DEMO & HIỆU CHUẨN
            </Text>
            <Text className="font-medium text-xs text-slate-400">
              Kiến trúc Tối Giản V6.0 Production • 15Hz (66ms) • Fast-Path Serial 460800 Baud
            </Text>
          </View>
        </View>

        {/* Status Badges */}
        <View className="flex-row items-center gap-3">
          <View
            className={`flex-row items-center rounded-full px-3 py-1.5 ${
              isStreaming ? 'border border-emerald-500 bg-emerald-950' : 'bg-slate-800'
            }`}
          >
            <View
              className={`mr-2 h-2.5 w-2.5 rounded-full ${isStreaming ? 'bg-emerald-400' : 'bg-slate-500'}`}
            />
            <Text
              className={`font-bold text-xs ${isStreaming ? 'text-emerald-300' : 'text-slate-400'}`}
            >
              {isStreaming
                ? `${isMockMode ? 'MOCK' : 'SERIAL'} 15Hz (${fps} FPS)`
                : hardwareStatus.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`rounded-xl p-2.5 ${isVoiceEnabled ? 'border border-cyan-500 bg-cyan-950' : 'bg-slate-800'}`}
          >
            {isVoiceEnabled ? (
              <Volume2 size={20} color="#22D3EE" />
            ) : (
              <VolumeX size={20} color="#64748B" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setTuningModalVisible(true)}
            className="rounded-xl border border-amber-500 bg-amber-950 p-2.5"
          >
            <Sliders size={20} color="#FBBF24" />
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage && (
        <View className="flex-row items-center border-b border-rose-900 bg-rose-950 px-6 py-2.5">
          <AlertTriangle size={18} color="#F43F5E" className="mr-2" />
          <Text className="flex-1 font-medium text-xs text-rose-200">{errorMessage}</Text>
        </View>
      )}

      {/* Main Content Layout */}
      <View className="flex-1 flex-row gap-4 p-4">
        {/* Left Column: Heatmap Ma trận 8x8 Zones */}
        <View className="flex-1 justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Crosshair size={18} color="#38BDF8" className="mr-2" />
              <Text className="font-bold text-sm text-slate-200">HEATMAP 8x8 (64 ZONES)</Text>
            </View>
            <Text className="font-mono text-xs text-slate-400">
              Frame #{currentFrame?.frameId ?? 0} | {currentFrame?.timestampMs ?? 0}ms
            </Text>
          </View>

          {/* 8x8 Grid Canvas */}
          <View className="aspect-square w-full justify-between rounded-xl border border-slate-700 bg-black p-1.5">
            {Array.from({ length: 8 }).map((_, r) => (
              <View key={`row-${r}`} className="my-0.5 flex-1 flex-row justify-between gap-1">
                {Array.from({ length: 8 }).map((__, c) => {
                  const idx = r * 8 + c
                  const rawDist = currentFrame?.distances[idx] ?? 0
                  const status = currentFrame?.targetStatuses[idx] ?? 0
                  const { bg, text, isHead } = getCellColor(r, c, rawDist, status)
                  const isCenter = (r === 3 || r === 4) && (c === 3 || c === 4)

                  return (
                    <View
                      key={`cell-${r}-${c}`}
                      style={{ backgroundColor: bg }}
                      className={`relative flex-1 items-center justify-center rounded ${
                        isHead ? 'border-2 border-amber-400' : ''
                      } ${isCenter && !isHead ? 'border border-cyan-800' : ''}`}
                    >
                      <Text style={{ color: text }} className="font-bold font-mono text-[10px]">
                        {rawDist > 0 ? `${rawDist}` : '-'}
                      </Text>
                      <Text className="font-mono text-[8px] text-slate-400">S{status}</Text>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>

          {/* Heatmap Legend */}
          <View className="flex-row items-center justify-around border-t border-slate-800 pt-3">
            <View className="flex-row items-center">
              <View className="mr-1.5 h-3 w-3 rounded border border-amber-400 bg-[#B45309]" />
              <Text className="text-[11px] text-amber-200">Đỉnh đầu (Head)</Text>
            </View>
            <View className="flex-row items-center">
              <View className="mr-1.5 h-3 w-3 rounded bg-[#065F46]" />
              <Text className="text-[11px] text-emerald-300">Thân/Vai</Text>
            </View>
            <View className="flex-row items-center">
              <View className="mr-1.5 h-3 w-3 rounded border border-cyan-500 bg-[#0F172A]" />
              <Text className="text-[11px] text-cyan-300">Sàn nhà</Text>
            </View>
          </View>
        </View>

        {/* Right Column: Dashboard HUD & Controls */}
        <View className="w-96 justify-between gap-3">
          {/* Main Height HUD Card */}
          <View className="rounded-2xl border border-cyan-500 bg-slate-900 p-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-bold text-xs uppercase tracking-wider text-cyan-400">
                KẾT QUẢ ĐO CHIỀU CAO
              </Text>
              <View
                className={`rounded-full px-2.5 py-1 ${
                  engineResult?.state === 'LOCKED'
                    ? 'border border-emerald-400 bg-emerald-950'
                    : engineResult?.state === 'HOLD_STILL'
                      ? 'border border-amber-400 bg-amber-950'
                      : 'bg-slate-800'
                }`}
              >
                <Text
                  className={`text-[10px] font-black uppercase ${
                    engineResult?.state === 'LOCKED'
                      ? 'text-emerald-300'
                      : engineResult?.state === 'HOLD_STILL'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                  }`}
                >
                  {engineResult?.state ?? 'IDLE'}
                </Text>
              </View>
            </View>

            {/* Giant Number Readout (Chạm để nghe thử phát âm kết quả) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const h =
                  engineResult?.result?.heightCm ??
                  (engineResult?.measuredHeightCm && engineResult.measuredHeightCm > 0
                    ? engineResult.measuredHeightCm
                    : engineResult?.instantHeightCm && engineResult.instantHeightCm > 0
                      ? engineResult.instantHeightCm
                      : 170.0)
                voicePlayerService.speakHeightResult(h)
              }}
              className="my-3 items-center justify-center"
            >
              <View className="flex-row items-center">
                <Text className="text-6xl font-black tracking-tighter text-white">
                  {engineResult?.measuredHeightCm
                    ? `${engineResult.measuredHeightCm.toFixed(1)}`
                    : engineResult?.instantHeightCm
                      ? `${engineResult.instantHeightCm.toFixed(1)}`
                      : '--.-'}
                </Text>
                <Volume2 size={20} color="#22D3EE" className="ml-2.5" />
              </View>
              <Text className="-mt-1 font-bold text-lg text-cyan-400">
                centimet (cm){' '}
                <Text className="text-[11px] font-normal text-slate-400">• chạm nghe đọc</Text>
              </Text>
            </TouchableOpacity>

            {/* Progress Stability Bar */}
            <View className="my-2">
              <View className="mb-1 flex-row justify-between">
                <Text className="font-semibold text-xs text-slate-300">
                  Độ ổn định (Hold Still)
                </Text>
                <Text className="font-bold font-mono text-xs text-cyan-300">
                  {Math.round((engineResult?.progress ?? 0) * 100)}%
                </Text>
              </View>
              <View className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <View
                  style={{ width: `${Math.round((engineResult?.progress ?? 0) * 100)}%` }}
                  className={`h-full rounded-full ${
                    engineResult?.isStable ? 'bg-emerald-400' : 'bg-cyan-400'
                  }`}
                />
              </View>
            </View>

            {/* Live Guidance Box */}
            <View className="mt-3 flex-row items-center rounded-xl border border-slate-700 bg-slate-800 p-3">
              {engineResult?.state === 'LOCKED' ? (
                <CheckCircle size={22} color="#34D399" className="mr-3" />
              ) : (
                <Activity size={22} color="#38BDF8" className="mr-3" />
              )}
              <View className="flex-1">
                <Text className="font-bold text-xs text-slate-200">
                  {engineResult?.guidanceMessage ?? 'Sẵn sàng đo chiều cao'}
                </Text>
                {engineResult?.result && (
                  <Text className="mt-0.5 font-mono text-[10px] text-emerald-400">
                    Độ tin cậy: {Math.round(engineResult.result.confidence * 100)}% • Mẫu:{' '}
                    {engineResult.result.sampleCount} frames
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Quick Stats Panel */}
          <View className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <Text className="mb-2 font-bold text-xs uppercase tracking-wider text-slate-400">
              THÔNG SỐ THỜI GIAN THỰC
            </Text>
            <View className="flex-row justify-between border-b border-slate-800 py-1">
              <Text className="text-xs text-slate-400">Số vùng đỉnh đầu:</Text>
              <Text className="font-mono text-xs text-slate-200">
                {engineResult?.headZoneCount ?? 0} zones
              </Text>
            </View>
            <View className="flex-row justify-between border-b border-slate-800 py-1">
              <Text className="text-xs text-slate-400">Khoảng cách trần:</Text>
              <Text className="font-mono text-xs text-slate-200">{expectedFloorMm} mm</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-xs text-slate-400">Số người đứng:</Text>
              <Text className="font-mono text-xs text-slate-200">
                {engineResult?.personCount ?? 0} người
              </Text>
            </View>
          </View>

          {/* Stream & Operation Controls */}
          <View className="gap-2.5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            {/* Mock vs Real Toggle */}
            <View className="flex-row rounded-xl bg-slate-800 p-1">
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isStreaming}
                onPress={() => setIsMockMode(false)}
                className={`flex-1 items-center justify-center rounded-lg py-2 ${
                  !isMockMode ? 'bg-cyan-600' : ''
                }`}
              >
                <Text
                  className={`font-bold text-xs ${!isMockMode ? 'text-white' : 'text-slate-400'}`}
                >
                  Cổng Thật (USB)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isStreaming}
                onPress={() => setIsMockMode(true)}
                className={`flex-1 items-center justify-center rounded-lg py-2 ${
                  isMockMode ? 'bg-cyan-600' : ''
                }`}
              >
                <Text
                  className={`font-bold text-xs ${isMockMode ? 'text-white' : 'text-slate-400'}`}
                >
                  Giả Lập (Mock)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Start / Stop Stream Button */}
            {!isStreaming ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={startStream}
                className="flex-row items-center justify-center rounded-xl bg-emerald-600 py-3.5"
              >
                <Play size={18} color="#FFFFFF" className="mr-2" />
                <Text className="text-sm font-black uppercase tracking-wider text-white">
                  Bắt Đầu Stream
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={stopStream}
                className="flex-row items-center justify-center rounded-xl bg-rose-600 py-3.5"
              >
                <Square size={18} color="#FFFFFF" className="mr-2" />
                <Text className="text-sm font-black uppercase tracking-wider text-white">
                  Dừng Stream
                </Text>
              </TouchableOpacity>
            )}

            {/* Floor Calibration & Reset Buttons */}
            <View className="mt-1 flex-row gap-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={startFloorCalibration}
                className="flex-1 flex-row items-center justify-center rounded-xl border border-cyan-500 bg-cyan-950 py-2.5"
              >
                <Gauge size={16} color="#38BDF8" className="mr-1.5" />
                <Text className="font-bold text-xs text-cyan-300">
                  {isCalibratingFloor ? `Thu thập ${calibrationProgress}/30...` : 'Hiệu Chuẩn Sàn'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleResetSession}
                className="flex-1 flex-row items-center justify-center rounded-xl border border-slate-700 bg-slate-800 py-2.5"
              >
                <RotateCcw size={16} color="#94A3B8" className="mr-1.5" />
                <Text className="font-bold text-xs text-slate-300">Reset Phiên</Text>
              </TouchableOpacity>
            </View>

            {/* Record Log Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={toggleRecording}
              className={`mt-1 flex-row items-center justify-center rounded-xl border py-2.5 ${
                isRecordingLog ? 'border-rose-500 bg-rose-950' : 'border-indigo-500 bg-indigo-950'
              }`}
            >
              <Activity size={16} color={isRecordingLog ? '#F43F5E' : '#818CF8'} className="mr-2" />
              <Text
                className={`font-bold text-xs ${isRecordingLog ? 'text-rose-300' : 'text-indigo-300'}`}
              >
                {isRecordingLog
                  ? `Đang ghi ${recordedFramesRef.current.length} frames (Bấm để Lưu)`
                  : 'Ghi Log ra File (.jsonl)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Parameter Tuning Modal */}
      <Modal
        visible={tuningModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTuningModalVisible(false)}
      >
        <View
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          className="flex-1 items-center justify-center p-6"
        >
          <View className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <View className="mb-4 flex-row items-center justify-between border-b border-slate-800 pb-4">
              <View className="flex-row items-center">
                <Wrench size={22} color="#FBBF24" className="mr-2.5" />
                <Text className="text-lg font-extrabold text-white">HIỆU CHỈNH THAM SỐ DRIVER</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setTuningModalVisible(false)}>
                <Text className="font-bold text-sm text-slate-400">Đóng</Text>
              </TouchableOpacity>
            </View>

            {/* Ceiling Height Adjustment */}
            <View className="mb-4">
              <Text className="mb-1 font-semibold text-xs text-slate-300">
                Chiều cao lắp cảm biến trần (Ceiling Height): {expectedFloorMm} mm
              </Text>
              <View className="mt-1 flex-row gap-2">
                {[-50, -10, 10, 50].map((delta) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    key={`c-${delta}`}
                    onPress={() => {
                      const updated = Math.max(1500, Math.min(3000, expectedFloorMm + delta))
                      setCeilingHeightMm(updated)
                      rebuildEngine(updated, gainScale, offsetMm)
                    }}
                    className="flex-1 items-center rounded-xl border border-slate-700 bg-slate-800 py-2.5"
                  >
                    <Text className="font-bold text-xs text-cyan-300">
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Presets */}
              <View className="mt-2 flex-row gap-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCeilingHeightMm(2460)
                    rebuildEngine(2460, gainScale, offsetMm)
                  }}
                  className={`flex-1 items-center rounded-xl border py-2 ${
                    expectedFloorMm === 2460
                      ? 'border-cyan-400 bg-cyan-950'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      expectedFloorMm === 2460 ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    Setup (246.0 cm)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCeilingHeightMm(2100)
                    rebuildEngine(2100, gainScale, offsetMm)
                  }}
                  className={`flex-1 items-center rounded-xl border py-2 ${
                    expectedFloorMm === 2100
                      ? 'border-cyan-400 bg-cyan-950'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      expectedFloorMm === 2100 ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    Mốc cũ (210.0 cm)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCeilingHeightMm(1847)
                    rebuildEngine(1847, gainScale, offsetMm)
                  }}
                  className={`flex-1 items-center rounded-xl border py-2 ${
                    expectedFloorMm === 1847
                      ? 'border-cyan-400 bg-cyan-950'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      expectedFloorMm === 1847 ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    Kiosk Cột (184.7 cm)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setCeilingHeightMm(2200)
                    rebuildEngine(2200, gainScale, offsetMm)
                  }}
                  className={`flex-1 items-center rounded-xl border py-2 ${
                    expectedFloorMm === 2200
                      ? 'border-cyan-400 bg-cyan-950'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <Text
                    className={`font-bold text-xs ${
                      expectedFloorMm === 2200 ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  >
                    Trần (220.0 cm)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gain Scale Adjustment */}
            <View className="mb-4">
              <Text className="mb-1 font-semibold text-xs text-slate-300">
                Tỉ lệ Gain Scale (Hồi quy thực nghiệm): {gainScale.toFixed(3)}
              </Text>
              <View className="mt-1 flex-row gap-2">
                {[-0.01, -0.002, 0.002, 0.01].map((delta) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    key={`g-${delta}`}
                    onPress={() => {
                      const updated = Math.max(0.9, Math.min(1.1, gainScale + delta))
                      setGainScale(updated)
                      rebuildEngine(expectedFloorMm, updated, offsetMm)
                    }}
                    className="flex-1 items-center rounded-xl border border-slate-700 bg-slate-800 py-2.5"
                  >
                    <Text className="font-bold text-xs text-amber-300">
                      {delta > 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Offset Adjustment */}
            <View className="mb-6">
              <Text className="mb-1 font-semibold text-xs text-slate-300">
                Offset mm bù sai số cố định: {offsetMm > 0 ? `+${offsetMm}` : offsetMm} mm
              </Text>
              <View className="mt-1 flex-row gap-2">
                {[-10, -5, 5, 10].map((delta) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    key={`o-${delta}`}
                    onPress={() => {
                      const updated = Math.max(-100, Math.min(100, offsetMm + delta))
                      setOffsetMm(updated)
                      rebuildEngine(expectedFloorMm, gainScale, updated)
                    }}
                    className="flex-1 items-center rounded-xl border border-slate-700 bg-slate-800 py-2.5"
                  >
                    <Text className="font-bold text-xs text-emerald-300">
                      {delta > 0 ? `+${delta}` : delta}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Test Voice Prompts */}
            <View className="mb-4 border-t border-slate-800 pt-4">
              <Text className="mb-2 font-semibold text-xs text-slate-400">
                Thử nghiệm các câu thoại:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { key: 'HEIGHT_START', label: 'Bắt đầu' },
                  { key: 'HEIGHT_HOLD_STILL', label: 'Đứng yên' },
                  { key: 'HEIGHT_COMPLETE', label: 'Đã xong' },
                ].map((item) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    key={item.key}
                    onPress={() =>
                      voicePlayerService.speak(item.key as VoicePromptKey, { force: true })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5"
                  >
                    <Text className="text-xs text-cyan-200">{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setTuningModalVisible(false)}
              className="items-center rounded-xl bg-cyan-600 py-3"
            >
              <Text className="text-sm font-extrabold text-white">ÁP DỤNG & LƯU THAY ĐỔI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
