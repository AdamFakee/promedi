import * as Speech from 'expo-speech'
import { VOICE_PROMPTS, VoicePromptKey } from './voice-prompts.const'
import { formatHeightToSpeechText } from './utils/height-voice-formatter.util'

class VoicePlayerService {
  private currentPromptKey: VoicePromptKey | null = null
  private lastSpeakTime = 0

  /**
   * Immediately stops any active speech and speaks the specified voice prompt key.
   */
  public async speak(
    key: VoicePromptKey,
    options?: { force?: boolean; minIntervalMs?: number },
  ): Promise<void> {
    try {
      const now = Date.now()
      const minInterval = options?.minIntervalMs ?? 2000

      if (this.currentPromptKey === key && !options?.force) {
        return
      }

      if (now - this.lastSpeakTime < minInterval && !options?.force) {
        return
      }

      // 1. Cancel previous audio before playing new prompt to avoid overlapping voice matrix
      await this.stop()

      const text = VOICE_PROMPTS[key]
      if (!text) return

      this.currentPromptKey = key
      this.lastSpeakTime = now

      Speech.speak(text, {
        language: 'vi-VN',
        pitch: 1.0,
        rate: 0.95,
        onDone: () => {
          if (this.currentPromptKey === key) {
            this.currentPromptKey = null
          }
        },
        onError: (error) => {
          console.warn('[VoicePlayerService] Speech error:', error)
          if (this.currentPromptKey === key) {
            this.currentPromptKey = null
          }
        },
      })
    } catch (err) {
      console.warn('[VoicePlayerService] Failed to execute speak:', err)
    }
  }

  /**
   * Immediately stops speech output.
   */
  public async stop(): Promise<void> {
    try {
      const isSpeaking = await Speech.isSpeakingAsync()
      if (isSpeaking) {
        await Speech.stop()
      }
      this.currentPromptKey = null
    } catch (err) {
      console.warn('[VoicePlayerService] Failed to stop speech:', err)
    }
  }

  /**
   * Speak arbitrary text string (e.g. dynamic alert messages)
   */
  public async speakText(text: string): Promise<void> {
    try {
      await this.stop()
      Speech.speak(text, {
        language: 'vi-VN',
        pitch: 1.0,
        rate: 0.95,
      })
    } catch (err) {
      console.warn('[VoicePlayerService] Failed to speak text:', err)
    }
  }

  /**
   * Phát âm thông báo kết quả chiều cao chi tiết bằng tiếng Việt chuẩn
   * (Ví dụ: "Đã đo xong chiều cao. Chiều cao của quý khách là một trăm bảy mươi xăng ti mét.")
   *
   * @param heightCm Chiều cao tính bằng centimet
   */
  public async speakHeightResult(heightCm: number): Promise<void> {
    const text = formatHeightToSpeechText(heightCm)
    await this.speakText(text)
  }
}

export const voicePlayerService = new VoicePlayerService()
