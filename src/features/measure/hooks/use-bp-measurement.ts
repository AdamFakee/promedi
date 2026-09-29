import { BpbioClient, bpbioSessionMachine } from '@/core/hardware/bpbio'
import { bindingStore } from '@/core/hardware/resolver'
import { createTransport } from '@/core/hardware/transport/transport-factory'
import { useHealthSession } from '@/core/health-session'
import { voicePlayerService } from '@/core/voice-engine'
import { useAppNavigation } from '@/shared/hooks'
import { useMachine } from '@xstate/react'
import { useEffect, useMemo } from 'react'

export function useBpMeasurement(isActive: boolean) {
  const { completeBp, resetSession } = useHealthSession()
  const { replaceTo } = useAppNavigation()

  // Khởi tạo BpbioClient và machine đồng bộ (synchronously)
  const client = useMemo(() => {
    const transport = createTransport('usb-serial')
    return new BpbioClient(transport)
  }, [])

  const [state, send] = useMachine(
    bpbioSessionMachine.provide({
      actions: {
        onMeasuringStart: () => {
          // 1. Khi máy bắt đầu đo -> Ngắt ngay voice hướng dẫn nếu đang phát
          voicePlayerService.stop()
        },
        onMeasurementCompleted: ({ context }) => {
          voicePlayerService.speak('BP_COMPLETE')
          // Đợi 3 giây để khách hàng kịp nhìn thấy màn hình "Đo hoàn tất" rồi mới tự động nhảy bước
          setTimeout(() => {
            if (context.result) {
              completeBp({
                systolic: context.result.systolic!,
                diastolic: context.result.diastolic!,
                pulse: context.result.pulse!,
              })
            }
          }, 3000)
        },
        onErrorAlert: ({ event }) => {
          // Nếu thiết bị báo lỗi nhúc nhích tay / rụt cùi chỏ
          if (event.type === 'BP_EVENT' && event.payload.type === 'DEVICE_ERROR') {
            voicePlayerService.speak('BP_ELBOW_OFF')
          }
        },
        onConnectionError: ({ context }) => {
          resetSession()
          // 3. Nếu kết nối thất bại -> Đá qua màn hình lỗi
          const errMsg = context.errorMessage || 'Lỗi kết nối máy huyết áp không rõ nguyên nhân.'
          replaceTo('KIOSK_HARDWARE_ERROR', {
            error: errMsg,
            device: 'bpbio',
          })
        },
      },
    }),
    {
      input: {
        client,
        getDeviceKey: async () => {
          const bindings = await bindingStore.getAll()
          return bindings.find((b) => b.role === 'bpbio')?.deviceKey
        },
      },
    },
  )

  // Quản lý lifecycle kết nối Serial dựa theo prop isActive
  useEffect(() => {
    if (!isActive) return

    send({ type: 'START' })

    return () => {
      send({ type: 'DISCONNECT' })
      client.disconnect().catch(() => {})
    }
  }, [isActive, client, send])

  const handleReset = () => {
    send({ type: 'RESET' })
  }

  let status: 'idle' | 'measuring' | 'error' | 'completed' = 'idle'
  if (state.matches({ active: 'measuring' })) status = 'measuring'
  if (state.matches({ active: 'error' })) status = 'error'
  if (state.matches({ active: 'completed' })) status = 'completed'

  return {
    status,
    handleReset,
  }
}
