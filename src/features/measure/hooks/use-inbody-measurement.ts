import { InBodyClient, inbodySessionMachine, type PatientInfo } from '@/core/hardware/inbody'
import { createTransport } from '@/core/hardware/transport/transport-factory'
import { useHealthSession } from '@/core/health-session'
import { voicePlayerService } from '@/core/voice-engine'
import { useAppNavigation } from '@/shared/hooks'
import { toast } from '@/shared/store'
import { useMachine } from '@xstate/react'
import { useEffect, useMemo } from 'react'

export function useInBodyMeasurement(isActive: boolean) {
  const { context, completeInBody } = useHealthSession()
  const { replaceTo } = useAppNavigation()

  // Khởi tạo InBodyClient và machine đồng bộ
  const client = useMemo(() => {
    const transport = createTransport('tcp')
    return new InBodyClient(transport)
  }, [])

  const config = useMemo(() => ({ host: '192.168.1.50', port: 2004 }), [])

  const [state, send] = useMachine(
    inbodySessionMachine.provide({
      actions: {
        onMeasuringStart: () => {
          // 1. Khi máy bắt đầu quét cơ thể -> Ngắt ngay voice hướng dẫn
          voicePlayerService.stop()
        },
        onMeasurementCompleted: ({ context: machineCtx }) => {
          voicePlayerService.speak('INBODY_COMPLETE')
          // 2. Khi đo xong -> Ghi nhận kết quả
          if (machineCtx.result) {
            completeInBody(machineCtx.result)
          }
        },
        onDeviceError: () => {
          // Báo lỗi sai tư thế / điện cực
          voicePlayerService.speak('INBODY_CONTACT_ERROR')
        },
        onConnectionError: ({ context: machineCtx }) => {
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
        config,
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
