/**
 * useVoiceProcessor — Core voice chat processing hook.
 *
 * Handles the complete audio pipeline:
 *   Record → STT → Chat AI → TTS → Playback
 *
 * Pattern copied from the PROVEN RoundTripPlayground.tsx
 * (which works end-to-end) and adapted for continuous chat.
 */
import { useCallback, useRef, useState } from 'react'
import { voiceApi } from '@/lib/api/voice'

export type ProcessingStep = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

export interface VoiceMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

interface UseVoiceProcessorOptions {
  voice?: string
  notebookId?: string
  onMessage?: (message: VoiceMessage) => void
  onError?: (error: string) => void
}

export function useVoiceProcessor(options: UseVoiceProcessorOptions = {}) {
  const { voice = 'af_heart', notebookId, onMessage, onError } = options

  const [step, setStep] = useState<ProcessingStep>('idle')
  const [isRecording, setIsRecording] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  /**
   * Start recording from the user's microphone.
   * Uses the same MediaRecorder pattern as RoundTripPlayground.
   */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        // Stop mic tracks to release hardware
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        // Process the recorded audio
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size > 0) {
          processRecording(blob)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setStep('recording')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied'
      onError?.(msg)
    }
  }, [onError])

  /**
   * Stop recording. Triggers the processing pipeline via onstop handler.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  /**
   * Process a recorded audio blob through the full pipeline:
   *   STT → Chat → TTS → Play
   *
   * This is the function that was COMPLETELY MISSING from VoiceChatPanel.
   */
  const processRecording = useCallback(
    async (audioBlob: Blob) => {
      try {
        // Step 1: Transcribe speech to text
        setStep('transcribing')
        const { text } = await voiceApi.transcribe(audioBlob, {})

        if (!text.trim()) {
          setStep('idle')
          onError?.('No speech detected. Try again.')
          return
        }

        // Add user message to transcript
        const userMessage: VoiceMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          text: text.trim(),
          timestamp: new Date(),
        }
        onMessage?.(userMessage)

        // Step 2: Get AI response
        setStep('thinking')
        const { answer } = await voiceApi.chat(text.trim(), notebookId, voice)

        // Add AI message to transcript
        const aiMessage: VoiceMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: answer,
          timestamp: new Date(),
        }
        onMessage?.(aiMessage)

        // Step 3: Synthesize and play response audio
        setStep('speaking')
        const audioResponse = await voiceApi.synthesize(answer, { voice })
        const url = URL.createObjectURL(audioResponse)
        const audio = new Audio(url)

        audio.onended = () => {
          URL.revokeObjectURL(url)
          setStep('idle')
        }

        audio.onerror = () => {
          URL.revokeObjectURL(url)
          setStep('idle')
        }

        await audio.play()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Voice processing failed'
        onError?.(msg)
        setStep('idle')
      }
    },
    [voice, notebookId, onMessage, onError]
  )

  return {
    step,
    isRecording,
    startRecording,
    stopRecording,
    processRecording,
  }
}
