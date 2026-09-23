/**
 * Custom Hook React Native kết nối UI với InBody Session Machine XState v5.
 * @module src/core/hardware/inbody/hooks/use-inbody-session.ts
 */

import { useActorRef, useSelector } from '@xstate/react'
import { useMemo } from 'react'
import { InBodyClient } from '../client/inbody-client'
import { inbodySessionMachine } from '../machine/inbody-session.machine'
import { TcpTransport } from '../transport/tcp-transport'
import type { TransportConfig } from '../transport/transport.interface'
import type { PatientInfo } from '../types/inbody.types'

export interface UseInBodySessionOptions {
  /** Cấu hình IP và Port của máy InBody 260S */
  config?: TransportConfig
}

export function useInBodySession(options?: UseInBodySessionOptions) {
  const config = useMemo<TransportConfig>(
    () => options?.config ?? { host: '192.168.1.50', port: 2004 },
    [options?.config],
  )

  const client = useMemo(() => new InBodyClient(new TcpTransport()), [])

  const actorRef = useActorRef(inbodySessionMachine, {
    input: { client, config },
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
