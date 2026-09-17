import { createActor } from 'xstate'
import { useCallback, useEffect, useState } from 'react'
import { healthSessionMachine } from '../machines'
import type { CustomerData, BpData, InBodyData, ServiceType } from '../types'

const globalHealthSessionActor = createActor(healthSessionMachine)
globalHealthSessionActor.start()

export function useHealthSession() {
  const [snapshot, setSnapshot] = useState(() => globalHealthSessionActor.getSnapshot())

  useEffect(() => {
    const subscription = globalHealthSessionActor.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const startSession = useCallback(() => {
    globalHealthSessionActor.send({ type: 'START_SESSION' })
  }, [])

  const submitIdentification = useCallback((customer: CustomerData) => {
    globalHealthSessionActor.send({ type: 'SUBMIT_IDENTIFICATION', payload: customer })
  }, [])

  const selectServices = useCallback((services: ServiceType[]) => {
    globalHealthSessionActor.send({ type: 'SELECT_SERVICES', payload: services })
  }, [])

  const completeBp = useCallback((bpData: BpData) => {
    globalHealthSessionActor.send({ type: 'BP_COMPLETED', payload: bpData })
  }, [])

  const completeInBody = useCallback((inBodyData: InBodyData) => {
    globalHealthSessionActor.send({ type: 'INBODY_COMPLETED', payload: inBodyData })
  }, [])

  const skipMeasurement = useCallback(() => {
    globalHealthSessionActor.send({ type: 'SKIP_CURRENT_MEASUREMENT' })
  }, [])

  const resetSession = useCallback(() => {
    globalHealthSessionActor.send({ type: 'RESET_SESSION' })
  }, [])

  const touchInteraction = useCallback(() => {
    globalHealthSessionActor.send({ type: 'TOUCH_INTERACTION' })
  }, [])

  return {
    state: snapshot.value,
    context: snapshot.context,
    startSession,
    submitIdentification,
    selectServices,
    completeBp,
    completeInBody,
    skipMeasurement,
    resetSession,
    touchInteraction,
  }
}
