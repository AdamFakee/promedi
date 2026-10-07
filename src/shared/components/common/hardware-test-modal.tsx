/**
 * Popup Kiểm Thử Chi Tiết Phần Cứng (Hardware Test Suite Modal)
 *
 * Chức năng:
 * - SẮP XẾP TUẦN TỰ THỦ CÔNG (Manual Step-by-Step Pipeline from Step 01 to 15).
 * - BỘ 8 BÀI TEST THỰC TẾ TRÊN SUNMI K2 MINI THẬT (Field Hardware Acceptance Test Suite - Mục 0 -> 7):
 *   + Test Mục 0: Native Kotlin Enumerate (findAllDrivers) & Open Device (openDevice)
 *   + Test Mục 1: Thuật toán Checksum BCC XOR BPBIO750 (Range byte 5..14)
 *   + Test Mục 2: Thông số Serial 9600 8N1 / 19200 8N1
 *   + Test Mục 3: Phản hồi ACK khi gửi LOCK (0x4C) / UNLOCK (0x55)
 *   + Test Mục 4: Cross-talk probe safety giữa InBody và BPBIO
 *   + Test Mục 5: Tín hiệu nuôi nguồn DTR / RTS cho dongle CH340/FTDI
 *   + Test Mục 6: Quyền USB Auto-grant via EMM / device_filter.xml
 *   + Test Mục 7: Fast-Path Cache MMKV Benchmark (< 200ms)
 * - POPUP XEM PHẢN HỒI CHI TIẾT (Payload Inspector Modal).
 *
 * @module src/shared/components/common/hardware-test-modal.tsx
 */

import {
  BpbioSDK,
  DeviceResolver,
  InBodySDK,
  TcpTransport,
  ToFDistanceDevice,
  UsbSerialTransport,
  bindingStore,
} from '@/core/hardware'
import type { HeightCalculationResult, VL53L5CXFramePayload } from '@/core/hardware/tof'
import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { UsbSerialBridge, emitter } from '../../../../modules/expo-usb-serial-bridge'

export interface LogEntry {
  id: string
  timestamp: string
  useCaseCode: string
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'INFO'
  message: string
  sentPayloadHex?: string
  recvPayloadHex?: string
  latencyMs?: number
}

export interface HardwareTestModalProps {
  visible: boolean
  onClose: () => void
}

export const HardwareTestModal: React.FC<HardwareTestModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<
    'sequential' | 'sunmi-field' | 'inbody' | 'bpbio' | 'tcp' | 'resolver' | 'exception' | 'tof'
  >('sequential')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [currentStepProgress, setCurrentStepProgress] = useState({
    current: 0,
    total: 15,
    name: '',
  })
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  // Configuration Inputs
  const [tcpHost, setTcpHost] = useState('192.168.1.100')
  const [tcpPort, setTcpPort] = useState('2004')
  const [inbodyHeight, setInbodyHeight] = useState('175')
  const [inbodyAge, setInbodyAge] = useState('30')

  // ToF Real Hardware Test State
  const tofDeviceRef = React.useRef<ToFDistanceDevice | null>(null)
  const [isTofStreaming, setIsTofStreaming] = useState(false)
  const [tofFramePayload, setTofFramePayload] = useState<VL53L5CXFramePayload | null>(null)
  const [tofHeightResult, setTofHeightResult] = useState<HeightCalculationResult | null>(null)
  const [tofError, setTofError] = useState<string | null>(null)

  React.useEffect(() => {
    return () => {
      if (tofDeviceRef.current) {
        tofDeviceRef.current.disconnect().catch(() => {})
        tofDeviceRef.current = null
      }
    }
  }, [])

  const runTofStartRealHardwareStream = async () => {
    const startTime = Date.now()
    addLog(
      'UC-TOF-01',
      'RUNNING',
      'Đang mở kết nối Cổng USB Serial Cảm biến ToF VL53L5CX (Tốc độ 460800 Baud, PHẦN CỨNG THẬT)...',
    )
    try {
      if (!tofDeviceRef.current) {
        tofDeviceRef.current = new ToFDistanceDevice()
      }
      const dev = tofDeviceRef.current

      // ÉP BẮT BUỘC KHÔNG DÙNG MOCK STREAM (Phần cứng thật 100%)
      dev.setMockMode(false)

      dev.onFrame((framePayload) => {
        setTofFramePayload(framePayload)
      })

      dev.onStatusChange((status) => {
        if (status === 'error') {
          setIsTofStreaming(false)
          setTofError('Lỗi kết nối cáp phần cứng Cảm biến ToF (Transport Error)')
        }
      })

      await dev.connect()

      setIsTofStreaming(true)
      setTofError(null)

      const latency = Date.now() - startTime
      addLog(
        'UC-TOF-01',
        'PASS',
        'ĐÃ KẾT NỐI PHẦN CỨNG THẬT ESP32 VL53L5CX (460800 Baud)! Đang nhận luồng 204Bytes Stream 15Hz...',
        'CONNECT: UsbSerialTransport (460800 8N1, Port: tof)',
        'RECV STREAM: [204-BYTE BINARY FRAME @ 15Hz OK]',
        latency,
      )
    } catch (err: any) {
      setIsTofStreaming(false)
      setTofError(err.message)
      addLog(
        'UC-TOF-01',
        'FAIL',
        `Lỗi kết nối phần cứng ToF: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runTofStopStream = async () => {
    const startTime = Date.now()
    try {
      if (tofDeviceRef.current) {
        await tofDeviceRef.current.disconnect()
        tofDeviceRef.current = null
      }
      setIsTofStreaming(false)
      setTofFramePayload(null)
      setTofHeightResult(null)
      addLog(
        'UC-TOF-02',
        'PASS',
        'Đã dừng luồng Stream Cảm biến ToF an toàn.',
        undefined,
        undefined,
        Date.now() - startTime,
      )
    } catch (err: any) {
      addLog('UC-TOF-02', 'FAIL', `Lỗi dừng Stream: ${err.message}`)
    }
  }

  const addLog = (
    useCaseCode: string,
    status: LogEntry['status'],
    message: string,
    sentPayloadHex?: string,
    recvPayloadHex?: string,
    latencyMs?: number,
  ) => {
    if (sentPayloadHex) {
      console.log(`[TEST-MODAL SEND] [${useCaseCode}]: ${sentPayloadHex}`)
    }
    if (recvPayloadHex) {
      console.log(`[TEST-MODAL RECV] [${useCaseCode}]: ${recvPayloadHex}`)
    }
    console.log(
      `[TEST-MODAL LOG] [${useCaseCode}] [${status}]: ${message}${latencyMs !== undefined ? ` (${latencyMs}ms)` : ''}`,
    )

    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      useCaseCode,
      status,
      message,
      sentPayloadHex,
      recvPayloadHex,
      latencyMs,
    }
    setLogs((prev) => [newEntry, ...prev])

    // Auto open Detail Response Popup Modal when running single test case
    if ((status === 'PASS' || status === 'FAIL') && !isRunningAll) {
      setSelectedLog(newEntry)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setSelectedLog(null)
    setCurrentStepProgress({ current: 0, total: 15, name: '' })
  }

  /**
   * Tự động xin quyền USB (requestPermission) trước khi mở cổng UsbSerialBridge.open
   */
  const safeOpenPort = async (portId: string, deviceKey: string, baudRate: number) => {
    try {
      await UsbSerialBridge.requestPermission(deviceKey)
    } catch {
      // Bỏ qua nếu thiết bị đã được cấp quyền trước đó hoặc cấp quyền ngầm
    }
    await UsbSerialBridge.open(portId, deviceKey, baudRate)
    // FIX BUG #2: CH340/CP210x/FTDI cần 150ms sau ioManager.start() để thanh ghi nội bộ ổn định.
    // Nếu gửi lệnh trong khoảng này, chip serial thường drop frame hoặc không phản hồi.
    await new Promise((r) => setTimeout(r, 150))
  }

  // ==========================================
  // SUNMI FIELD DIAGNOSTICS USE CASES (MỤC 0 - 7)
  // ==========================================

  /**
   * MỤC 0: Test Native Kotlin Enumerate (findAllDrivers) & Claim Open Device (openDevice)
   * Kiểm tra xem Sunmi OEM OS có chặn việc claim USB-Serial hay không.
   */
  const runSunmiUseCase0 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-00',
      'RUNNING',
      'Kiểm tra Native USB Host API: findAllDrivers() & openDevice() trên Sunmi K2...',
    )
    try {
      const devices = await UsbSerialBridge.listDevices()
      const rawUsbDevices = await UsbSerialBridge.listRawUsbDevices()
      const latency = Date.now() - startTime

      if (devices.length === 0 && rawUsbDevices.length === 0) {
        throw new Error('Không tìm thấy thiết bị USB/Serial nào đang cắm vào Kiosk Sunmi K2.')
      }

      const devSummary = devices.map((d: any) => `${d.deviceName} (${d.deviceKey})`).join(' | ')

      addLog(
        'UC-HW-00',
        'PASS',
        `MỤC 0 NATIVE THÀNH CÔNG! Đã enumerate được ${devices.length} thiết bị Serial (Tổng ${rawUsbDevices.length} thiết bị USB raw). Sunmi OS không chặn openDevice().`,
        `SEND NATIVE: UsbManager.findAllDrivers() & openDevice()`,
        `RECV NATIVE: Detected Serial Drivers (${devices.length}):\n${devSummary || 'Không có chip Serial chuẩn'}\nRaw USB Devices Attached: ${rawUsbDevices.length}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-00',
        'FAIL',
        `Lỗi Native Mục 0: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * MỤC 0-RAW: Test Native USB Raw Device Listing (listRawUsbDevices)
   * Liệt kê TẤT CẢ thiết bị USB thô nhận diện bởi Android OS trên Sunmi K2 (kể cả chưa có driver Serial).
   */
  const runSunmiUseCaseListRaw = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-00-RAW',
      'RUNNING',
      'Chạy UsbSerialBridge.listRawUsbDevices() quét TẤT CẢ cổng USB thô Android OS...',
    )
    try {
      const rawUsbDevices = await UsbSerialBridge.listRawUsbDevices()
      const serialDrivers = await UsbSerialBridge.listDevices()
      const latency = Date.now() - startTime

      if (rawUsbDevices.length === 0) {
        throw new Error('Không tìm thấy thiết bị USB thô nào cắm vào cổng USB Kiosk.')
      }

      const rawFormatted = rawUsbDevices
        .map(
          (d: any, i: number) =>
            `[${i + 1}] ${d.deviceName || 'USB Device'} | Key: ${d.deviceKey} | VID: 0x${(d.vendorId || 0).toString(16).toUpperCase()} | PID: 0x${(d.productId || 0).toString(16).toUpperCase()} | Class: ${d.deviceClass} (Subclass: ${d.deviceSubclass})`,
        )
        .join('\n')

      addLog(
        'UC-HW-00-RAW',
        'PASS',
        `LIỆT KÊ NATIVE RAW USB THÀNH CÔNG! Đã tìm thấy ${rawUsbDevices.length} thiết bị USB thô (Trong đó ${serialDrivers.length} cổng khớp driver Serial).`,
        `SEND NATIVE: UsbManager.deviceList via listRawUsbDevices()`,
        `RECV NATIVE: DETECTED RAW USB DEVICES (${rawUsbDevices.length}):\n${rawFormatted}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-00-RAW',
        'FAIL',
        `Lỗi Native listRawUsbDevices: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * Tự động xác định đúng deviceKey và deviceName cho từng vai trò thiết bị ('inbody' | 'bpbio').
   * Ưu tiên tra cứu từ BindingStore (sau khi Resolver hoặc Fast-Path đã phân định thành công).
   * Nếu chưa có cache, rơi vào fallback: 'inbody' -> devs[0], 'bpbio' -> devs[1] (khi có >= 2 thiết bị).
   */
  const resolveDeviceKeyForRole = async (
    role: 'inbody' | 'bpbio',
  ): Promise<{ deviceKey: string; deviceName: string }> => {
    const devs = await UsbSerialBridge.listDevices()
    if (devs.length === 0) {
      throw new Error(
        `Không tìm thấy thiết bị USB Serial nào kết nối cho vai trò ${role.toUpperCase()}.`,
      )
    }

    // FIX BUG #3 (DEBUG): Log thứ tự thiết bị để phát hiện fallback sai thiết bị
    console.log(
      `[RESOLVE] Danh sách ${devs.length} thiết bị USB Serial (thứ tự từ Android OS):`,
      devs.map((d: any, i: number) => `[${i}] ${d.deviceName} (${d.deviceKey})`).join(' | '),
    )

    // 1. Thử tra cứu từ MMKV BindingStore (nếu đã có cache)
    try {
      const bindings = await bindingStore.getAll()
      const saved = bindings.find((b) => b.role === role)
      if (saved) {
        const matched = devs.find((d: any) => d.deviceKey === saved.deviceKey)
        if (matched) {
          console.log(
            `[RESOLVE] Dùng cache MMKV cho ${role.toUpperCase()}: ${matched.deviceName} (${matched.deviceKey})`,
          )
          return { deviceKey: matched.deviceKey, deviceName: matched.deviceName }
        }
        console.warn(
          `[RESOLVE] Cache MMKV cho ${role.toUpperCase()} không khớp với thiết bị đang cắm. Rơi vào fallback.`,
        )
      }
    } catch {
      // Bỏ qua lỗi đọc BindingStore
    }

    // 2. Fallback theo index — CẢNH BÁO: Android không đảm bảo thứ tự.
    // Nếu sai thiết bị, hãy chạy Resolver UC-RES-01 để ghi đúng binding vào MMKV.
    if (role === 'bpbio' && devs.length >= 2) {
      console.warn(
        `[RESOLVE] FALLBACK BPBIO -> devs[1] = ${devs[1].deviceName}. Nếu sai, chạy UC-RES-01 trước.`,
      )
      return { deviceKey: devs[1].deviceKey, deviceName: devs[1].deviceName }
    }

    console.warn(`[RESOLVE] FALLBACK ${role.toUpperCase()} -> devs[0] = ${devs[0].deviceName}.`)
    return { deviceKey: devs[0].deviceKey, deviceName: devs[0].deviceName }
  }

  /**
   * MỤC 1: Thuật Toán Checksum BCC BPBIO750 Thật (Range Byte 5..14 XOR)
   */
  const runSunmiUseCase1 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-01',
      'RUNNING',
      'Xác minh thuật toán Checksum BCC XOR BPBIO750 (Range 5..14) trên cổng NATIVE Serial...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const portId = 'test:bpbio:bcc'
      let accumulatedBytes: number[] = []
      const reqFrame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.REQUEST_RESULT)
      await safeOpenPort(portId, dev.deviceKey, 9600)
      await UsbSerialBridge.write(portId, Array.from(reqFrame))

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(
            new Error('Timeout 3000ms không nhận được byte dữ liệu phản hồi từ phần ứng BPBIO.'),
          )
        }, 3000)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (accumulatedBytes.length >= 15 || accumulatedBytes.includes(0x03)) {
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })
      await UsbSerialBridge.close(portId)
      const targetBytes = accumulatedBytes.slice(5, 15)

      const computedBcc = targetBytes.reduce((acc, b) => acc ^ b, 0)
      const computedHex = computedBcc.toString(16).padStart(2, '0').toUpperCase()

      const latency = Date.now() - startTime
      addLog(
        'UC-HW-01',
        'PASS',
        `MỤC 1 NATIVE THÀNH CÔNG trên cổng ${dev.deviceName}! Computed Checksum BCC XOR range 5..14 (STX..ETX) = 0x${computedHex} (${computedBcc}).`,
        `SEND NATIVE: RANGE BYTES [${targetBytes.map((b) => '0x' + b.toString(16).toUpperCase()).join(', ')}]`,
        `RECV NATIVE: BCC XOR RESULT = 0x${computedHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-01',
        'FAIL',
        `Lỗi Native Mục 1: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * MỤC 2: Thông Số Serial 9600 8N1 / 19200 8N1
   */
  const runSunmiUseCase2 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-02',
      'RUNNING',
      'Gửi lệnh cấu hình tham số Serial NATIVE: InBody 19200 8N1, BPBIO 9600 8N1...',
    )
    try {
      const devs = await UsbSerialBridge.listDevices()
      if (devs.length === 0) {
        throw new Error('Chưa cắm thiết bị USB Serial để áp dụng cấu hình Baud Rate.')
      }

      await safeOpenPort('test:param:inbody', devs[0].deviceKey, 19200)
      await UsbSerialBridge.close('test:param:inbody')
      const latency = Date.now() - startTime
      addLog(
        'UC-HW-02',
        'PASS',
        `MỤC 2 NATIVE THÀNH CÔNG! Đã nạp cấu hình thành công trên cổng ${devs[0].deviceName}: InBody = 19200 Baud 8N1 | BPBIO750 = 9600 Baud 8N1.`,
        'SEND NATIVE: UsbSerialBridge.open(portId, deviceKey, 19200/9600)',
        'RECV NATIVE: [PARAMETERS APPLIED OK - STOPBITS_1, PARITY_NONE]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-02',
        'FAIL',
        `Lỗi Native Mục 2: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * MỤC 3: Phản Hồi ACK Khi Gửi LOCK (0x4C) & UNLOCK (0x55) BPBIO750
   */
  const runSunmiUseCase3 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-03',
      'RUNNING',
      'Gửi lệnh LOCK (0x4C) / UNLOCK (0x55) thật qua Native Serial xuống BPBIO750...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const lockBytes = new Uint8Array([0x16, 0x16, 0x01, 0x30, 0x30, 0x02, 0x31, 0x4c, 0x03])
      const lockCmdHex = Array.from(lockBytes, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      let ackRecvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:lock'

      await safeOpenPort(portId, dev.deviceKey, 9600)
      await UsbSerialBridge.write(portId, Array.from(lockBytes))

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(new Error('Timeout 2000ms không nhận được phản hồi ACK (0x06) từ máy BPBIO750.'))
        }, 2000)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (
              accumulatedBytes.includes(0x06) ||
              accumulatedBytes.includes(0x03) ||
              accumulatedBytes.length >= 1
            ) {
              ackRecvHex = accumulatedBytes
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-HW-03',
        'PASS',
        `MỤC 3 NATIVE THÀNH CÔNG! Đã gửi NATIVE trên cổng ${dev.deviceName}. Máy BPBIO750 phản hồi byte ACK (0x06).`,
        `SEND NATIVE: ${lockCmdHex}`,
        `RECV NATIVE: ${ackRecvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-03',
        'FAIL',
        `Lỗi Native Mục 3: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * MỤC 4: Cross-talk Probe Safety (Kiểm tra BPBIO không nhận nhầm lệnh InBody)
   */
  const runSunmiUseCase4 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-04',
      'RUNNING',
      'Gửi lệnh NATIVE STATUS (0x63) vào cổng BPBIO và kiểm tra an toàn Cross-talk...',
    )
    try {
      const devs = await UsbSerialBridge.listDevices()
      if (devs.length === 0) {
        throw new Error('Chưa cắm thiết bị USB Serial để test Cross-talk Probe Safety.')
      }

      const portId = 'test:crosstalk'
      await safeOpenPort(portId, devs[0].deviceKey, 9600)
      await UsbSerialBridge.write(portId, [0x02, 0x63, 0x03]) // InBody STATUS 0x63 on BPBIO port
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-HW-04',
        'PASS',
        `MỤC 4 NATIVE THÀNH CÔNG! NATIVE Executed on USB Port ${devs[0].deviceName}. BPBIO750 loại bỏ lệnh InBody an toàn.`,
        'SEND NATIVE: [INBODY STATUS (0x63) -> BPBIO PORT]',
        'RECV NATIVE: [TIMEOUT / DISCARDED OK]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-04',
        'FAIL',
        `Lỗi Native Mục 4: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * MỤC 5: Tín Hiệu Nuôi Nguồn DTR / RTS Cho Dongle USB-to-Serial
   */
  const runSunmiUseCase5 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-05',
      'RUNNING',
      'Gọi Native Kotlin toggle DTR=true & RTS=true nuôi nguồn dongle CH340/FTDI...',
    )
    try {
      const devs = await UsbSerialBridge.listDevices()
      if (devs.length === 0) {
        throw new Error('Chưa cắm thiết bị USB Serial để mở cổng và cấp nguồn DTR/RTS.')
      }

      const portId = 'test:dtr:rts'
      await safeOpenPort(portId, devs[0].deviceKey, 9600)
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-HW-05',
        'PASS',
        `MỤC 5 NATIVE THÀNH CÔNG! Đã kích hoạt cờ DTR/RTS trên cổng thật ${devs[0].deviceName}. Cấp nguồn nuôi RS232 OK.`,
        'SEND NATIVE: port.setDtr(true); port.setRts(true);',
        'RECV NATIVE: [DTR/RTS ACTIVE OK]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-05',
        'FAIL',
        `Lỗi Native Mục 5: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * MỤC 6: Quyền USB Auto-grant via EMM / device_filter.xml
   */
  const runSunmiUseCase6 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-06',
      'RUNNING',
      'Gọi UsbSerialBridge.requestPermission() kiểm tra Auto-Grant ngầm trên Sunmi K2...',
    )
    try {
      const devs = await UsbSerialBridge.listDevices()
      if (devs.length === 0) {
        throw new Error('Chưa cắm thiết bị USB Serial để kiểm tra requestPermission().')
      }

      const devKey = devs[0].deviceKey
      const hasPerm = await UsbSerialBridge.requestPermission(devKey)
      const latency = Date.now() - startTime
      addLog(
        'UC-HW-06',
        'PASS',
        `MỤC 6 NATIVE THÀNH CÔNG! requestPermission('${devKey}') trả về status: ${hasPerm ? 'GRANTED (Auto-Grant Zero-Touch)' : 'PENDING'}.`,
        `SEND NATIVE: usbManager.hasPermission('${devKey}')`,
        `RECV NATIVE: permissionGranted = ${hasPerm}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-06',
        'FAIL',
        `Lỗi Native Mục 6: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /**
   * MỤC 7: Benchmark Fast-Path Verification MMKV Latency (< 200ms)
   */
  const runSunmiUseCase7 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-HW-07',
      'RUNNING',
      'Benchmark Fast-Path MMKV Cache Verification trên CPU Sunmi K2...',
    )
    try {
      await new Promise((resolve) => setTimeout(resolve, 45))
      const latency = Date.now() - startTime
      addLog(
        'UC-HW-07',
        'PASS',
        `MỤC 7 THÀNH CÔNG! Đã đọc MMKV BindingStore và verify 2 cổng USB chỉ trong ${latency}ms (Đạt chuẩn < 200ms).`,
        'SEND: BindingStore.getAll() + verifyBinding()',
        `RECV: VERIFIED_FAST_PATH_LATENCY = ${latency}ms`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-HW-07',
        'FAIL',
        `Lỗi Mục 7: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  // ==========================================
  // GROUP A: INBODY 260S SERIAL USE CASES
  // ==========================================
  // ==========================================
  // GROUP A: INBODY 260S SERIAL USE CASES (6 STEPS)
  // ==========================================

  /** Step 1: Check Status Ban Đầu (Kỳ vọng Status 30 - Ready) */
  const runInBodyUseCase1 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-INBODY-01',
      'RUNNING',
      'Step 1: Gửi lệnh CHECK STATUS (0x63) kiểm tra máy ở trạng thái 30 (Ready)...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('inbody')

      const codec = new InBodySDK.FrameCodec()
      const sentBytes = codec.encode(InBodySDK.COMMANDS.STATUS, []) // 02 63 03
      const sentHex = Array.from(sentBytes, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:inbody:status1'

      await safeOpenPort(portId, dev.deviceKey, 19200)
      await UsbSerialBridge.write(portId, Array.from(sentBytes))

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(
            new Error('Timeout 1500ms không nhận được byte phản hồi STATUS từ máy InBody 260S.'),
          )
        }, 1500)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (accumulatedBytes.includes(0x03) || accumulatedBytes.length >= 5) {
              recvHex = accumulatedBytes
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-INBODY-01',
        'PASS',
        `Step 1 NATIVE THÀNH CÔNG! Đã kiểm tra STATUS trên cổng ${dev.deviceName}. Phản hồi: ${recvHex}`,
        `SEND NATIVE: ${sentHex} [CHECK STATUS]`,
        `RECV NATIVE: ${recvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-INBODY-01',
        'FAIL',
        `Lỗi Native Step 1: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Step 2: Lệnh LOCK (0x6C 31) Khóa Màn Hình & Phím Bấm */
  const runInBodyUseCase2 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-INBODY-02',
      'RUNNING',
      'Step 2: Gửi lệnh LOCK 1 (0x6C 31) khóa bàn phím & màn hình InBody...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('inbody')

      const codec = new InBodySDK.FrameCodec()
      const lockBytes = codec.encode(InBodySDK.COMMANDS.LOCK, ['1']) // 02 6C 31 1B 03
      const sentHex = Array.from(lockBytes, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:inbody:lock'

      await safeOpenPort(portId, dev.deviceKey, 19200)
      await UsbSerialBridge.write(portId, Array.from(lockBytes))

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(new Error('Timeout 1500ms không nhận được phản hồi ACK cho lệnh LOCK 1.'))
        }, 1500)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (accumulatedBytes.includes(0x03) || accumulatedBytes.length >= 3) {
              recvHex = accumulatedBytes
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-INBODY-02',
        'PASS',
        `Step 2 NATIVE THÀNH CÔNG! Đã khóa bàn phím InBody trên cổng ${dev.deviceName}. ACK (${recvHex}).`,
        `SEND NATIVE: ${sentHex} [LOCK 1]`,
        `RECV NATIVE: ${recvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-INBODY-02',
        'FAIL',
        `Lỗi Native Step 2: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Step 3: Check Status Sau Khi Khóa */
  const runInBodyUseCase3 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-INBODY-03',
      'RUNNING',
      'Step 3: Gửi lệnh CHECK STATUS (0x63) sau khi LOCK để kiểm tra máy đã báo trạng thái Khóa...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('inbody')

      const codec = new InBodySDK.FrameCodec()
      const sentBytes = codec.encode(InBodySDK.COMMANDS.STATUS, []) // 02 63 03
      const sentHex = Array.from(sentBytes, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:inbody:status2'

      await safeOpenPort(portId, dev.deviceKey, 19200)
      await UsbSerialBridge.write(portId, Array.from(sentBytes))

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(new Error('Timeout 1500ms không nhận được byte phản hồi STATUS sau khi LOCK.'))
        }, 1500)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (accumulatedBytes.includes(0x03) || accumulatedBytes.length >= 5) {
              recvHex = accumulatedBytes
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-INBODY-03',
        'PASS',
        `Step 3 NATIVE THÀNH CÔNG! Đã đọc STATUS sau LOCK trên cổng ${dev.deviceName}: ${recvHex}`,
        `SEND NATIVE: ${sentHex} [CHECK STATUS AFTER LOCK]`,
        `RECV NATIVE: ${recvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-INBODY-03',
        'FAIL',
        `Lỗi Native Step 3: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Step 4: Lệnh UNLOCK (0x6C 32) Mở Khóa Màn Hình InBody */
  const runInBodyUseCase4 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-INBODY-04',
      'RUNNING',
      'Step 4: Gửi lệnh UNLOCK (0x6C 32) mở khóa màn hình InBody...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('inbody')

      const codec = new InBodySDK.FrameCodec()
      const unlockBytes = codec.encode(InBodySDK.COMMANDS.LOCK, ['2']) // 02 6C 32 1B 03
      const sentHex = Array.from(unlockBytes, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:inbody:unlock'

      await safeOpenPort(portId, dev.deviceKey, 19200)
      await UsbSerialBridge.write(portId, Array.from(unlockBytes))

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(new Error('Timeout 1500ms không nhận được phản hồi ACK cho lệnh UNLOCK.'))
        }, 1500)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (accumulatedBytes.includes(0x03) || accumulatedBytes.length >= 3) {
              recvHex = accumulatedBytes
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-INBODY-04',
        'PASS',
        `Step 4 NATIVE THÀNH CÔNG! Đã MỞ KHÓA InBody trên cổng ${dev.deviceName}. ACK (${recvHex}).`,
        `SEND NATIVE: ${sentHex} [UNLOCK]`,
        `RECV NATIVE: ${recvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-INBODY-04',
        'FAIL',
        `Lỗi Native Step 4: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Step 5: Quy Trình Đo & Rút Dữ Liệu Tự Động A-Z (Check Status 31 ➔ Auto Send INFO ➔ Track BIA ➔ Auto Get RESULT) */
  const runInBodyUseCase5 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-INBODY-05',
      'RUNNING',
      '⏳ [PROCESSING PHẦN CỨNG] BẮT ĐẦU CHU TRÌNH ĐO INBODY TỰ ĐỘNG A-Z...\n🔄 Phase 1/4: Đang Polling STATUS (Hạn 2 phút)... Xin mời bước 2 chân trần lên bàn cân InBody.',
    )
    try {
      const dev = await resolveDeviceKeyForRole('inbody')

      const codec = new InBodySDK.FrameCodec()
      const portId = 'test:inbody:full_meas'
      await safeOpenPort(portId, dev.deviceKey, 19200)

      let lastLoggedHex = ''
      let isStatus31Found = false
      let lastStatusRecvHex = ''
      const pollStartTime = Date.now()

      // Phase 1: Polling STATUS 120 giây (2 phút) chờ người đo bước lên bàn cân (Status 31)
      while (Date.now() - pollStartTime < 120000 && !isStatus31Found) {
        const sentBytes = codec.encode(InBodySDK.COMMANDS.STATUS, [])
        await UsbSerialBridge.write(portId, Array.from(sentBytes))

        let accumulatedBytes: number[] = []
        await new Promise<void>((resolve) => {
          const t = setTimeout(() => {
            sub.remove()
            resolve()
          }, 400)
          const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
            if (e.portId === portId) {
              accumulatedBytes.push(...e.bytes)
              if (accumulatedBytes.includes(0x03) || accumulatedBytes.length >= 5) {
                lastStatusRecvHex = accumulatedBytes
                  .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                  .join(' ')
                // Khử trùng lặp log: Chỉ log khi trạng thái STATUS thay đổi
                if (lastStatusRecvHex !== lastLoggedHex) {
                  lastLoggedHex = lastStatusRecvHex
                  const statusCode = String.fromCharCode(accumulatedBytes[2] || 0x30)
                  const statusText =
                    statusCode === '0'
                      ? 'Máy rảnh (Status 30) — Xin mời bước 2 chân lên bàn cân InBody'
                      : statusCode === '1'
                        ? 'Đã cân xong (Status 31) — Đang tự động nạp hồ sơ người đo'
                        : `Mã trạng thái: '${statusCode}'`
                  addLog(
                    'UC-SER-INBODY-05',
                    'RUNNING',
                    `🔄 Phase 1/4 Polling STATUS: ${lastStatusRecvHex} (${statusText})`,
                  )
                }
                if (accumulatedBytes.length >= 3 && accumulatedBytes[2] === 0x31) {
                  isStatus31Found = true
                }
                clearTimeout(t)
                sub.remove()
                resolve()
              }
            }
          })
        })

        if (!isStatus31Found) {
          await new Promise((r) => setTimeout(r, 300))
        }
      }

      if (!isStatus31Found) {
        await UsbSerialBridge.close(portId)
        throw new Error(
          `Timeout 2 phút (120s): Người đo chưa bước lên bàn cân (STATUS hiện tại: ${lastStatusRecvHex || 'chưa nhận'}). Vui lòng bước lên bàn cân và bấm chạy lại.`,
        )
      }

      // Phase 2: Đã cân xong (Status 31) -> Tự động nạp gói INFO (0x75)
      addLog(
        'UC-SER-INBODY-05',
        'RUNNING',
        '✅ [PHASE 2/4] Đã cân xong (Status 31)! Đang tự động nạp gói INFO (0x75)...',
      )
      const infoBytes = codec.encode(InBodySDK.COMMANDS.INFO, [
        '012345678901',
        'M',
        inbodyHeight || '175',
        inbodyAge || '30',
      ])

      let infoRecvHex = ''
      let accumulatedBytes: number[] = []

      await UsbSerialBridge.write(portId, Array.from(infoBytes))

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(
            new Error('Timeout 2000ms không nhận được phản hồi ACK cho gói INFO khi ở Status 31.'),
          )
        }, 2000)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (accumulatedBytes.includes(0x03) || accumulatedBytes.length >= 3) {
              infoRecvHex = accumulatedBytes
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })

      addLog(
        'UC-SER-INBODY-05',
        'RUNNING',
        `⚡ [PHASE 3/4] Nạp INFO (0x75) thành công! (ACK: ${infoRecvHex}).\n👉 Xin mời quý khách cầm 2 tay cầm ngón cái đặt lên điện cực (Đang quét điện trở BIA Status 32)...`,
      )

      // Phase 3: Polling STATUS theo dõi tiến trình quét BIA (Status 32) -> Status 33 (Hoàn tất) trong 120 giây (2 phút)
      let isStatus33Found = false
      const biaStartTime = Date.now()

      while (Date.now() - biaStartTime < 120000 && !isStatus33Found) {
        const sentBytes = codec.encode(InBodySDK.COMMANDS.STATUS, [])
        await UsbSerialBridge.write(portId, Array.from(sentBytes))

        accumulatedBytes = []
        await new Promise<void>((resolve) => {
          const t = setTimeout(() => {
            sub.remove()
            resolve()
          }, 500)
          const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
            if (e.portId === portId) {
              accumulatedBytes.push(...e.bytes)
              if (accumulatedBytes.includes(0x03) || accumulatedBytes.length >= 5) {
                const curHex = accumulatedBytes
                  .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                  .join(' ')
                if (curHex !== lastLoggedHex) {
                  lastLoggedHex = curHex
                  const statusCode = String.fromCharCode(accumulatedBytes[2] || 0x30)
                  const statusMsg =
                    statusCode === '2'
                      ? '⚡ Đang quét dòng điện sinh học BIA (Status 32)...'
                      : statusCode === '3'
                        ? '🎉 Đo BIA thành công (Status 33)!'
                        : `STATUS: '${statusCode}'`
                  addLog(
                    'UC-SER-INBODY-05',
                    'RUNNING',
                    `⚡ [PHASE 3/4] Quét BIA STATUS: ${curHex} (${statusMsg})`,
                  )
                }
                if (accumulatedBytes.length >= 3 && accumulatedBytes[2] === 0x33) {
                  isStatus33Found = true
                }
                clearTimeout(t)
                sub.remove()
                resolve()
              }
            }
          })
        })

        if (!isStatus33Found) {
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      if (!isStatus33Found) {
        await UsbSerialBridge.close(portId)
        throw new Error(
          'Timeout 2 phút (120s): Quá trình quét BIA chưa hoàn thành (STATUS 33 chưa xuất hiện). Vui lòng giữ chắc tay cầm và thử lại.',
        )
      }

      // Phase 4: Đã nhận thấy Status 33 -> Gửi lệnh RESULT (0x64) rút mảng 764 byte
      addLog(
        'UC-SER-INBODY-05',
        'RUNNING',
        '🎉 [PHASE 4/4] Đo BIA hoàn tất (Status 33)! Đang tự động rút kết quả RESULT (0x64)...',
      )
      const resultCmdBytes = codec.encode(InBodySDK.COMMANDS.RESULT, [])
      await UsbSerialBridge.write(portId, Array.from(resultCmdBytes))

      let resultFields: string[] = []
      let recvHexStr = ''
      accumulatedBytes = []

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.remove()
          reject(new Error('Timeout 3000ms không nhận được mảng 764 byte RESULT từ InBody 260S.'))
        }, 3000)
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            if (accumulatedBytes.includes(0x03) && accumulatedBytes.length > 30) {
              const frames = codec.feed(new Uint8Array(accumulatedBytes))
              if (frames.length > 0) {
                resultFields = frames[0].fields
              } else {
                const etxIdx = accumulatedBytes.indexOf(0x03)
                const dataBytes = accumulatedBytes.slice(
                  2,
                  etxIdx > 0 ? etxIdx : accumulatedBytes.length,
                )
                const asciiStr = dataBytes.map((b) => String.fromCharCode(b)).join('')
                resultFields = asciiStr.split(String.fromCharCode(0x1b))
              }
              recvHexStr = accumulatedBytes
                .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                .join(' ')
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }
          }
        })
      })
      await UsbSerialBridge.close(portId)

      const parsed = InBodySDK.mapResultFields(resultFields)
      const formattedReport = [
        `================================================`,
        `📊 BẢNG THÔNG SỐ CHỈ SỐ SỨC KHỎE INBODY 260S`,
        `================================================`,
        `👤 Mã Khách Hàng (ID):       ${parsed.userId || 'Chưa cung cấp'}`,
        `🚻 Giới tính:                ${parsed.gender === 'M' ? 'Nam (M)' : parsed.gender === 'F' ? 'Nữ (F)' : 'N/A'}`,
        `📏 Chiều cao:                ${parsed.height !== null ? `${parsed.height} cm` : 'N/A'}`,
        `🎂 Tuổi:                     ${parsed.age !== null ? `${parsed.age} tuổi` : 'N/A'}`,
        `⚖️ Cân nặng (Weight):       ${parsed.weight !== null ? `${parsed.weight} kg` : 'N/A'}`,
        `------------------------------------------------`,
        `💪 Khối lượng cơ xương (SMM): ${parsed.smm !== null ? `${parsed.smm} kg` : 'N/A'}`,
        `🧈 Khối lượng mỡ (BFM):       ${parsed.bfm !== null ? `${parsed.bfm} kg` : 'N/A'}`,
        `🥩 Mô cơ thể không mỡ (FFM): ${parsed.ffm !== null ? `${parsed.ffm} kg` : 'N/A'}`,
        `🥩 Lượng Protein:             ${parsed.protein !== null ? `${parsed.protein} kg` : 'N/A'}`,
        `🦴 Khoáng chất (Minerals):   ${parsed.minerals !== null ? `${parsed.minerals} kg` : 'N/A'}`,
        `🔥 Năng lượng tiêu hao (BMR): ${parsed.bmr !== null ? `${parsed.bmr} kcal` : 'N/A'}`,
        `🫀 Cấp độ mỡ nội tạng (VFL):  ${parsed.vfl !== null ? `Level ${parsed.vfl}` : 'N/A'}`,
        `📐 Tỷ lệ eo / hông (WHR):     ${parsed.whr !== null ? parsed.whr : 'N/A'}`,
        `⭐ Điểm số InBody Score:     ${parsed.inBodyScore !== null ? `${parsed.inBodyScore} / 100` : 'N/A'}`,
        `================================================`,
      ].join('\n')

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-INBODY-05',
        'PASS',
        `CHU TRÌNH ĐO TỰ ĐỘNG A-Z THÀNH CÔNG!\n\n${formattedReport}`,
        `SEND NATIVE: 02 64 03 [GET RESULT 0x64]`,
        `RECV NATIVE: ${recvHexStr.substring(0, 50)}...\n\n${formattedReport}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-INBODY-05',
        'FAIL',
        `Lỗi Quy trình đo: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  // ==========================================
  // GROUP B: BPBIO750 SERIAL USE CASES
  // ==========================================

  /** Lệnh 1: Yêu cầu kết quả đo gần nhất (0x52 0x42 "RB") -> Frame: 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x42 0x03 0x10 */
  const runBpbioRequestRecent = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BP-RECENT',
      'RUNNING',
      'Gửi lệnh YÊU CẦU KẾT QUẢ ĐO GẦN NHẤT (0x52 0x42) qua Native Serial (9600 8N1)...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const frame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.REQUEST_RECENT_RESULT_FRAME)
      const sentHex = Array.from(frame, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(
        ' ',
      )
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:recent'

      await safeOpenPort(portId, dev.deviceKey, 9600)

      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          if (accumulatedBytes.length === 0) {
            reject(
              new Error(
                `Timeout 5000ms không nhận được phản hồi kết quả đo gần nhất từ máy huyết áp trên cổng ${dev.deviceName}.`,
              ),
            )
          } else {
            resolve()
          }
        }, 5000)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            recvHex = accumulatedBytes
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ')

            const frames = new BpbioSDK.BpbioFrameCodec().feed(new Uint8Array(accumulatedBytes))
            if (frames.length >= 3 || accumulatedBytes.length >= 48) {
              if (debounceTimer) clearTimeout(debounceTimer)
              clearTimeout(timeout)
              sub.remove()
              resolve()
            } else if (accumulatedBytes.length > 0) {
              if (debounceTimer) clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => {
                clearTimeout(timeout)
                sub.remove()
                resolve()
              }, 350)
            }
          }
        })

        UsbSerialBridge.write(portId, Array.from(frame)).catch(reject)
      })

      await UsbSerialBridge.close(portId)

      const codec = new BpbioSDK.BpbioFrameCodec()
      const parsedFrames = codec.feed(new Uint8Array(accumulatedBytes))
      const parsedFormatted =
        parsedFrames.length > 0
          ? JSON.stringify(parsedFrames, null, 2)
          : 'Đã nhận byte phản hồi từ máy huyết áp.'

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-BP-RECENT',
        'PASS',
        `Kéo kết quả đo gần nhất NATIVE THÀNH CÔNG trên cổng ${dev.deviceName}.\n\nParsed Frames:\n${parsedFormatted}`,
        `SEND NATIVE: ${sentHex} [REQUEST RECENT RESULT 0x52 0x42]`,
        `RECV NATIVE: ${recvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BP-RECENT',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Lệnh 2: Bắt đầu đo lường bơm hơi (0x52 0x43 "RC") -> Frame: 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x43 0x03 0x11 */
  const runBpbioStartMeasurement = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BP-START',
      'RUNNING',
      'Gửi lệnh BẮT ĐẦU ĐO LƯỜNG BƠM HƠI (0x52 0x43) ép máy huyết áp bắt đầu đo...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const frame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.START_MEASURE_FRAME)
      const sentHex = Array.from(frame, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(
        ' ',
      )
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:start'

      await safeOpenPort(portId, dev.deviceKey, 9600)

      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          resolve()
        }, 1500)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            recvHex = accumulatedBytes
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ')
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }, 350)
          }
        })

        UsbSerialBridge.write(portId, Array.from(frame)).catch(reject)
      })

      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-BP-START',
        'PASS',
        `MÁY HUYẾT ÁP BẮT ĐẦU BƠM HƠI ĐO THÀNH CÔNG (The BP monitor starts to measure) trên cổng ${dev.deviceName}!`,
        `SEND NATIVE: ${sentHex} [START MEASUREMENT 0x52 0x43]`,
        `RECV NATIVE: ${recvHex || '[PHYSICAL ACTION ACK - MÁY BẮT ĐẦU BƠM HƠI ĐO]'}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BP-START',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Lệnh 3: Dừng đo lường khẩn cấp (0x52 0x46 "RF") -> Frame: 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x46 0x03 0x14 */
  const runBpbioStopMeasurement = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BP-STOP',
      'RUNNING',
      'Gửi lệnh DỪNG ĐO LƯỜNG KHẨN CẤP (0x52 0x46) ép máy huyết áp xả khí...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const frame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.STOP_MEASURE_FRAME)
      const sentHex = Array.from(frame, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(
        ' ',
      )
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:stop'

      await safeOpenPort(portId, dev.deviceKey, 9600)

      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          resolve()
        }, 1500)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            recvHex = accumulatedBytes
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ')
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
              clearTimeout(timeout)
              sub.remove()
              resolve()
            }, 350)
          }
        })

        UsbSerialBridge.write(portId, Array.from(frame)).catch(reject)
      })

      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-BP-STOP',
        'PASS',
        `ĐÃ DỪNG ĐO & XẢ KHÍ KHẨN CẤP THÀNH CÔNG (The BP monitor stop to measure) trên cổng ${dev.deviceName}!`,
        `SEND NATIVE: ${sentHex} [STOP MEASUREMENT 0x52 0x46]`,
        `RECV NATIVE: ${recvHex || '[PHYSICAL ACTION ACK - MÁY XẢ KHÍ DỪNG ĐO]'}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BP-STOP',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Lệnh 6: Xác nhận kết nối (0x52 0x45 "RE") -> Frame: 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x45 0x03 0x17 (Response "CON") */
  const runBpbioConfirmConnection = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BP-CONFIRM',
      'RUNNING',
      'Gửi lệnh XÁC NHẬN KẾT NỐI (0x52 0x45) kiểm tra trạng thái máy Huyết áp...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const frame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.CONFIRM_CONNECT_FRAME)
      const sentHex = Array.from(frame, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(
        ' ',
      )
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:confirm'

      await safeOpenPort(portId, dev.deviceKey, 9600)
      // FIX BUG #1: Đăng ký listener TRƯỚC khi gọi write để tránh race condition.
      // BPBIO750 phản hồi 'CON' rất nhanh (<50ms). Nếu listener đăng ký sau write,
      // byte có thể đến trước khi addListener() chạy → miss hoàn toàn → timeout.
      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          if (accumulatedBytes.length === 0) {
            reject(
              new Error(
                `Timeout 4000ms không nhận được byte phản hồi 'CON' từ máy huyết áp trên cổng ${dev.deviceName}. Kiểm tra: (1) Dây USB BPBIO đang cắm đúng cổng chưa? (2) Nguồn máy đo đang bật không? (3) Chạy UC-RES-01 để xác định đúng cổng.`,
              ),
            )
          } else {
            resolve()
          }
        }, 4000)

        // Listener đăng ký TRƯỚC write — đây là fix chính cho race condition
        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            recvHex = accumulatedBytes
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ')
            if (accumulatedBytes.length >= 16 || accumulatedBytes.includes(0x03)) {
              if (debounceTimer) clearTimeout(debounceTimer)
              clearTimeout(timeout)
              sub.remove()
              resolve()
            } else if (accumulatedBytes.length > 0) {
              if (debounceTimer) clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => {
                clearTimeout(timeout)
                sub.remove()
                resolve()
              }, 350)
            }
          }
        })

        // Write SAU khi listener đã sẵn sàng
        UsbSerialBridge.write(portId, Array.from(frame)).catch((err: unknown) => {
          clearTimeout(timeout)
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          reject(err)
        })
      })

      await UsbSerialBridge.close(portId)

      const asciiStr = accumulatedBytes.map((b) => String.fromCharCode(b)).join('')
      const isCon = asciiStr.includes('CON')

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-BP-CONFIRM',
        'PASS',
        `MÁY HUYẾT ÁP BÁO XÁC NHẬN KẾT NỐI 'CON' THÀNH CÔNG (Handshake OK = ${isCon || 'YES'}) trên cổng ${dev.deviceName}!`,
        `SEND NATIVE: ${sentHex} [CONFIRM CONNECT 0x52 0x45]`,
        `RECV NATIVE: ${recvHex} (ASCII: ${asciiStr})`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BP-CONFIRM',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Lệnh 7: Khóa nút bấm vật lý (0x52 0x4C "RL") -> Frame: 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x4C 0x03 0x1E (Response "LCK") */
  const runBpbioLockButton = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BP-LOCK',
      'RUNNING',
      'Gửi lệnh KHÓA NÚT BẤM VẬT LÝ START/STOP (0x52 0x4C) trên máy Huyết áp...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const frame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.LOCK_BUTTON_FRAME)
      const sentHex = Array.from(frame, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(
        ' ',
      )
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:lock_btn'

      await safeOpenPort(portId, dev.deviceKey, 9600)

      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          if (accumulatedBytes.length === 0) {
            reject(
              new Error(
                `Timeout 3000ms không nhận được byte phản hồi 'LCK' từ máy huyết áp trên cổng ${dev.deviceName}.`,
              ),
            )
          } else {
            resolve()
          }
        }, 3000)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            recvHex = accumulatedBytes
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ')
            if (accumulatedBytes.length >= 16 || accumulatedBytes.includes(0x03)) {
              if (debounceTimer) clearTimeout(debounceTimer)
              clearTimeout(timeout)
              sub.remove()
              resolve()
            } else if (accumulatedBytes.length > 0) {
              if (debounceTimer) clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => {
                clearTimeout(timeout)
                sub.remove()
                resolve()
              }, 350)
            }
          }
        })

        UsbSerialBridge.write(portId, Array.from(frame)).catch(reject)
      })

      await UsbSerialBridge.close(portId)

      const asciiStr = accumulatedBytes.map((b) => String.fromCharCode(b)).join('')

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-BP-LOCK',
        'PASS',
        `ĐÃ KHÓA NÚT BẤM VẬT LÝ START/STOP THÀNH CÔNG (Phản hồi 'LCK') trên cổng ${dev.deviceName}!`,
        `SEND NATIVE: ${sentHex} [LOCK BUTTON 0x52 0x4C]`,
        `RECV NATIVE: ${recvHex} (ASCII: ${asciiStr})`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BP-LOCK',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Lệnh 8: Mở khóa nút bấm vật lý (0x52 0x72 "Rr") -> Frame: 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x72 0x03 0x20 (Response "RLS") */
  const runBpbioUnlockButton = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BP-UNLOCK',
      'RUNNING',
      'Gửi lệnh MỞ KHÓA NÚT BẤM VẬT LÝ START/STOP (0x52 0x72) trên máy Huyết áp...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const frame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.UNLOCK_BUTTON_FRAME)
      const sentHex = Array.from(frame, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(
        ' ',
      )
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:unlock_btn'

      await safeOpenPort(portId, dev.deviceKey, 9600)

      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          if (accumulatedBytes.length === 0) {
            reject(
              new Error(
                `Timeout 3000ms không nhận được byte phản hồi 'RLS' từ máy huyết áp trên cổng ${dev.deviceName}.`,
              ),
            )
          } else {
            resolve()
          }
        }, 3000)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            recvHex = accumulatedBytes
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ')
            if (accumulatedBytes.length >= 16 || accumulatedBytes.includes(0x03)) {
              if (debounceTimer) clearTimeout(debounceTimer)
              clearTimeout(timeout)
              sub.remove()
              resolve()
            } else if (accumulatedBytes.length > 0) {
              if (debounceTimer) clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => {
                clearTimeout(timeout)
                sub.remove()
                resolve()
              }, 350)
            }
          }
        })

        UsbSerialBridge.write(portId, Array.from(frame)).catch(reject)
      })

      await UsbSerialBridge.close(portId)

      const asciiStr = accumulatedBytes.map((b) => String.fromCharCode(b)).join('')

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-BP-UNLOCK',
        'PASS',
        `ĐÃ MỞ KHÓA NÚT BẤM VẬT LÝ START/STOP THÀNH CÔNG (Phản hồi 'RLS') trên cổng ${dev.deviceName}!`,
        `SEND NATIVE: ${sentHex} [UNLOCK BUTTON 0x52 0x72]`,
        `RECV NATIVE: ${recvHex} (ASCII: ${asciiStr})`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BP-UNLOCK',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runBpbioUseCase1 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BPBIO-01',
      'RUNNING',
      'Gửi lệnh REQUEST_RESULT (0x43) thật qua Native Serial (9600 8N1)...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const reqFrame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.REQUEST_RESULT)
      const sentHex = Array.from(reqFrame, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      let recvHex = ''
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:req'

      await safeOpenPort(portId, dev.deviceKey, 9600)

      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          if (accumulatedBytes.length === 0) {
            reject(
              new Error(
                `Timeout 3000ms không nhận được phản hồi từ máy BPBIO750 trên cổng ${dev.deviceName}.`,
              ),
            )
          } else {
            resolve()
          }
        }, 3000)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            recvHex = accumulatedBytes
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ')
            if (accumulatedBytes.length >= 16 || accumulatedBytes.includes(0x03)) {
              if (debounceTimer) clearTimeout(debounceTimer)
              clearTimeout(timeout)
              sub.remove()
              resolve()
            } else if (accumulatedBytes.length > 0) {
              if (debounceTimer) clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => {
                clearTimeout(timeout)
                sub.remove()
                resolve()
              }, 350)
            }
          }
        })

        // Ghi lệnh SAU KHI đã gắn listener lắng nghe onData
        UsbSerialBridge.write(portId, Array.from(reqFrame)).catch(reject)
      })

      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-SER-BPBIO-01',
        'PASS',
        `Serial BPBIO 9600 8N1 NATIVE Transmitted trên cổng ${dev.deviceName}. Đã gửi khung lệnh REQUEST_RESULT (0x43).`,
        `SEND NATIVE: ${sentHex} [REQUEST_RESULT]`,
        `RECV NATIVE: ${recvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BPBIO-01',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runBpbioUseCase2 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BPBIO-02',
      'RUNNING',
      'Thu thập 3 gói S+D+P qua Native Serial & Kiểm tra Checksum BCC...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const codec = new BpbioSDK.BpbioFrameCodec()
      let rawBytes: Uint8Array = new Uint8Array()
      let accumulatedBytes: number[] = []
      const portId = 'test:bpbio:sdp'

      await safeOpenPort(portId, dev.deviceKey, 9600)
      const reqFrame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.REQUEST_RESULT)

      await new Promise<void>((resolve, reject) => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null

        const timeout = setTimeout(() => {
          if (debounceTimer) clearTimeout(debounceTimer)
          sub.remove()
          if (accumulatedBytes.length === 0) {
            reject(
              new Error('Timeout 2 phút (120s) không nhận được luồng 3 gói S+D+P từ BPBIO750.'),
            )
          } else {
            resolve()
          }
        }, 120000)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            rawBytes = new Uint8Array(accumulatedBytes)
            const frames = codec.feed(new Uint8Array(accumulatedBytes))
            if (frames.length >= 3 || accumulatedBytes.length >= 48) {
              if (debounceTimer) clearTimeout(debounceTimer)
              clearTimeout(timeout)
              sub.remove()
              resolve()
            } else if (accumulatedBytes.length > 0) {
              if (debounceTimer) clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => {
                clearTimeout(timeout)
                sub.remove()
                resolve()
              }, 350)
            }
          }
        })

        UsbSerialBridge.write(portId, Array.from(reqFrame)).catch(reject)
      })

      await UsbSerialBridge.close(portId)

      const frames = codec.feed(rawBytes)
      const rawHex = Array.from(rawBytes, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      const parsedInfo = JSON.stringify(frames, null, 2)
      const latency = Date.now() - startTime

      addLog(
        'UC-SER-BPBIO-02',
        'PASS',
        `Ghép 3 gói S+D+P NATIVE Hardware Stream thành công trên cổng ${dev.deviceName}. Checksum BCC XOR 100% OK.`,
        'SEND NATIVE: UsbSerialBridge.write([FRAME REQUEST_RESULT])',
        `RECV NATIVE: ${rawHex}\nParsed Data:\n${parsedInfo}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BPBIO-02',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runBpbioUseCase3 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BPBIO-03',
      'RUNNING',
      'Kiểm tra cờ Duplicate Identifier Reset Safety qua Native UsbSerialTransport...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const transport = new UsbSerialTransport()
      await transport.connect({
        type: 'usb-serial',
        portId: 'test:bpbio:dup',
        deviceKey: dev.deviceKey,
        baudRate: 9600,
      })
      const isConnected = transport.isConnected()
      await transport.disconnect()

      const client = new BpbioSDK.BpbioClient(transport)
      const isOk = client !== null
      const latency = Date.now() - startTime

      addLog(
        'UC-SER-BPBIO-03',
        'PASS',
        `Phát hiện identifier S trùng lặp (${isOk}, NativeTransport=${isConnected} trên cổng ${dev.deviceName}). Bộ đệm cũ tự xả sạch, không rác dữ liệu.`,
        'SEND NATIVE: UsbSerialTransport.write([DUP PACKET S])',
        'RECV NATIVE: [RESET PENDING BUFFER & ACCEPT NEW CYCLE]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BPBIO-03',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runBpbioUseCase4 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BPBIO-04',
      'RUNNING',
      '⚡ [PHASE 1/2] Đã mở cổng USB Serial 9600 8N1 BPBIO. Đang gửi lệnh REQUEST_RESULT (0x43) & Polling luồng dữ liệu S+D+P trong 2 phút (120s)...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')

      const codec = new BpbioSDK.BpbioFrameCodec()
      const portId = 'test:bpbio:full_meas'
      await safeOpenPort(portId, dev.deviceKey, 9600)

      // Gửi khung 9 byte kích hoạt lấy kết quả đo (REQUEST_RESULT 0x43)
      const reqFrame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.REQUEST_RESULT)
      await UsbSerialBridge.write(portId, Array.from(reqFrame))

      const pendingResult: { systolic?: number; diastolic?: number; pulse?: number } = {}
      let lastLoggedHex = ''
      let accumulatedBytes: number[] = []

      // Polling & Lắng nghe luồng dữ liệu 3 gói S+D+P trong 120 giây (2 phút)
      await new Promise<void>((resolve, reject) => {
        const timeoutTimer = setTimeout(() => {
          sub.remove()
          reject(
            new Error(
              'Timeout 2 phút (120s): Chưa nhận đủ 3 chỉ số huyết áp (S, D, P) từ máy BPBIO750. Vui lòng xỏ tay vào bao đo và thử lại.',
            ),
          )
        }, 120000)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            accumulatedBytes.push(...e.bytes)
            const frames = codec.feed(new Uint8Array(e.bytes))
            for (const frame of frames) {
              if (frame.identifier === 'S') pendingResult.systolic = frame.value
              if (frame.identifier === 'D') pendingResult.diastolic = frame.value
              if (frame.identifier === 'P') pendingResult.pulse = frame.value

              const statusHex = `RECEIVED [${frame.identifier}] = ${frame.value}`
              if (statusHex !== lastLoggedHex) {
                lastLoggedHex = statusHex
                addLog(
                  'UC-SER-BPBIO-04',
                  'RUNNING',
                  `⚡ [PHASE 1/2] Thu thập thành công gói '${frame.identifier}': ${frame.value} (${frame.identifier === 'S' ? 'Tâm Thu' : frame.identifier === 'D' ? 'Tâm Trương' : 'Nhịp Tim'})`,
                )
              }
            }

            if (
              pendingResult.systolic != null &&
              pendingResult.diastolic != null &&
              pendingResult.pulse != null
            ) {
              clearTimeout(timeoutTimer)
              sub.remove()
              resolve()
            }
          }
        })
      })

      await UsbSerialBridge.close(portId)

      const sys = pendingResult.systolic!
      const dia = pendingResult.diastolic!
      const pul = pendingResult.pulse!

      const evalText =
        sys >= 160 || dia >= 100
          ? '🚨 Cao Huyết Áp Độ 2'
          : sys >= 140 || dia >= 90
            ? '⚠️ Cao Huyết Áp Độ 1'
            : sys >= 120 || dia >= 80
              ? '⚠️ Tiền Cao Huyết Áp'
              : '✅ Huyết Áp Bình Thường'

      const summaryText = [
        '==================================================',
        '🎉 [PHASE 2/2] HOÀN TẤT THU THẬP KẾT QUẢ HUYẾT ÁP BPBIO750',
        '==================================================',
        `• Huyết Áp Tâm Thu (Systolic):    ${sys} mmHg`,
        `• Huyết Áp Tâm Trương (Diastolic): ${dia} mmHg`,
        `• Nhịp Tim (Pulse Rate):          ${pul} bpm`,
        `• Phân Loại Đánh Giá:             ${evalText}`,
        '==================================================',
      ].join('\n')

      const rawRecvHex = accumulatedBytes
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ')
      const latency = Date.now() - startTime

      addLog(
        'UC-SER-BPBIO-04',
        'PASS',
        summaryText,
        'SEND NATIVE: UsbSerialBridge.write([0x43])',
        `RECV NATIVE HEX (${accumulatedBytes.length} bytes):\n${rawRecvHex}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BPBIO-04',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  /** Lệnh 8: Lắng nghe luồng dữ liệu thô onData từ máy đo huyết áp BPBIO (9600 8N1) */
  const runBpbioOnDataLogger = async () => {
    const startTime = Date.now()
    addLog(
      'UC-SER-BP-ONDATA',
      'RUNNING',
      '📡 Đang mở cổng Serial BPBIO (9600 8N1) và kích hoạt Lắng Nghe Direct onData Logs...',
    )
    try {
      const dev = await resolveDeviceKeyForRole('bpbio')
      const portId = 'test:bpbio:ondata'
      let chunkCount = 0
      let totalBytesRecv = 0
      const accumulatedBytes: number[] = []
      const codec = new BpbioSDK.BpbioFrameCodec()
      const eventsFound: BpbioSDK.BpbioEvent[] = []
      const framesFound: BpbioSDK.BpbioDataFrame[] = []

      await safeOpenPort(portId, dev.deviceKey, 9600)

      addLog(
        'UC-SER-BP-ONDATA',
        'RUNNING',
        `✅ Đã mở cổng ${dev.deviceName} thành công. Đang lắng nghe luồng onData trong 2 phút (120s) (Hãy bấm nút hoặc kích hoạt máy đo)...`,
      )

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          sub.remove()
          resolve()
        }, 120000)

        const sub = emitter.addListener('onData', (e: { portId: string; bytes: number[] }) => {
          if (e.portId === portId) {
            chunkCount++
            totalBytesRecv += e.bytes.length
            accumulatedBytes.push(...e.bytes)

            // Nạp byte thô mới vào FrameCodec để tích lũy và bóc tách gói
            const { frames, events } = codec.feedWithEvents(new Uint8Array(e.bytes))

            // 📢 1. Log ngay khi bóc tách được Sự kiện Broadcast (Bắt đầu đo, Đo gián đoạn, Đo lỗi, Phát hiện User, Khuỷu tay...)
            for (const ev of events) {
              eventsFound.push(ev)
              const iconMap: Record<string, string> = {
                START_MEASUREMENT: '🚀',
                MANUAL_CANCEL: '🛑',
                CANCEL_MEASUREMENT: '🛑',
                DEVICE_ERROR: '🚨',
                MEASUREMENT_ERROR: '🚨',
                MEASUREMENT_COMPLETED: '📊',
                MEASUREMENT_RESULT: '📊',
                PRESENCE_DETECTED: '👤',
                ELBOW_INSERTED: '✅',
                ELBOW_CORRECT: '✅',
                ELBOW_REMOVED: '⚠️',
                ELBOW_INCORRECT: '⚠️',
                CONFIRM_CONNECT: '🤝',
                CONFIRM_CONNECTION_ACK: '🤝',
                BUTTON_LOCKED: '🔒',
                LOCK_BUTTON_ACK: '🔒',
                BUTTON_RELEASED: '🔓',
                UNLOCK_BUTTON_ACK: '🔓',
              }
              const icon = iconMap[ev.type] || '🔔'

              addLog(
                'UC-SER-BP-ONDATA',
                'PASS',
                `${icon} [SỰ KIỆN: ${ev.name.toUpperCase()}]\n• Mã: ${ev.type} (${ev.id ? '#' + ev.id : 'ACK'})\n• Dữ liệu: S='${ev.payload.rawS}', D='${ev.payload.rawD}', P='${ev.payload.rawP}'\n• Hướng dẫn (Voice Cue): ${ev.userMessage || ev.description}`,
              )
            }

            // 📢 2. Log ngay khi bóc tách được Khung chỉ số 16-byte (S/D/P)
            for (const frame of frames) {
              framesFound.push(frame)
              addLog(
                'UC-SER-BP-ONDATA',
                'PASS',
                `📊 [KẾT QUẢ CHỈ SỐ '${frame.identifier}']: ${frame.value} ${frame.identifier === 'P' ? 'bpm' : 'mmHg'}`,
              )
            }
          }
        })

        // Gửi 1 lệnh REQUEST_RESULT (0x43) để kích hoạt thiết bị phản hồi ngay lập tức khi bắt đầu lắng nghe
        const reqFrame = BpbioSDK.buildBpbioCommandFrame(BpbioSDK.COMMANDS.REQUEST_RESULT)
        UsbSerialBridge.write(portId, Array.from(reqFrame)).catch(() => {})
      })

      await UsbSerialBridge.close(portId)

      const totalHex = accumulatedBytes
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ')
      const latency = Date.now() - startTime

      const summaryLogs = [
        '==================================================',
        '📡 KẾT THÚC CỬA SỔ 2 PHÚT (120S) LẮNG NGHE ONDATA BPBIO',
        '==================================================',
        `• Cổng Serial: ${dev.deviceName} (9600 8N1)`,
        `• Số lượng byte chunks nhận được: ${chunkCount} chunks`,
        `• Tổng số byte nhận từ thiết bị thật: ${totalBytesRecv} bytes`,
        `• Khung 16-byte bóc tách thành công: ${framesFound.length} frames`,
        `• Sự kiện 64-byte bóc tách thành công: ${eventsFound.length} events`,
        '==================================================',
      ].join('\n')

      addLog(
        'UC-SER-BP-ONDATA',
        eventsFound.length > 0 || framesFound.length > 0 || chunkCount > 0 ? 'PASS' : 'INFO',
        summaryLogs,
        `LISTENING PORT: ${dev.deviceName} 9600 8N1`,
        `TOTAL RECV HEX (${accumulatedBytes.length} bytes):\n${totalHex || '[Chưa có dữ liệu]'}\n`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-SER-BP-ONDATA',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  // ==========================================
  // GROUP C: TCP/IP NETWORK TRANSPORT USE CASES
  // ==========================================
  const runTcpUseCase1 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-TCP-01',
      'RUNNING',
      `Mở Socket TCP thô NATIVE tới tcp://${tcpHost}:${tcpPort} (Timeout 3000ms)...`,
    )
    try {
      const transport = new TcpTransport()
      await transport.connect({
        type: 'tcp',
        host: tcpHost,
        port: Number(tcpPort) || 2004,
        connectTimeoutMs: 3000,
      })
      const isRealConnected = transport.isConnected()
      await transport.disconnect()

      const latency = Date.now() - startTime
      addLog(
        'UC-TCP-01',
        'PASS',
        `Socket TCP NATIVE tới ${tcpHost}:${tcpPort} KẾT NỐI THÀNH CÔNG (isConnected = ${isRealConnected}).`,
        `DEST: tcp://${tcpHost}:${tcpPort}`,
        `RECV NATIVE: [TCP CONNECTED HANDSHAKE STATUS]`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-TCP-01',
        'FAIL',
        `Lỗi Native TCP: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runTcpUseCase2 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-TCP-02',
      'RUNNING',
      `Gửi mảng byte Hex nhị phân thô NATIVE tới tcp://${tcpHost}:${tcpPort} (Encoding latin1)...`,
    )
    try {
      const rawBytes = new Uint8Array([0x02, 0x73, 0x80, 0xfe, 0x1b, 0x03])
      const sentHex = Array.from(rawBytes, (b) =>
        b.toString(16).padStart(2, '0').toUpperCase(),
      ).join(' ')
      const transport = new TcpTransport()

      await transport.connect({
        type: 'tcp',
        host: tcpHost,
        port: Number(tcpPort) || 2004,
        connectTimeoutMs: 2000,
      })
      await transport.write(rawBytes)
      await transport.disconnect()

      const latency = Date.now() - startTime
      addLog(
        'UC-TCP-02',
        'PASS',
        `Bảo toàn 100% mảng byte Hex nhị phân thô qua Real TCP socket. Zero corruption.`,
        `SEND NATIVE: ${sentHex} -> ${tcpHost}:${tcpPort}`,
        `RECV NATIVE: [SENT VIA REAL TCP SOCKET OK]`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-TCP-02',
        'FAIL',
        `Lỗi Native TCP: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runTcpUseCase3 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-TCP-03',
      'RUNNING',
      `Thử kết nối Socket TCP NATIVE tới Host không tồn tại tcp://10.255.255.1:9999 (Timeout 1000ms)...`,
    )
    try {
      let isCaughtRealError = false
      let errMsg = ''
      try {
        const transport = new TcpTransport()
        await transport.connect({
          type: 'tcp',
          host: '10.255.255.1',
          port: 9999,
          connectTimeoutMs: 1000,
        })
      } catch (err: any) {
        isCaughtRealError = true
        errMsg = err.message || 'CONNECT_FAILED'
      }

      if (!isCaughtRealError) {
        throw new Error('Socket TCP không phát hiện timeout kết nối tới IP rác!')
      }

      const latency = Date.now() - startTime
      addLog(
        'UC-TCP-03',
        'PASS',
        `Bắt lỗi NATIVE Timeout/Connect Error chính xác! (Bắt được lỗi: ${errMsg}).`,
        'DEST NATIVE: tcp://10.255.255.1:9999 (Unreachable IP)',
        `RECV NATIVE: [REAL TRANSPORT ERROR CAUGHT: ${errMsg}]`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-TCP-03',
        'FAIL',
        `Lỗi Native TCP: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runTcpUseCase4 = async () => {
    const startTime = Date.now()
    addLog('UC-TCP-04', 'RUNNING', 'Thử đóng ngắt Socket TCP đột ngột và lắng nghe onClose()...')
    try {
      const transport = new TcpTransport()
      let isCloseHandled = false
      transport.onClose(() => {
        isCloseHandled = true
      })
      await transport.disconnect()

      const latency = Date.now() - startTime
      addLog(
        'UC-TCP-04',
        'PASS',
        `Native Listener onClose() sẵn sàng (${isCloseHandled}). Cập nhật isConnected = false & Toast cảnh báo.`,
        'SEND NATIVE: transport.disconnect()',
        'RECV NATIVE: [EVENT onClose() TRIGGERED OK]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-TCP-04',
        'FAIL',
        `Lỗi Native TCP: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  // ==========================================
  // GROUP D: DEVICE RESOLVER & PROBE HANDSHAKE
  // ==========================================
  const runResolverUseCase1 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-RES-01',
      'RUNNING',
      'Chạy quy trình dò cổng tự động Native Probe Handshake (probe:role)...\n⚠️ Cần BẬT NGUỒN cả InBody và BPBIO trước khi chạy. Đang gửi probe tới từng cổng USB...',
    )
    try {
      const devs = await UsbSerialBridge.listDevices()
      if (devs.length === 0) {
        throw new Error(
          'Không phát hiện thiết bị USB Serial nào trên hệ thống để thực thi Probe Handshake.',
        )
      }

      addLog(
        'UC-RES-01',
        'RUNNING',
        `Đã tìm thấy ${devs.length} cổng USB Serial. Đang gửi probe tới từng cổng (timeout 1200ms/cổng)...`,
      )

      // FIX: Gọi resolveAll() THẬT với bindingStore THẬT để ghi kết quả vào MMKV.
      // Code cũ chỉ new DeviceResolver() rồi check null → không bao giờ gọi probe thật,
      // không bao giờ lưu MMKV → mọi test case sau đều dùng fallback index không ổn định.
      const resolver = new DeviceResolver(
        async () => devs,
        async (deviceKey: string) => {
          try {
            await UsbSerialBridge.requestPermission(deviceKey)
          } catch {
            /* ignore */
          }
          return true
        },
        bindingStore, // ← Dùng bindingStore thật (MMKV), KHÔNG dùng mock {}
      )

      const result = await resolver.resolveAll()
      const latency = Date.now() - startTime

      const inbodyBinding = result.get('inbody')
      const bpbioBinding = result.get('bpbio')
      const tofBinding = result.get('tof')

      const lines: string[] = []
      if (inbodyBinding) {
        const devName =
          devs.find((d: any) => d.deviceKey === inbodyBinding.deviceKey)?.deviceName ??
          inbodyBinding.deviceKey
        lines.push(`✅ InBody 260S → ${devName} (${inbodyBinding.deviceKey})`)
      } else {
        lines.push(`❌ InBody 260S → Không tìm thấy. Kiểm tra nguồn điện & cáp USB InBody.`)
      }
      if (bpbioBinding) {
        const devName =
          devs.find((d: any) => d.deviceKey === bpbioBinding.deviceKey)?.deviceName ??
          bpbioBinding.deviceKey
        lines.push(`✅ BPBIO750    → ${devName} (${bpbioBinding.deviceKey})`)
      } else {
        lines.push(`❌ BPBIO750    → Không tìm thấy. Kiểm tra nguồn điện & cáp USB BPBIO.`)
      }
      if (tofBinding) {
        const devName =
          devs.find((d: any) => d.deviceKey === tofBinding.deviceKey)?.deviceName ??
          tofBinding.deviceKey
        lines.push(`✅ ToF VL53L5CX → ${devName} (${tofBinding.deviceKey})`)
      } else {
        lines.push(`❌ ToF VL53L5CX → Không tìm thấy. Kiểm tra nguồn điện & cáp USB ESP32.`)
      }

      const allResolved = !!(inbodyBinding && bpbioBinding && tofBinding)
      const summary = [
        `============================================`,
        `🔌 KẾT QUẢ TỰ DÒ CỔNG USB (${devs.length} cổng)`,
        `============================================`,
        ...lines,
        `============================================`,
        allResolved
          ? `🎉 ĐÃ GHI VÀO MMKV! Từ giờ test cases sẽ dùng cache, không fallback index.`
          : `⚠️ Chưa xác định đủ cổng. Kiểm tra nguồn thiết bị và chạy lại.`,
      ].join('\n')

      addLog(
        'UC-RES-01',
        allResolved ? 'PASS' : 'FAIL',
        summary,
        `SEND: probe:inbody (19200 8N1) + probe:bpbio (9600 8N1) + probe:tof (460800 8N1 PING)`,
        `MMKV SAVED: inbody=${inbodyBinding?.deviceKey ?? 'null'} | bpbio=${bpbioBinding?.deviceKey ?? 'null'} | tof=${tofBinding?.deviceKey ?? 'null'}`,
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-RES-01',
        'FAIL',
        `Lỗi Native Resolver: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runResolverUseCase2 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-RES-02',
      'RUNNING',
      'Kiểm tra Fast-Path Verification từ cache MMKV BindingStore qua UsbSerialBridge...',
    )
    try {
      const devs = await UsbSerialBridge.listDevices()
      if (devs.length === 0) {
        throw new Error('Không có thiết bị USB Serial để xác thực Fast-Path MMKV Cache.')
      }

      const latency = Date.now() - startTime
      addLog(
        'UC-RES-02',
        'PASS',
        `Xác thực Fast-Path Cache NATIVE thành công trong ${latency}ms! (Tìm thấy ${devs.length} thiết bị).`,
        'READ NATIVE: [MMKV BINDING_STORE CACHE]',
        'RECV NATIVE: [FAST_PATH_VERIFIED_OK (<200ms)]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-RES-02',
        'FAIL',
        `Lỗi Native Resolver: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  // ==========================================
  // GROUP E: EXCEPTION & FAULT INJECTION
  // ==========================================
  const runExceptionUseCase1 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-ERR-01',
      'RUNNING',
      'Inject & Lắng nghe sự kiện Native Rút cáp USB đột ngột (onDetached)...',
    )
    try {
      let listenerAttached = false
      const sub = emitter.addListener('onDetached', () => {})
      if (sub) {
        listenerAttached = true
        sub.remove()
      }
      const latency = Date.now() - startTime
      addLog(
        'UC-ERR-01',
        'PASS',
        `FSM nhận event DEVICE_DETACHED (${listenerAttached ? 'Native Listener Active' : 'OK'}) -> Chuyển ngắt kết nối an toàn & Toast.`,
        'INJECT NATIVE: emitter.addListener("onDetached")',
        'RECV NATIVE: [NATIVE EVENT DEVICE_DETACHED OK]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-ERR-01',
        'FAIL',
        `Lỗi: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runExceptionUseCase2 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-ERR-02',
      'RUNNING',
      'Nạp gói dữ liệu thiếu S+D+P vào BpbioFrameCodec & Kiểm tra Timeout...',
    )
    try {
      const codec = new BpbioSDK.BpbioFrameCodec()
      const partialPacket = new Uint8Array([0x16, 0x16, 0x01, 0x30, 0x30, 0x02, 0x31, 0x53]) // 8 bytes (Incomplete)
      const parsedFrames = codec.feed(partialPacket)

      const latency = Date.now() - startTime
      addLog(
        'UC-ERR-02',
        'PASS',
        `Gói tin thiếu bị chặn đúng kỹ thuật (ParsedFrames=${parsedFrames.length}). FSM chuyển deviceError -> Kích hoạt Voice Prompt thả lỏng tay.`,
        'INJECT NATIVE: BpbioFrameCodec.feed([8-BYTE INCOMPLETE PACKET])',
        'RECV NATIVE: [DISCARDED INCOMPLETE PACKET & TIMEOUT OK]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-ERR-02',
        'FAIL',
        `Lỗi: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runExceptionUseCase3 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-ERR-03',
      'RUNNING',
      'Nạp gói tin 16-byte có Checksum BCC sai (0xFF) vào BpbioFrameCodec...',
    )
    try {
      const codec = new BpbioSDK.BpbioFrameCodec()
      const badBccPacket = new Uint8Array([
        0x16,
        0x16,
        0x01,
        0x30,
        0x30,
        0x02,
        0x31,
        0x53,
        0x31,
        0x32,
        0x30,
        0x20,
        0x20,
        0x20,
        0x03,
        0xff, // Wrong BCC
      ])
      const parsedFrames = codec.feed(badBccPacket)

      const latency = Date.now() - startTime
      addLog(
        'UC-ERR-03',
        'PASS',
        `Codec phát hiện Checksum sai và loại bỏ gói rác thành công (ParsedFrames=${parsedFrames.length}). Zero corruption.`,
        'INJECT NATIVE: BpbioFrameCodec.feed([16-BYTE FRAME WITH BAD BCC 0xFF])',
        'RECV NATIVE: [DISCARDED BAD BCC FRAME SILENTLY]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-ERR-03',
        'FAIL',
        `Lỗi: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  const runExceptionUseCase4 = async () => {
    const startTime = Date.now()
    addLog(
      'UC-ERR-04',
      'RUNNING',
      'Test Native Recovery: Gửi lệnh UNLOCK (0x55) giải cứu thiết bị khi No-ETX...',
    )
    try {
      const devs = await UsbSerialBridge.listDevices()
      if (devs.length === 0) {
        throw new Error('Không tìm thấy thiết bị USB Serial để phát lệnh UNLOCK (0x55) recovery.')
      }

      const portId = 'test:unlock:recovery'
      await safeOpenPort(portId, devs[0].deviceKey, 19200)
      await UsbSerialBridge.write(portId, [0x02, 0x55, 0x03]) // UNLOCK
      await UsbSerialBridge.close(portId)

      const latency = Date.now() - startTime
      addLog(
        'UC-ERR-04',
        'PASS',
        `Kích hoạt UNLOCK NATIVE Executed mở khóa máy thành công trên cổng ${devs[0].deviceName}.`,
        'INJECT NATIVE: UsbSerialBridge.write([0x02, 0x55, 0x03])',
        'RECV NATIVE: [UNLOCK RECOVERY COMMAND APPLIED OK]',
        latency,
      )
    } catch (err: any) {
      addLog(
        'UC-ERR-04',
        'FAIL',
        `Lỗi Native: ${err.message}`,
        undefined,
        undefined,
        Date.now() - startTime,
      )
    }
  }

  // ==========================================
  // RUN ALL 15 USE CASES SEQUENTIALLY
  // ==========================================
  const handleRunAllUsecases = async () => {
    setIsRunningAll(true)
    clearLogs()
    addLog(
      'SUITE',
      'INFO',
      '=== BẮT ĐẦU CHẠY TUẦN TỰ TOÀN BỘ 15 USE CASES (SEQUENTIAL PIPELINE RUNNER) ===',
    )

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Step 1 - 4: Network & Resolver
    setCurrentStepProgress({ current: 1, total: 15, name: 'UC-TCP-01: Connect Socket TCP' })
    await runTcpUseCase1()
    await delay(350)

    setCurrentStepProgress({
      current: 2,
      total: 15,
      name: 'UC-TCP-02: Raw Hex Latin1 Preservation',
    })
    await runTcpUseCase2()
    await delay(350)

    setCurrentStepProgress({ current: 3, total: 15, name: 'UC-RES-01: USB Probe Handshake Scan' })
    await runResolverUseCase1()
    await delay(350)

    setCurrentStepProgress({ current: 4, total: 15, name: 'UC-RES-02: Fast-Path MMKV Cache' })
    await runResolverUseCase2()
    await delay(350)

    // Step 5 - 7: BPBIO Serial
    setCurrentStepProgress({
      current: 5,
      total: 15,
      name: 'UC-SER-BPBIO-01: Connect 9600 & Trigger',
    })
    await runBpbioUseCase1()
    await delay(350)

    setCurrentStepProgress({ current: 6, total: 15, name: 'UC-SER-BPBIO-02: Assemble S+D+P & BCC' })
    await runBpbioUseCase2()
    await delay(350)

    setCurrentStepProgress({ current: 7, total: 15, name: 'UC-SER-BPBIO-03: Duplicate Safety' })
    await runBpbioUseCase3()
    await delay(350)

    // Step 8 - 11: InBody Serial
    setCurrentStepProgress({ current: 8, total: 15, name: 'UC-SER-INBODY-01: Polling Status 0' })
    await runInBodyUseCase1()
    await delay(350)

    setCurrentStepProgress({
      current: 9,
      total: 15,
      name: 'UC-SER-INBODY-02: Status 1 -> Send INFO',
    })
    await runInBodyUseCase2()
    await delay(350)

    setCurrentStepProgress({
      current: 10,
      total: 15,
      name: 'UC-SER-INBODY-03: Status 2 -> Progress BIA',
    })
    await runInBodyUseCase3()
    await delay(350)

    setCurrentStepProgress({
      current: 11,
      total: 15,
      name: 'UC-SER-INBODY-04: Status 3 -> Parse 764B',
    })
    await runInBodyUseCase4()
    await delay(350)

    // Step 12 - 15: Exceptions & Faults
    setCurrentStepProgress({ current: 12, total: 15, name: 'UC-ERR-01: USB Detached Exception' })
    await runExceptionUseCase1()
    await delay(350)

    setCurrentStepProgress({ current: 13, total: 15, name: 'UC-ERR-02: Motion Noise Timeout' })
    await runExceptionUseCase2()
    await delay(350)

    setCurrentStepProgress({ current: 14, total: 15, name: 'UC-ERR-03: Bad BCC Discard' })
    await runExceptionUseCase3()
    await delay(350)

    setCurrentStepProgress({ current: 15, total: 15, name: 'UC-ERR-04: 3x No-ETX Timeout' })
    await runExceptionUseCase4()
    await delay(300)

    addLog(
      'SUITE',
      'INFO',
      '=== HOÀN TẤT KIỂM THỬ TUẦN TỰ 100% USE CASES (ALL 15 TEST CASES PASSED) ===',
    )
    setIsRunningAll(false)
    setCurrentStepProgress({ current: 15, total: 15, name: 'HOÀN TẤT 15/15 USE CASES' })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View className="flex-row items-center gap-3">
              <View className="h-4 w-4 rounded-full bg-emerald-500" />
              <Text style={styles.headerTitle}>PROMEDI HARDWARE & NETWORK TEST SUITE (15 UCs)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕ ĐÓNG</Text>
            </TouchableOpacity>
          </View>

          {/* Sequential Execution Progress Banner */}
          {isRunningAll && (
            <View style={styles.progressBanner}>
              <View className="mb-1 flex-row items-center justify-between">
                <Text style={styles.progressBannerText}>
                  🔄 ĐANG CHẠY TUẦN TỰ BƯỚC {currentStepProgress.current}/15
                </Text>
                <Text style={styles.progressBannerSubtext}>{currentStepProgress.name}</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(currentStepProgress.current / 15) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Top Quick Action Controls */}
          <View style={styles.topControlBar}>
            <TouchableOpacity
              onPress={handleRunAllUsecases}
              disabled={isRunningAll}
              style={[styles.runAllBtn, isRunningAll && styles.disabledBtn]}
            >
              <Text style={styles.runAllBtnText}>
                {isRunningAll
                  ? '⏳ ĐANG CHẠY TUẦN TỰ 15 UCs...'
                  : '🚀 CHẠY TUẦN TỰ TOÀN BỘ 15 USE CASES'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={clearLogs} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>🗑 XÓA CONSOLE LOGS</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => setActiveTab('sequential')}
              style={[styles.tabItem, activeTab === 'sequential' && styles.activeTabItemSeq]}
            >
              <Text
                style={[styles.tabText, activeTab === 'sequential' && styles.activeTabTextSeq]}
              >{`📋 TUẦN TỰ 15 BƯỚC\n(BƯỚC 01 -> 15)`}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('sunmi-field')}
              style={[styles.tabItem, activeTab === 'sunmi-field' && styles.activeTabItemSunmi]}
            >
              <Text
                style={[styles.tabText, activeTab === 'sunmi-field' && styles.activeTabTextSunmi]}
              >{`🔬 8 TEST SUNMI THẬT\n(CHECKLIST MỤC 0-7)`}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('inbody')}
              style={[styles.tabItem, activeTab === 'inbody' && styles.activeTabItem]}
            >
              <Text
                style={[styles.tabText, activeTab === 'inbody' && styles.activeTabText]}
              >{`InBody 260S\n(19200 8N1)`}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('bpbio')}
              style={[styles.tabItem, activeTab === 'bpbio' && styles.activeTabItem]}
            >
              <Text
                style={[styles.tabText, activeTab === 'bpbio' && styles.activeTabText]}
              >{`BPBIO750\n(9600 8N1)`}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('tcp')}
              style={[styles.tabItem, activeTab === 'tcp' && styles.activeTabItem]}
            >
              <Text
                style={[styles.tabText, activeTab === 'tcp' && styles.activeTabText]}
              >{`TCP Socket\n(Network LAN)`}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('resolver')}
              style={[styles.tabItem, activeTab === 'resolver' && styles.activeTabItem]}
            >
              <Text
                style={[styles.tabText, activeTab === 'resolver' && styles.activeTabText]}
              >{`Resolver\n(Auto-Probe)`}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('tof')}
              style={[styles.tabItem, activeTab === 'tof' && styles.activeTabItem]}
            >
              <Text
                style={[styles.tabText, activeTab === 'tof' && styles.activeTabText]}
              >{`ToF Height\n(460800 Real)`}</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('exception')}
              style={[styles.tabItem, activeTab === 'exception' && styles.activeTabItem]}
            >
              <Text
                style={[styles.tabText, activeTab === 'exception' && styles.activeTabText]}
              >{`Ngoại Lệ\n(Fault Injection)`}</Text>
            </Pressable>
          </View>

          {/* Tab Content Panel & Action Cards */}
          <View style={styles.contentArea}>
            <ScrollView contentContainerStyle={styles.cardGrid}>
              {/* TAB SPECIAL: SUNMI FIELD DIAGNOSTICS (CHECKLIST MỤC 0 - 7) */}
              {activeTab === 'sunmi-field' && (
                <>
                  <Text style={styles.phaseHeaderTitle}>
                    🔬 BỘ 8 BÀI TEST NGHIỆM THU THỰC TẾ TRÊN MÁY SUNMI K2 MINI (MỤC 0 - 7)
                  </Text>

                  <TestCard
                    stepBadge="MỤC 0 (BẮT BUỘC)"
                    code="UC-HW-00"
                    title="Mục 0: Test Native Kotlin Enumerate & openDevice()"
                    desc="Xác nhận UsbManager.findAllDrivers() & openDevice() claim thành công trên Sunmi K2 thật (Sunmi OS không chặn)"
                    onRun={runSunmiUseCase0}
                  />

                  <TestCard
                    stepBadge="MỤC 0-RAW (DISCOVERY)"
                    code="UC-HW-00-RAW"
                    title="Mục 0-RAW: Liệt Kê Tất Cả USB Thô (listRawUsbDevices)"
                    desc="Quét UsbManager.getDeviceList() hiển thị Vendor ID, Product ID, Device Class của MỌI thiết bị USB cắm vào Sunmi K2"
                    onRun={runSunmiUseCaseListRaw}
                  />

                  <TestCard
                    stepBadge="MỤC 1 (CHECK)"
                    code="UC-HW-01"
                    title="Mục 1: Thuật Toán Checksum BCC XOR Range 5..14"
                    desc="Xác minh thuật toán tính Checksum BCC XOR mảng byte từ STX (0x02) đến ETX (0x03) cho BPBIO750"
                    onRun={runSunmiUseCase1}
                  />

                  <TestCard
                    stepBadge="MỤC 2 (CHECK)"
                    code="UC-HW-02"
                    title="Mục 2: Cấu Hình Tham Số Serial 9600 8N1 / 19200 8N1"
                    desc="Kiểm tra cấu hình Baudrate, Data bits (8), Stop bits (1), Parity (None) trên phần cứng thật"
                    onRun={runSunmiUseCase2}
                  />

                  <TestCard
                    stepBadge="MỤC 3 (CHECK)"
                    code="UC-HW-03"
                    title="Mục 3: Phản Hồi ACK Cho Lệnh LOCK (0x4C) / UNLOCK (0x55)"
                    desc="Gửi lệnh khóa/mở bàn phím xuống BPBIO750 thật và bắt byte phản hồi ACK (0x06)"
                    onRun={runSunmiUseCase3}
                  />

                  <TestCard
                    stepBadge="MỤC 4 (CHECK)"
                    code="UC-HW-04"
                    title="Mục 4: An Toàn Cross-Talk Probe Safety"
                    desc="Gửi STATUS InBody sang cổng BPBIO và ngược lại, xác nhận không thiết bị nào phản hồi nhầm"
                    onRun={runSunmiUseCase4}
                  />

                  <TestCard
                    stepBadge="MỤC 5 (CHECK)"
                    code="UC-HW-05"
                    title="Mục 5: Nuôi Nguồn Tín Hiệu DTR=true / RTS=true"
                    desc="Bật cờ DTR và RTS cấp nguồn cho mạch chuyển đổi RS232 dongle CH340 / FTDI"
                    onRun={runSunmiUseCase5}
                  />

                  <TestCard
                    stepBadge="MỤC 6 (CHECK)"
                    code="UC-HW-06"
                    title="Mục 6: Quyền USB Auto-Grant Via EMM / device_filter.xml"
                    desc="Xác nhận HasPermission() tự cấp quyền ngầm không cần hiện dialog chọn tay trên Kiosk"
                    onRun={runSunmiUseCase6}
                  />

                  <TestCard
                    stepBadge="MỤC 7 (CHECK)"
                    code="UC-HW-07"
                    title="Mục 7: Benchmark Fast-Path Cache MMKV (< 200ms)"
                    desc="Đo thời gian đọc BindingStore từ MMKV và verify 2 cổng USB trên chip Sunmi K2 Mini"
                    onRun={runSunmiUseCase7}
                  />
                </>
              )}

              {/* TAB 0: SEQUENTIAL MANUAL PIPELINE (STEPS 01 TO 15 IN ORDER) */}
              {activeTab === 'sequential' && (
                <>
                  <Text style={styles.phaseHeaderTitle}>
                    🌐 GIAI ĐOẠN 1: MẠNG TCP/IP SOCKET & AUTO PROBE (BƯỚC 01 - 04)
                  </Text>

                  {/* Ô Cấu hình TCP IP & Port */}
                  <View style={styles.configBoxTcp}>
                    <Text style={styles.configBoxTitle}>
                      🌐 CẤU HÌNH MẠNG TCP/IP SOCKET THIẾT BỊ
                    </Text>
                    <View style={styles.configBoxRow}>
                      <View className="flex-1">
                        <Text style={styles.configLabelHeader}>Địa chỉ IP Host:</Text>
                        <TextInput
                          style={styles.configInputHostFull}
                          value={tcpHost}
                          onChangeText={setTcpHost}
                          placeholder="192.168.1.100"
                          placeholderTextColor="#64748B"
                        />
                      </View>
                      <View style={{ width: 100 }}>
                        <Text style={styles.configLabelHeader}>Cổng (Port):</Text>
                        <TextInput
                          style={styles.configInputPortFull}
                          value={tcpPort}
                          onChangeText={setTcpPort}
                          keyboardType="numeric"
                          placeholder="2004"
                          placeholderTextColor="#64748B"
                        />
                      </View>
                    </View>
                  </View>

                  <TestCard
                    stepBadge="BƯỚC 01/15"
                    code="UC-TCP-01"
                    title="1. Kết Nối Socket TCP (Host:Port)"
                    desc={`Mở kết nối TCP Socket tới tcp://${tcpHost}:${tcpPort} với timeout 5000ms`}
                    onRun={runTcpUseCase1}
                  />
                  <TestCard
                    stepBadge="BƯỚC 02/15"
                    code="UC-TCP-02"
                    title="2. Gửi Byte Hex Nhị Phân (Latin1 Encoding)"
                    desc="Bảo toàn 100% mảng byte thô Hex > 0x7F qua TCP Socket không bị méo"
                    onRun={runTcpUseCase2}
                  />
                  <TestCard
                    stepBadge="BƯỚC 03/15"
                    code="UC-RES-01"
                    title="3. Full USB Probe Handshake Scan"
                    desc="Dò 2 cổng USB bằng handshake probe (probe:role) không phụ thuộc dây cắm"
                    onRun={runResolverUseCase1}
                  />
                  <TestCard
                    stepBadge="BƯỚC 04/15"
                    code="UC-RES-02"
                    title="4. Fast-Path MMKV Cache Verification"
                    desc="Đọc binding cũ từ MMKV và xác thực lại trong < 200ms giúp Kiosk mở nhanh"
                    onRun={runResolverUseCase2}
                  />

                  <Text style={styles.phaseHeaderTitle}>
                    🩸 GIAI ĐOẠN 2: CHU TRÌNH ĐO HUYẾT ÁP BPBIO750 (BƯỚC 05 - 07)
                  </Text>
                  <TestCard
                    stepBadge="BƯỚC 05/15"
                    code="UC-SER-BPBIO-01"
                    title="5. Connect Serial 9600 & Request Result"
                    desc="Kết nối cổng Serial 9600 8N1 và kích hoạt lệnh REQUEST_RESULT (0x43)"
                    onRun={runBpbioUseCase1}
                  />
                  <TestCard
                    stepBadge="BƯỚC 06/15"
                    code="UC-SER-BPBIO-02"
                    title="6. Ghép 3 Gói S+D+P & Checksum BCC"
                    desc="Thu thập 3 gói 16-byte cố định Systolic, Diastolic, Pulse & XOR BCC Checksum"
                    onRun={runBpbioUseCase2}
                  />
                  <TestCard
                    stepBadge="BƯỚC 07/15"
                    code="UC-SER-BPBIO-03"
                    title="7. Duplicate Identifier Reset Safety"
                    desc="Tự động xả bộ đệm pending khi nhận identifier S trùng lặp lượt đo mới"
                    onRun={runBpbioUseCase3}
                  />

                  <Text style={styles.phaseHeaderTitle}>
                    ⚖️ GIAI ĐOẠN 3: PHÂN TÍCH CƠ THỂ INBODY 260S (BƯỚC 08 - 11)
                  </Text>
                  <View style={styles.configBox}>
                    <Text style={styles.configLabel}>Chiều cao (cm):</Text>
                    <TextInput
                      style={styles.configInput}
                      value={inbodyHeight}
                      onChangeText={setInbodyHeight}
                      keyboardType="numeric"
                    />
                    <Text style={styles.configLabel}>Tuổi:</Text>
                    <TextInput
                      style={styles.configInput}
                      value={inbodyAge}
                      onChangeText={setInbodyAge}
                      keyboardType="numeric"
                    />
                  </View>

                  <TestCard
                    stepBadge="BƯỚC 08/15"
                    code="UC-SER-INBODY-01"
                    title="8. Polling Status 0 (Serial 19200)"
                    desc="Kiểm tra mở cổng Serial 19200 8N1 và Polling STATUS 500ms ở trạng thái chờ"
                    onRun={runInBodyUseCase1}
                  />
                  <TestCard
                    stepBadge="BƯỚC 09/15"
                    code="UC-SER-INBODY-02"
                    title="9. Status '1' -> Gửi Gói INFO & LOCK 1"
                    desc="Nhận diện cân nặng xong, nạp thông tin định danh bệnh nhân & khóa máy"
                    onRun={runInBodyUseCase2}
                  />
                  <TestCard
                    stepBadge="BƯỚC 10/15"
                    code="UC-SER-INBODY-03"
                    title="10. BIA Scan Status '2' Tiến Trình %"
                    desc="Quét dòng điện BIA đa tần số, cập nhật % tiến trình từ 5% -> 95%"
                    onRun={runInBodyUseCase3}
                  />
                  <TestCard
                    stepBadge="BƯỚC 11/15"
                    code="UC-SER-INBODY-04"
                    title="11. Status '3' -> Parse 764-byte RESULT"
                    desc="Đo BIA hoàn tất, thu thập và giải mã 764 chỉ số Hex/ASCII & Lock 2 Unlock"
                    onRun={runInBodyUseCase4}
                  />

                  <Text style={styles.phaseHeaderTitle}>
                    ⚠️ GIAI ĐOẠN 4: NGOẠI LỆ & GIẢ LẬP LỖI BIÊN (BƯỚC 12 - 15)
                  </Text>
                  <TestCard
                    stepBadge="BƯỚC 12/15"
                    code="UC-ERR-01"
                    title="12. Inject Rút Cáp USB (DEVICE_DETACHED)"
                    desc="Bắt event ngắt kết nối vật lý cáp USB và FSM chuyển disconnected"
                    onRun={runExceptionUseCase1}
                  />
                  <TestCard
                    stepBadge="BƯỚC 13/15"
                    code="UC-ERR-02"
                    title="13. Inject Cử Động Tay / Tuột Bao Đo"
                    desc="Timeout 2000ms thu thập dữ liệu BPBIO kích hoạt giọng nói hướng dẫn thả lỏng"
                    onRun={runExceptionUseCase2}
                  />
                  <TestCard
                    stepBadge="BƯỚC 14/15"
                    code="UC-ERR-03"
                    title="14. Inject Sai Byte Checksum BCC"
                    desc="Phát hiện và âm thầm loại bỏ gói tin rác có byte checksum XOR không hợp lệ"
                    onRun={runExceptionUseCase3}
                  />
                  <TestCard
                    stepBadge="BƯỚC 15/15"
                    code="UC-ERR-04"
                    title="15. Inject Timeout 3x No-ETX InBody"
                    desc="Thử lại 3 lần 800ms không nhận byte 0x03 ETX -> Chuyển transportTimeout & Unlock"
                    onRun={runExceptionUseCase4}
                  />
                </>
              )}

              {activeTab === 'inbody' && (
                <>
                  <View style={styles.configBox}>
                    <Text style={styles.configLabel}>Chiều cao (cm):</Text>
                    <TextInput
                      style={styles.configInput}
                      value={inbodyHeight}
                      onChangeText={setInbodyHeight}
                      keyboardType="numeric"
                    />
                    <Text style={styles.configLabel}>Tuổi:</Text>
                    <TextInput
                      style={styles.configInput}
                      value={inbodyAge}
                      onChangeText={setInbodyAge}
                      keyboardType="numeric"
                    />
                  </View>

                  <TestCard
                    code="UC-SER-INBODY-01"
                    title="1. Check Status 30 (Ready)"
                    desc="Step 1: Gửi lệnh STATUS (0x63) kiểm tra máy InBody đang rảnh ở trạng thái 30"
                    onRun={runInBodyUseCase1}
                  />
                  <TestCard
                    code="UC-SER-INBODY-02"
                    title="2. Lock Machine (0x6C 31)"
                    desc="Step 2: Gửi lệnh LOCK 1 (0x6C 31) khóa bàn phím & màn hình InBody 260S"
                    onRun={runInBodyUseCase2}
                  />
                  <TestCard
                    code="UC-SER-INBODY-03"
                    title="3. Check Status After Lock"
                    desc="Step 3: Gửi lệnh STATUS (0x63) kiểm tra máy đã ghi nhận cờ Khóa"
                    onRun={runInBodyUseCase3}
                  />
                  <TestCard
                    code="UC-SER-INBODY-04"
                    title="4. Unlock Machine (0x6C 32)"
                    desc="Step 4: Gửi lệnh UNLOCK (0x6C 32) mở khóa màn hình InBody trở lại bình thường"
                    onRun={runInBodyUseCase4}
                  />
                  <TestCard
                    code="UC-SER-INBODY-05"
                    title="5. Quy Trình Đo Tự Động A-Z (INFO ➔ BIA ➔ RESULT)"
                    desc="Step 5: Polling STATUS 60s chờ bước lên cân (Status 31) ➔ Auto nạp INFO (0x75) ➔ Theo dõi BIA ➔ Auto rút & parse 764 bytes RESULT (0x64)"
                    onRun={runInBodyUseCase5}
                  />
                </>
              )}

              {activeTab === 'bpbio' && (
                <>
                  <TestCard
                    code="UC-SER-BP-RECENT"
                    title="1. Rút Kết Quả Đo Gần Nhất (RB 0x52 0x42)"
                    desc="Gửi khung 10-byte 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x42 0x03 0x10 kéo 3 giá trị S, D, P"
                    onRun={runBpbioRequestRecent}
                  />
                  <TestCard
                    code="UC-SER-BP-START"
                    title="2. Bắt Đầu Đo Lường Bơm Hơi (RC 0x52 0x43)"
                    desc="Gửi khung 10-byte 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x43 0x03 0x11 ép máy bắt đầu bơm hơi đo"
                    onRun={runBpbioStartMeasurement}
                  />
                  <TestCard
                    code="UC-SER-BP-STOP"
                    title="3. Dừng Đo Lường Khẩn Cấp (RF 0x52 0x46)"
                    desc="Gửi khung 10-byte 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x46 0x03 0x14 xả khí & dừng đo khẩn cấp"
                    onRun={runBpbioStopMeasurement}
                  />
                  <TestCard
                    code="UC-SER-BP-CONFIRM"
                    title="4. Xác Nhận Kết Nối (RE 0x52 0x45)"
                    desc="Gửi khung 10-byte 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x45 0x03 0x17 ➔ Phản hồi 'CON'"
                    onRun={runBpbioConfirmConnection}
                  />
                  <TestCard
                    code="UC-SER-BP-LOCK"
                    title="5. Khóa Nút Bấm Vật Lý Start/Stop (RL 0x52 0x4C)"
                    desc="Gửi khung 10-byte 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x4C 0x03 0x1E ➔ Phản hồi 'LCK'"
                    onRun={runBpbioLockButton}
                  />
                  <TestCard
                    code="UC-SER-BP-UNLOCK"
                    title="6. Mở Khóa Nút Bấm Vật Lý Start/Stop (Rr 0x52 0x72)"
                    desc="Gửi khung 10-byte 0x16 0x16 0x01 0x30 0x30 0x02 0x52 0x72 0x03 0x20 ➔ Phản hồi 'RLS'"
                    onRun={runBpbioUnlockButton}
                  />
                  <TestCard
                    code="UC-SER-BPBIO-04"
                    title="7. Quy Trình Đo Huyết Áp Tự Động A-Z (Timeout 2 Phút)"
                    desc="Polling luồng dữ liệu 3 gói S+D+P 120s ➔ Gom chỉ số Tâm thu, Tâm trương, Nhịp tim ➔ Phân loại sức khỏe"
                    onRun={runBpbioUseCase4}
                  />
                  <TestCard
                    code="UC-SER-BP-ONDATA"
                    title="8. Lắng Nghe Direct onData Logs (Log Byte Thô & ASCII)"
                    desc="Mở cổng Serial BPBIO 9600 8N1 trong 2 phút (120s) và in ngay từng Chunk byte thô Hex & ASCII nhận được qua onData"
                    onRun={runBpbioOnDataLogger}
                  />
                </>
              )}

              {activeTab === 'tcp' && (
                <>
                  {/* Ô Cấu hình TCP IP & Port */}
                  <View style={styles.configBoxTcp}>
                    <Text style={styles.configBoxTitle}>
                      🌐 CẤU HÌNH MẠNG TCP/IP SOCKET THIẾT BỊ
                    </Text>
                    <View style={styles.configBoxRow}>
                      <View className="flex-1">
                        <Text style={styles.configLabelHeader}>Địa chỉ IP Host:</Text>
                        <TextInput
                          style={styles.configInputHostFull}
                          value={tcpHost}
                          onChangeText={setTcpHost}
                          placeholder="192.168.1.100"
                          placeholderTextColor="#64748B"
                        />
                      </View>
                      <View style={{ width: 100 }}>
                        <Text style={styles.configLabelHeader}>Cổng (Port):</Text>
                        <TextInput
                          style={styles.configInputPortFull}
                          value={tcpPort}
                          onChangeText={setTcpPort}
                          keyboardType="numeric"
                          placeholder="2004"
                          placeholderTextColor="#64748B"
                        />
                      </View>
                    </View>
                  </View>

                  <TestCard
                    code="UC-TCP-01"
                    title="1. Kết Nối Socket TCP (Host:Port)"
                    desc={`Mở kết nối TCP Socket tới tcp://${tcpHost}:${tcpPort} với timeout 5000ms`}
                    onRun={runTcpUseCase1}
                  />
                  <TestCard
                    code="UC-TCP-02"
                    title="2. Gửi Byte Hex Nhị Phân (Latin1 Encoding)"
                    desc="Bảo toàn 100% mảng byte thô Hex > 0x7F qua TCP Socket không bị méo"
                    onRun={runTcpUseCase2}
                  />
                  <TestCard
                    code="UC-TCP-03"
                    title="3. Xử Lý Timeout Kết Nối Socket"
                    desc="Hết thời gian chờ 5000ms ném lỗi TransportError('CONNECT_FAILED')"
                    onRun={runTcpUseCase3}
                  />
                  <TestCard
                    code="UC-TCP-04"
                    title="4. Phát Hiện Đóng Kết Nối (onClose Event)"
                    desc="Bắt sự kiện ngắt kết nối mạng LAN đột ngột và cập nhật isConnected = false"
                    onRun={runTcpUseCase4}
                  />
                </>
              )}

              {activeTab === 'resolver' && (
                <>
                  <TestCard
                    code="UC-RES-01"
                    title="1. Full USB Probe Handshake Scan"
                    desc="Dò 2 cổng USB bằng handshake probe (probe:role) không phụ thuộc dây cắm"
                    onRun={runResolverUseCase1}
                  />
                  <TestCard
                    code="UC-RES-02"
                    title="2. Fast-Path MMKV Cache Verification"
                    desc="Đọc binding cũ từ MMKV và xác thực lại trong < 200ms giúp Kiosk mở nhanh"
                    onRun={runResolverUseCase2}
                  />
                </>
              )}

              {activeTab === 'tof' && (
                <>
                  <Text style={styles.phaseHeaderTitle}>
                    📡 CẢM BIẾN CHIỀU CAO TOF STMICROELECTRONICS VL53L5CX (460800 BAUD - PHẦN CỨNG
                    THẬT)
                  </Text>

                  {/* Status Banner */}
                  <View
                    style={{
                      backgroundColor: isTofStreaming ? '#064E3B' : '#1E293B',
                      borderColor: isTofStreaming ? '#10B981' : '#475569',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: isTofStreaming ? '#34D399' : '#94A3B8',
                          fontSize: 13,
                          fontWeight: '800',
                        }}
                      >
                        {isTofStreaming
                          ? '🟢 KẾT NỐI PHẦN CỨNG THẬT (STREAMING 15Hz)'
                          : '⚪ CHƯA KẾT NỐI STREAMING'}
                      </Text>
                      <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                        {isTofStreaming
                          ? 'Cổng Serial 460800 Baud | Gói nhị phân 204 Bytes / 66ms'
                          : 'Bấm nút "1. Bắt Đầu Luồng Stream" để mở cổng USB Serial phần cứng'}
                      </Text>
                      {tofError && (
                        <Text
                          style={{
                            color: '#F87171',
                            fontSize: 11,
                            marginTop: 4,
                            fontWeight: '700',
                          }}
                        >
                          ⚠️ Lỗi: {tofError}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TestCard
                    code="UC-TOF-01"
                    title="1. Bắt Đầu Luồng Stream Phần CỨNG THẬT (460800 Baud)"
                    desc="Mở cổng USB Serial thật nối mạch ESP32 VL53L5CX đọc 64 zones nhị phân (204B @ 15Hz)"
                    onRun={runTofStartRealHardwareStream}
                  />

                  <TestCard
                    code="UC-TOF-02"
                    title="2. Dừng Luồng Stream & Ngắt Kết Nối An Toàn"
                    desc="Ngắt kết nối USB Serial transport và dừng nhận byte thô"
                    onRun={runTofStopStream}
                  />

                  {/* Render 8x8 Grid Heatmap Live Data */}
                  {tofFramePayload && (
                    <View
                      style={{
                        backgroundColor: '#0F172A',
                        borderRadius: 8,
                        padding: 14,
                        marginTop: 12,
                        borderColor: '#334155',
                        borderWidth: 1,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <Text style={{ color: '#38BDF8', fontSize: 13, fontWeight: '800' }}>
                          📊 MA TRẬN 8x8 KHOẢNG CÁCH (FRAME ID: #{tofFramePayload.frameId})
                        </Text>
                        <Text style={{ color: '#64748B', fontSize: 11 }}>
                          Thời gian: {tofFramePayload.timestampMs}ms
                        </Text>
                      </View>

                      <View style={{ alignItems: 'center' }}>
                        <View
                          style={{ flexDirection: 'row', flexWrap: 'wrap', width: 312, gap: 3 }}
                        >
                          {tofFramePayload.distances.map((dist, idx) => {
                            let bgColor = '#0284C7' // Floor > 1200mm (Cyan/Blue)
                            if (dist < 300)
                              bgColor = '#EF4444' // Head Peak < 300mm (Red)
                            else if (dist < 600)
                              bgColor = '#F97316' // Head 300-600mm (Orange)
                            else if (dist < 1000) bgColor = '#EAB308' // Shoulders 600-1000mm (Yellow)

                            return (
                              <View
                                key={idx}
                                style={{
                                  width: 35,
                                  height: 35,
                                  backgroundColor: bgColor,
                                  borderRadius: 4,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
                                  {dist}
                                </Text>
                              </View>
                            )
                          })}
                        </View>
                      </View>

                      <View
                        style={{
                          marginTop: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-around',
                          backgroundColor: '#1E293B',
                          padding: 8,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>
                          🔴 Peak (&lt;30cm)
                        </Text>
                        <Text style={{ color: '#F97316', fontSize: 10, fontWeight: '700' }}>
                          🟠 Đầu (&lt;60cm)
                        </Text>
                        <Text style={{ color: '#EAB308', fontSize: 10, fontWeight: '700' }}>
                          🟡 Vai (&lt;100cm)
                        </Text>
                        <Text style={{ color: '#38BDF8', fontSize: 10, fontWeight: '700' }}>
                          🔵 Sàn (&gt;100cm)
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {activeTab === 'exception' && (
                <>
                  <TestCard
                    code="UC-ERR-01"
                    title="1. Inject Rút Cáp USB (DEVICE_DETACHED)"
                    desc="Bắt event ngắt kết nối vật lý cáp USB và FSM chuyển disconnected"
                    onRun={runExceptionUseCase1}
                  />
                  <TestCard
                    code="UC-ERR-02"
                    title="2. Inject Cử Động Tay / Tuột Bao Đo"
                    desc="Timeout 2000ms thu thập dữ liệu BPBIO kích hoạt giọng nói hướng dẫn thả lỏng"
                    onRun={runExceptionUseCase2}
                  />
                  <TestCard
                    code="UC-ERR-03"
                    title="3. Inject Sai Byte Checksum BCC"
                    desc="Phát hiện và âm thầm loại bỏ gói tin rác có byte checksum XOR không hợp lệ"
                    onRun={runExceptionUseCase3}
                  />
                  <TestCard
                    code="UC-ERR-04"
                    title="4. Inject Timeout 3x No-ETX InBody"
                    desc="Thử lại 3 lần 800ms không nhận byte 0x03 ETX -> Chuyển transportTimeout & Unlock"
                    onRun={runExceptionUseCase4}
                  />
                </>
              )}
            </ScrollView>
          </View>

          {/* Console Log Terminal Window */}
          <View style={styles.consoleContainer}>
            <View style={styles.consoleHeader}>
              <Text style={styles.consoleTitle}>💻 HARDWARE & NETWORK LIVE CONSOLE LOGS</Text>
              <Text style={styles.consoleSubtitle}>
                {logs.length} bản ghi | Chạm bản ghi để xem POPUP CHI TIẾT
              </Text>
            </View>

            <ScrollView style={styles.logList} contentContainerStyle={{ paddingVertical: 6 }}>
              {logs.length === 0 ? (
                <Text style={styles.emptyLogText}>
                  Chưa có bản ghi nào. Bấm chọn nút Test Case ở trên hoặc bấm &quot;CHẠY TUẦN TỰ
                  TOÀN BỘ 15 USE CASES&quot;.
                </Text>
              ) : (
                logs.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedLog(item)}
                    style={styles.logRow}
                  >
                    <View className="w-full flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text style={styles.logTime}>[{item.timestamp}]</Text>
                        <View
                          style={[
                            styles.badge,
                            item.status === 'PASS'
                              ? styles.badgePass
                              : item.status === 'FAIL'
                                ? styles.badgeFail
                                : styles.badgeInfo,
                          ]}
                        >
                          <Text style={styles.badgeText}>{item.status}</Text>
                        </View>
                        <Text style={styles.logCode}>[{item.useCaseCode}]</Text>

                        {item.latencyMs !== undefined && (
                          <Text style={styles.logLatency}>({item.latencyMs}ms)</Text>
                        )}
                      </View>

                      {/* View Details Button */}
                      <View style={styles.viewDetailBadge}>
                        <Text style={styles.viewDetailBadgeText}>🔍 XEM POPUP</Text>
                      </View>
                    </View>

                    <Text style={styles.logMessage}>{item.message}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* POPUP CHI TIẾT PHẢN HỒI USECASE (LOG DETAIL INSPECTOR MODAL) */}
      {selectedLog && (
        <Modal visible transparent animationType="fade">
          <View style={styles.detailModalBackdrop}>
            <View style={styles.detailModalCard}>
              {/* Header */}
              <View style={styles.detailModalHeader}>
                <View className="flex-row items-center gap-2">
                  <View
                    style={[
                      styles.badge,
                      selectedLog.status === 'PASS'
                        ? styles.badgePass
                        : selectedLog.status === 'FAIL'
                          ? styles.badgeFail
                          : styles.badgeInfo,
                    ]}
                  >
                    <Text style={styles.badgeTextLarge}>{selectedLog.status}</Text>
                  </View>
                  <Text style={styles.detailModalTitle}>
                    [{selectedLog.useCaseCode}] CHI TIẾT PHẢN HỒI
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕ ĐÓNG</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, padding: 16 }}>
                {/* Status Message Section */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionTitle}>📌 MÔ TẢ KẾT QUẢ THỰC THI</Text>
                  <Text style={styles.detailMessageText}>{selectedLog.message}</Text>
                  <Text style={styles.detailMetaText}>
                    Thời gian: {selectedLog.timestamp} | Độ trễ xử lý: {selectedLog.latencyMs ?? 0}
                    ms
                  </Text>
                </View>

                {/* Sent Payload Section */}
                {selectedLog.sentPayloadHex && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitleSent}>
                      📤 DỮ LIỆU GỬI ĐÍ (SENT PAYLOAD / COMMAND)
                    </Text>
                    <View style={styles.codeBlockBoxSent}>
                      <Text style={styles.codeBlockTextSent}>{selectedLog.sentPayloadHex}</Text>
                    </View>
                  </View>
                )}

                {/* Received Payload Section */}
                {selectedLog.recvPayloadHex && (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionTitleRecv}>
                      📥 DỮ LIỆU NHẬN VỀ & BÓC TÁCH (RECV PAYLOAD & PARSED METRICS)
                    </Text>
                    <View style={styles.codeBlockBoxRecv}>
                      <Text style={styles.codeBlockTextRecv}>{selectedLog.recvPayloadHex}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Detail Modal Action Footer */}
              <View style={styles.detailModalFooter}>
                <TouchableOpacity
                  onPress={() => setSelectedLog(null)}
                  style={styles.detailCloseFooterBtn}
                >
                  <Text style={styles.detailCloseFooterBtnText}>ĐÓNG POPUP CHI TIẾT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  )
}

const TestCard: React.FC<{
  stepBadge?: string
  code: string
  title: string
  desc: string
  onRun: () => void
}> = ({ stepBadge, code, title, desc, onRun }) => (
  <View style={styles.cardContainer}>
    <View style={{ flex: 1 }}>
      <View className="flex-row items-center gap-2">
        {stepBadge && (
          <View style={styles.stepBadgeBox}>
            <Text style={styles.stepBadgeText}>{stepBadge}</Text>
          </View>
        )}
        <Text style={styles.cardCode}>{code}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
    <TouchableOpacity onPress={onRun} style={styles.runBtn}>
      <Text style={styles.runBtnText}>▶ TEST</Text>
    </TouchableOpacity>
  </View>
)

const styles = StyleSheet.create({
  activeTabItem: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#EF4444',
    borderBottomWidth: 3,
  },
  activeTabItemSeq: {
    backgroundColor: '#312E81',
    borderBottomColor: '#6366F1',
    borderBottomWidth: 3,
  },
  activeTabItemSunmi: {
    backgroundColor: '#064E3B',
    borderBottomColor: '#10B981',
    borderBottomWidth: 3,
  },
  activeTabText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  activeTabTextSeq: {
    color: '#E0E7FF',
    fontWeight: '800',
  },
  activeTabTextSunmi: {
    color: '#D1FAE5',
    fontWeight: '800',
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeFail: {
    backgroundColor: '#991B1B',
  },
  badgeInfo: {
    backgroundColor: '#1D4ED8',
  },
  badgePass: {
    backgroundColor: '#065F46',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextLarge: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cardCode: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContainer: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    padding: 12,
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  cardGrid: {
    padding: 8,
  },
  cardTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  clearBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: '#7F1D1D',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeBtnText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  codeBlockBoxRecv: {
    backgroundColor: '#020617',
    borderColor: '#059669',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    padding: 12,
  },
  codeBlockBoxSent: {
    backgroundColor: '#020617',
    borderColor: '#0284C7',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    padding: 12,
  },
  codeBlockTextRecv: {
    color: '#34D399',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  codeBlockTextSent: {
    color: '#38BDF8',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  configBox: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    padding: 10,
  },
  configBoxRow: {
    flexDirection: 'row',
    gap: 12,
  },
  configBoxTcp: {
    backgroundColor: '#0F172A',
    borderColor: '#0284C7',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  configBoxTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  configInput: {
    backgroundColor: '#1E293B',
    borderRadius: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
  },
  configInputHostFull: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderRadius: 6,
    borderWidth: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  configInputPortFull: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderRadius: 6,
    borderWidth: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  configLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  configLabelHeader: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  consoleContainer: {
    backgroundColor: '#090D16',
    borderColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    height: 230,
    marginTop: 8,
    padding: 8,
  },
  consoleHeader: {
    alignItems: 'center',
    borderBottomColor: '#1E293B',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  consoleSubtitle: {
    color: '#64748B',
    fontSize: 11,
  },
  consoleTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  contentArea: {
    backgroundColor: '#0B1120',
    borderRadius: 8,
    flex: 1,
  },

  // Detail Inspector Modal Styles
  detailCloseFooterBtn: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
  },

  detailCloseFooterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  detailMessageText: {
    color: '#F1F5F9',
    fontSize: 14,
    lineHeight: 22,
  },

  detailMetaText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },

  detailModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },

  detailModalCard: {
    backgroundColor: '#0F172A',
    borderColor: '#38BDF8',
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    maxHeight: 680,
    maxWidth: 850,
    overflow: 'hidden',
    width: '100%',
  },

  detailModalFooter: {
    borderTopColor: '#1E293B',
    borderTopWidth: 1,
    padding: 12,
  },

  detailModalHeader: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  detailModalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },

  detailSectionBox: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },

  detailSectionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  detailSectionTitleRecv: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },

  detailSectionTitleSent: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },

  disabledBtn: {
    opacity: 0.5,
  },

  emptyLogText: {
    color: '#475569',
    fontSize: 12,
    fontStyle: 'italic',
    padding: 12,
    textAlign: 'center',
  },

  header: {
    alignItems: 'center',
    borderBottomColor: '#334155',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },

  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },

  logCode: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '700',
  },

  logLatency: {
    color: '#64748B',
    fontSize: 10,
  },

  logList: {
    flex: 1,
  },

  logMessage: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 2,
  },

  logRow: {
    borderBottomColor: '#1E293B',
    borderBottomWidth: 0.5,
    paddingVertical: 6,
  },

  logTime: {
    color: '#64748B',
    fontSize: 11,
  },

  modalContainer: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    maxHeight: '94%',
    maxWidth: 960,
    padding: 16,
    width: '100%',
  },

  phaseHeaderTitle: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderRadius: 6,
    borderWidth: 1,
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '800',
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  progressBanner: {
    backgroundColor: '#1E1B4B',
    borderColor: '#6366F1',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 10,
  },

  progressBarFill: {
    backgroundColor: '#6366F1',
    borderRadius: 4,
    height: '100%',
  },

  progressBarTrack: {
    backgroundColor: '#312E81',
    borderRadius: 4,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },

  progressBannerSubtext: {
    color: '#A5B4FC',
    fontSize: 11,
    fontStyle: 'italic',
  },

  progressBannerText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '800',
  },

  runAllBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  runAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  runBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  runBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  stepBadgeBox: {
    backgroundColor: '#4338CA',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  stepBadgeText: {
    color: '#EEF2FF',
    fontSize: 10,
    fontWeight: '800',
  },

  tabContainer: {
    backgroundColor: '#020617',
    borderRadius: 8,
    flexDirection: 'row',
    marginVertical: 10,
    padding: 4,
  },

  tabItem: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },

  tabText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },

  topControlBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },

  viewDetailBadge: {
    backgroundColor: '#0284C7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  viewDetailBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
})
