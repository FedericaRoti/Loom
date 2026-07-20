import { useRef, useState } from 'react'
import { transcribeAudio, voiceRuntime } from '../services/loomApi.js'

const initialState = {
  error: '',
  isRecording: false,
  isTranscribing: false,
  lastTranscript: '',
}

function getSupportedMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
}

export function useVoiceRecorder({ onTranscript }) {
  const [state, setState] = useState(initialState)
  const chunksRef = useRef([])
  const isCancelledRef = useRef(false)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startRecording = async () => {
    setState((value) => ({ ...value, error: '', lastTranscript: '' }))

    if (voiceRuntime.mode !== 'real') {
      const text = 'Mock voice input: can you explain this another way?'
      onTranscript(text)
      setState((value) => ({ ...value, lastTranscript: text }))
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState((value) => ({
        ...value,
        error: 'Recording is not supported in this browser.',
      }))
      return
    }

    try {
      isCancelledRef.current = false
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      chunksRef.current = []
      streamRef.current = stream
      recorderRef.current = recorder

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      })

      recorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        cleanupStream()

        if (isCancelledRef.current) {
          setState(initialState)
          return
        }

        setState((value) => ({ ...value, isRecording: false, isTranscribing: true }))

        try {
          const result = await transcribeAudio(audioBlob)
          const text = result.text?.trim()

          if (text) {
            onTranscript(text)
            setState((value) => ({ ...value, lastTranscript: text }))
          }
        } catch (error) {
          setState((value) => ({
            ...value,
            error: error instanceof Error ? error.message : 'Unable to transcribe audio.',
          }))
        } finally {
          setState((value) => ({ ...value, isTranscribing: false }))
        }
      })

      recorder.start()
      setState((value) => ({ ...value, isRecording: true }))
    } catch (error) {
      cleanupStream()
      setState((value) => ({
        ...value,
        error: error instanceof Error ? error.message : 'Unable to access microphone.',
        isRecording: false,
      }))
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  return {
    ...state,
    reset: () => {
      isCancelledRef.current = true
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      else cleanupStream()
      setState(initialState)
    },
    startRecording,
    stopRecording,
  }
}
