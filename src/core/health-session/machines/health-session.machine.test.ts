import { createActor } from 'xstate'
import { healthSessionMachine } from './health-session.machine'

describe('healthSessionMachine', () => {
  it('should start in idle state with default context', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('idle')
    expect(snapshot.context.sessionId).toBeNull()
    expect(snapshot.context.customer).toBeNull()
    expect(snapshot.context.selectedServices).toEqual(['ALL'])
    expect(snapshot.context.bpResults).toBeNull()
    expect(snapshot.context.inBodyResults).toBeNull()
    expect(snapshot.context.secondsRemaining).toBe(60)
  })

  it('should transition from idle to identification on START_SESSION', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({ type: 'START_SESSION' })
    expect(actor.getSnapshot().value).toBe('identification')
  })

  it('should transition from identification to serviceSelection on SUBMIT_IDENTIFICATION', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({ type: 'START_SESSION' })
    const customer = {
      fullName: 'Nguyễn Văn A',
      identityCode: '012345678901',
      sessionId: 'server_rec_8892',
      age: 30,
      heightCm: 170,
      gender: 'M' as const,
    }
    actor.send({ type: 'SUBMIT_IDENTIFICATION', payload: customer })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('serviceSelection')
    expect(snapshot.context.customer).toEqual({
      fullName: 'Nguyễn Văn A',
      identityCode: '012345678901',
      age: 30,
      heightCm: 170,
      gender: 'M',
    })
    expect(snapshot.context.sessionId).toBe('server_rec_8892')
  })

  it('should transition from serviceSelection to measureBp on SELECT_SERVICES', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({ type: 'START_SESSION' })
    actor.send({
      type: 'SUBMIT_IDENTIFICATION',
      payload: {
        fullName: 'Nguyễn Văn A',
        identityCode: '012345678901',
        age: 30,
        heightCm: 170,
        gender: 'M',
      },
    })
    actor.send({ type: 'SELECT_SERVICES', payload: ['BP', 'INBODY'] })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('measureBp')
    expect(snapshot.context.selectedServices).toEqual(['BP', 'INBODY'])
  })

  it('should transition from measureBp to measureInBody on BP_COMPLETED', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({ type: 'START_SESSION' })
    actor.send({
      type: 'SUBMIT_IDENTIFICATION',
      payload: {
        fullName: 'Nguyễn Văn A',
        identityCode: '012345678901',
        age: 30,
        heightCm: 170,
        gender: 'M',
      },
    })
    actor.send({ type: 'SELECT_SERVICES', payload: ['BP', 'INBODY'] })

    const bpData = { systolic: 120, diastolic: 80, pulse: 72 }
    actor.send({ type: 'BP_COMPLETED', payload: bpData })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('measureInBody')
    expect(snapshot.context.bpResults).toEqual(bpData)
  })

  it('should transition from measureInBody to summary on INBODY_COMPLETED', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({ type: 'START_SESSION' })
    actor.send({
      type: 'SUBMIT_IDENTIFICATION',
      payload: {
        fullName: 'Nguyễn Văn A',
        identityCode: '012345678901',
        age: 30,
        heightCm: 170,
        gender: 'M',
      },
    })
    actor.send({ type: 'SELECT_SERVICES', payload: ['BP', 'INBODY'] })
    actor.send({ type: 'BP_COMPLETED', payload: { systolic: 120, diastolic: 80, pulse: 72 } })

    const inBodyData = {
      weight: 70,
      smm: 35,
      pbf: 18,
      inBodyScore: 85,
      bmi: 22,
      vfl: 5,
      tbw: 40,
      segmental: {
        ffmRightArm: 3,
        ffmLeftArm: 3,
        ffmTrunk: 25,
        ffmRightLeg: 9,
        ffmLeftLeg: 9,
        bfmRightArm: 1,
        bfmLeftArm: 1,
        bfmTrunk: 5,
        bfmRightLeg: 2,
        bfmLeftLeg: 2,
      },
    } as any
    actor.send({ type: 'INBODY_COMPLETED', payload: inBodyData })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('summary')
    expect(snapshot.context.inBodyResults).toEqual(inBodyData)
    expect(snapshot.context.secondsRemaining).toBe(60)
  })

  it('should handle timeout ticking and touch interaction reset in summary state', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({
      type: 'SUBMIT_IDENTIFICATION',
      payload: {
        fullName: 'Nguyễn Văn A',
        identityCode: '012345678901',
        age: 30,
        heightCm: 170,
        gender: 'M',
      },
    })
    actor.send({ type: 'SELECT_SERVICES', payload: ['ALL'] })
    actor.send({ type: 'BP_COMPLETED', payload: { systolic: 120, diastolic: 80, pulse: 72 } })
    actor.send({
      type: 'INBODY_COMPLETED',
      payload: {
        weight: 70,
        smm: 35,
        pbf: 18,
        inBodyScore: 85,
        bmi: 22,
        vfl: 5,
        tbw: 40,
        segmental: {
          ffmRightArm: 3,
          ffmLeftArm: 3,
          ffmTrunk: 25,
          ffmRightLeg: 9,
          ffmLeftLeg: 9,
          bfmRightArm: 1,
          bfmLeftArm: 1,
          bfmTrunk: 5,
          bfmRightLeg: 2,
          bfmLeftLeg: 2,
        },
      } as any,
    })

    expect(actor.getSnapshot().value).toBe('summary')

    // Tick timeout
    actor.send({ type: 'TICK_TIMEOUT' })
    expect(actor.getSnapshot().context.secondsRemaining).toBe(59)

    // Touch interaction resets countdown
    actor.send({ type: 'TOUCH_INTERACTION' })
    expect(actor.getSnapshot().context.secondsRemaining).toBe(60)
  })

  it('should auto-reset session to idle when privacy timeout expires', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({
      type: 'SUBMIT_IDENTIFICATION',
      payload: {
        fullName: 'Nguyễn Văn A',
        identityCode: '012345678901',
        age: 30,
        heightCm: 170,
        gender: 'M',
      },
    })
    actor.send({ type: 'SELECT_SERVICES', payload: ['ALL'] })
    actor.send({ type: 'BP_COMPLETED', payload: { systolic: 120, diastolic: 80, pulse: 72 } })
    actor.send({
      type: 'INBODY_COMPLETED',
      payload: {
        weight: 70,
        smm: 35,
        pbf: 18,
        inBodyScore: 85,
        bmi: 22,
        vfl: 5,
        tbw: 40,
        segmental: {
          ffmRightArm: 3,
          ffmLeftArm: 3,
          ffmTrunk: 25,
          ffmRightLeg: 9,
          ffmLeftLeg: 9,
          bfmRightArm: 1,
          bfmLeftArm: 1,
          bfmTrunk: 5,
          bfmRightLeg: 2,
          bfmLeftLeg: 2,
        },
      } as any,
    })

    // Simulate ticking down to 1s
    for (let i = 0; i < 59; i++) {
      actor.send({ type: 'TICK_TIMEOUT' })
    }
    expect(actor.getSnapshot().context.secondsRemaining).toBe(1)

    // Last tick expires session -> reset to idle
    actor.send({ type: 'TICK_TIMEOUT' })
    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('idle')
    expect(snapshot.context.customer).toBeNull()
    expect(snapshot.context.bpResults).toBeNull()
    expect(snapshot.context.inBodyResults).toBeNull()
  })

  it('should reset session from any state on RESET_SESSION', () => {
    const actor = createActor(healthSessionMachine)
    actor.start()

    actor.send({
      type: 'SUBMIT_IDENTIFICATION',
      payload: {
        fullName: 'Nguyễn Văn A',
        identityCode: '012345678901',
        age: 30,
        heightCm: 170,
        gender: 'M',
      },
    })
    expect(actor.getSnapshot().value).toBe('serviceSelection')

    actor.send({ type: 'RESET_SESSION' })
    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('idle')
    expect(snapshot.context.customer).toBeNull()
  })
})
