import { assign, setup } from 'xstate'
import type { HealthSessionContext, HealthSessionEvent } from '../types'

const DEFAULT_CONTEXT: HealthSessionContext = {
  sessionId: null,
  customer: null,
  selectedServices: ['ALL'],
  bpResults: null,
  inBodyResults: null,
  secondsRemaining: 60,
  error: null,
}

export const healthSessionMachine = setup({
  types: {
    context: {} as HealthSessionContext,
    events: {} as HealthSessionEvent,
  },
  actions: {
    resetContext: assign(() => ({
      sessionId: null,
      customer: null,
      selectedServices: ['ALL'] as HealthSessionContext['selectedServices'],
      bpResults: null,
      inBodyResults: null,
      secondsRemaining: 60,
      error: null,
    })),
    setCustomer: assign(({ event }) => {
      if (event.type !== 'SUBMIT_IDENTIFICATION') return {}
      return {
        sessionId: event.payload.sessionId ?? null,
        customer: {
          fullName: event.payload.fullName,
          identityCode: event.payload.identityCode,
          age: event.payload.age,
          heightCm: event.payload.heightCm,
          gender: event.payload.gender,
        },
        bpResults: null,
        inBodyResults: null,
        secondsRemaining: 60,
        error: null,
      }
    }),
    setServices: assign(({ event }) => {
      if (event.type !== 'SELECT_SERVICES') return {}
      return {
        selectedServices: event.payload,
      }
    }),
    saveBpResults: assign(({ event }) => {
      if (event.type !== 'BP_COMPLETED') return {}
      return {
        bpResults: event.payload,
      }
    }),
    saveInBodyResults: assign(({ event }) => {
      if (event.type !== 'INBODY_COMPLETED') return {}
      return {
        inBodyResults: event.payload,
      }
    }),
    resetTimeout: assign(() => ({ secondsRemaining: 60 })),
    decrementTimeout: assign(({ context }) => ({
      secondsRemaining: Math.max(0, context.secondsRemaining - 1),
    })),
  },
}).createMachine({
  id: 'healthSession',
  initial: 'idle',
  context: DEFAULT_CONTEXT,
  on: {
    RESET_SESSION: {
      target: '.idle',
      actions: 'resetContext',
    },
    START_SESSION: {
      target: '.identification',
      actions: 'resetContext',
    },
    SUBMIT_IDENTIFICATION: {
      target: '.measureBp',
      actions: 'setCustomer',
    },
  },
  states: {
    idle: {
      entry: 'resetContext',
      on: {
        START_SESSION: {
          target: 'identification',
          actions: 'resetContext',
        },
        SUBMIT_IDENTIFICATION: {
          target: 'measureBp',
          actions: 'setCustomer',
        },
      },
    },
    identification: {
      on: {
        SUBMIT_IDENTIFICATION: {
          target: 'measureBp',
          actions: 'setCustomer',
        },
        RESET_SESSION: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    measureBp: {
      on: {
        BP_COMPLETED: {
          target: 'measureInBody',
          actions: 'saveBpResults',
        },
        SKIP_CURRENT_MEASUREMENT: {
          target: 'measureInBody',
        },
        RESET_SESSION: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    measureInBody: {
      on: {
        INBODY_COMPLETED: {
          target: 'summary',
          actions: 'saveInBodyResults',
        },
        SKIP_CURRENT_MEASUREMENT: {
          target: 'summary',
        },
        RESET_SESSION: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
    summary: {
      entry: 'resetTimeout',
      on: {
        TOUCH_INTERACTION: {
          actions: 'resetTimeout',
        },
        TICK_TIMEOUT: [
          {
            guard: ({ context }) => context.secondsRemaining <= 1,
            target: 'idle',
            actions: 'resetContext',
          },
          {
            actions: 'decrementTimeout',
          },
        ],
        RESET_SESSION: {
          target: 'idle',
          actions: 'resetContext',
        },
      },
    },
  },
})
