import { useEffect, useRef } from 'react'
import { voicePlayerService } from './voice-player.service'
import { VoicePromptKey } from './voice-prompts.const'

export interface UseVoiceGuidanceOptions {
  currentStep?: number
  enabled?: boolean
}

export const useVoiceGuidance = (options: UseVoiceGuidanceOptions = {}) => {
  const { currentStep, enabled = true } = options
  const prevStepRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!enabled || currentStep === undefined) return

    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep

      switch (currentStep) {
        case 0: // Màn 4a: Đo Huyết Áp
          voicePlayerService.speak('BP_START')
          break
        case 1: // Màn 5a: Đo InBody
          voicePlayerService.speak('INBODY_START')
          break
        case 2: // Màn 6a: Kết Quả
          voicePlayerService.speak('SUMMARY_START')
          break
        default:
          break
      }
    }
  }, [currentStep, enabled])

  const speakPrompt = (key: VoicePromptKey, force = false) => {
    voicePlayerService.speak(key, { force })
  }

  const speakHeightResult = (heightCm: number) => {
    voicePlayerService.speakHeightResult(heightCm)
  }

  const stopVoice = () => {
    voicePlayerService.stop()
  }

  return {
    speakPrompt,
    speakHeightResult,
    stopVoice,
    voicePlayerService,
  }
}
