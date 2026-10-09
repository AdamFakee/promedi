/**
 * Custom Hook React Native kết nối UI với InBody Session Machine XState v5.
 * @module src/core/hardware/inbody/hooks/use-inbody-session.ts
 */

import { useActorRef, useSelector } from '@xstate/react'
import { useMemo } from 'react'
import { InBodyClient } from '../client/inbody-client'
import { inbodySessionMachine } from '../machine/inbody-session.machine'
import { UsbSerialTransport } from '../transport'
import { ToFDistanceDevice } from '../../tof'
import type { PatientInfo } from '../types/inbody.types'

export interface UseInBodySessionOptions {
  /** Thể hiện thiết bị ToF đo chiều cao */
  tofDevice?: ToFDistanceDevice
  /** Hàm resolve deviceKey từ BindingStore */
  getDeviceKey?: () => Promise<string | undefined>
  /** Baudrate kết nối USB Serial (mặc định 19200) */
  baudRate?: number
}

export function useInBodySession(options?: UseInBodySessionOptions) {
  const client = useMemo(() => new InBodyClient(new UsbSerialTransport()), [])
  const tofDevice = useMemo(
    () => options?.tofDevice ?? new ToFDistanceDevice(),
    [options?.tofDevice],
  )

  const actorRef = useActorRef(inbodySessionMachine, {
    input: {
      client,
      tofDevice,
      getDeviceKey: options?.getDeviceKey ?? (async () => undefined),
      baudRate: options?.baudRate ?? 19200,
    },
  })

  const stateValue = useSelector(actorRef, (snapshot) => snapshot.value)
  const context = useSelector(actorRef, (snapshot) => snapshot.context)

  const connect = () => actorRef.send({ type: 'CONNECT' })
  const start = (patientInfo: PatientInfo) => actorRef.send({ type: 'START', patientInfo })
  const reset = () => actorRef.send({ type: 'RESET' })
  const disconnect = () => actorRef.send({ type: 'DISCONNECT' })

  return {
    state: stateValue,
    progress: context.progress,
    result: context.result,
    lastErrorCode: context.lastErrorCode,
    patientInfo: context.patientInfo,
    isConnected: client.isConnected(),
    connect,
    start,
    reset,
    disconnect,
  }
}
