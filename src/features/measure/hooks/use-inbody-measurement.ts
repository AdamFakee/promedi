import { InBodyClient, inbodySessionMachine, type PatientInfo } from '@/core/hardware/inbody'
import { bindingStore } from '@/core/hardware/resolver'
import { createTransport } from '@/core/hardware/transport/transport-factory'
import { useHealthSession } from '@/core/health-session'
import { voicePlayerService } from '@/core/voice-engine'
import { useAppNavigation } from '@/shared/hooks'
import { toast } from '@/shared/store'
import { useMachine } from '@xstate/react'
import { useEffect, useMemo } from 'react'

export function useInBodyMeasurement(isActive: boolean) {
  const { context, completeInBody, resetSession } = useHealthSession()
  const { replaceTo } = useAppNavigation()

  // Khởi tạo InBodyClient với USB Serial transport (InBody 260S kết nối qua USB Serial 19200 baud)
  const client = useMemo(() => {
    const transport = createTransport('usb-serial')
    return new InBodyClient(transport)
  }, [])

  const [state, send] = useMachine(
    inbodySessionMachine.provide({
      actions: {
        onMeasuringStart: () => {
          // 1. Khi máy bắt đầu quét cơ thể -> Ngắt ngay voice hướng dẫn
          voicePlayerService.stop()
        },
        onMeasurementCompleted: ({ context: machineCtx }) => {
          voicePlayerService.speak('INBODY_COMPLETE')
          // Đợi 3 giây trước khi tự động nhảy sang màn hình tổng hợp
          setTimeout(() => {
            if (machineCtx.result) {
              completeInBody(machineCtx.result)
            }
          }, 3000)
        },
        onDeviceError: () => {
          // Báo lỗi sai tư thế / điện cực
          voicePlayerService.speak('INBODY_CONTACT_ERROR')
        },
        onConnectionError: ({ context: machineCtx }) => {
          resetSession()
          // 3. Nếu kết nối thất bại -> Đá qua màn hình lỗi
          replaceTo('KIOSK_HARDWARE_ERROR', {
            error: 'Lỗi kết nối máy InBody: ' + (machineCtx.lastErrorCode || 'UNKNOWN_ERROR'),
            device: 'inbody',
          })
        },
      },
    }),
    {
      input: {
        client,
        getDeviceKey: async () => {
          const bindings = await bindingStore.getAll()
          return bindings.find((b) => b.role === 'inbody')?.deviceKey
        },
        baudRate: 19200,
      },
    },
  )

  // 1. Quản lý lifecycle kết nối TCP
  useEffect(() => {
    if (!isActive) return

    // Tự động Connect khi Mount
    send({ type: 'CONNECT' })

    return () => {
      send({ type: 'DISCONNECT' })
    }
  }, [isActive, send])

  // 2. Chờ kết nối xong (ready) -> Tự động bắn START kèm PatientInfo
  useEffect(() => {
    if (isActive && state.matches('ready')) {
      const customer = context.customer
      if (!customer) {
        toast.error('Không tìm thấy thông tin khách hàng')
        return
      }

      const patientInfo: PatientInfo = {
        id: customer.identityCode || '000000000000',
        age: customer.age,
        heightCm: customer.heightCm,
        gender: customer.gender,
      }

      send({ type: 'START', patientInfo })
    }
  }, [isActive, state, context.customer, send])

  const handleReset = () => {
    send({ type: 'RESET' })
  }

  // Map state sang UI status
  let status: 'idle' | 'measuring' | 'error' | 'completed' = 'idle'
  if (
    state.matches('measuring') ||
    state.matches('fetchingResult') ||
    state.matches('verifyingCompletion')
  )
    status = 'measuring'
  if (state.matches('deviceError') || state.matches('transportTimeout')) status = 'error'
  if (state.matches('completed')) status = 'completed'

  return {
    status,
    progress: state.context.progress,
    errorCode: state.context.lastErrorCode,
    handleReset,
  }
}
