import { BpbioClient, bpbioSessionMachine } from '@/core/hardware/bpbio'
import { bindingStore } from '@/core/hardware/resolver'
import { createTransport } from '@/core/hardware/transport/transport-factory'
import { useHealthSession } from '@/core/health-session'
import { voicePlayerService } from '@/core/voice-engine'
import { useAppNavigation } from '@/shared/hooks'
import { useMachine } from '@xstate/react'
import { useEffect, useMemo, useState } from 'react'

/** Cờ bật chế độ Mock Auto-Complete đo Huyết áp (không cần cắm máy BPBIO thật) */
const MOCK_BP_AUTO_COMPLETE = false

export function useBpMeasurement(isActive: boolean) {
  const { completeBp, resetSession } = useHealthSession()
  const { replaceTo } = useAppNavigation()
  const [mockStatus, setMockStatus] = useState<'idle' | 'measuring' | 'completed'>('idle')

  // Khởi tạo BpbioClient và machine đồng bộ (synchronously)
  const client = useMemo(() => {
    const transport = createTransport('usb-serial')
    return new BpbioClient(transport)
  }, [])

  const [state, send] = useMachine(
    bpbioSessionMachine.provide({
      actions: {
        onMeasuringStart: () => {
          voicePlayerService.speak('BP_MEASURING')
        },
        onMeasurementCompleted: ({ context }) => {
          voicePlayerService.speak('BP_COMPLETE')
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
        onErrorAlert: () => {
          voicePlayerService.speak('BP_ERROR')
        },
        onConnectionError: ({ context }) => {
          if (MOCK_BP_AUTO_COMPLETE) return
          resetSession()
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

  // Xử lý luồng Mock Auto-Complete khi không cắm máy thật
  useEffect(() => {
    if (!isActive || !MOCK_BP_AUTO_COMPLETE) return

    setMockStatus('measuring')

    const timer1 = setTimeout(() => {
      setMockStatus('completed')
      voicePlayerService.speak('BP_COMPLETE')
    }, 1500)

    const timer2 = setTimeout(() => {
      completeBp({
        systolic: 120,
        diastolic: 80,
        pulse: 72,
      })
    }, 3500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [isActive, completeBp])

  // Quản lý lifecycle kết nối Serial thật khi tắt Mock
  useEffect(() => {
    if (!isActive || MOCK_BP_AUTO_COMPLETE) return

    send({ type: 'START' })

    return () => {
      send({ type: 'DISCONNECT' })
      client.disconnect().catch(() => {})
    }
  }, [isActive, client, send])

  const handleReset = () => {
    if (MOCK_BP_AUTO_COMPLETE) {
      setMockStatus('idle')
    } else {
      send({ type: 'RESET' })
    }
  }

  let status: 'idle' | 'measuring' | 'error' | 'completed' = 'idle'
  if (MOCK_BP_AUTO_COMPLETE) {
    status = mockStatus
  } else {
    if (state.matches({ active: 'measuring' })) status = 'measuring'
    if (state.matches({ active: 'error' })) status = 'error'
    if (state.matches({ active: 'completed' })) status = 'completed'
  }

  return {
    status,
    handleReset,
  }
}
