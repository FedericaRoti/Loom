import { useEffect, useRef, useState } from 'react'
import { synthesizeSpeech, voiceRuntime } from '../services/loomApi.js'

const initialState = {
  error: '',
  isLoading: false,
  isPlaying: false,
  lastSpokenText: '',
  notice: '',
}

export function useSpeechPlayback() {
  const [state, setState] = useState(initialState)
  const audioRef = useRef(null)
  const audioUrlRef = useRef('')
  const playbackResolverRef = useRef(null)
  const utteranceRef = useRef(null)

  const completePlayback = (completed) => {
    playbackResolverRef.current?.(completed)
    playbackResolverRef.current = null
  }

  const cleanupAudio = () => {
    audioRef.current?.pause()
    audioRef.current = null

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = ''
    }
  }

  const cleanupSpeech = () => {
    cleanupAudio()

    if (window.speechSynthesis && utteranceRef.current) {
      window.speechSynthesis.cancel()
      utteranceRef.current = null
    }
  }

  const stopSpeech = () => {
    cleanupSpeech()
    completePlayback(false)

    setState((value) => ({ ...value, isLoading: false, isPlaying: false }))
  }

  const playBrowserSpeech = (spokenText, notice = '') => new Promise((resolve) => {
    playbackResolverRef.current = resolve

    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      setState({
        ...initialState,
        error: 'Voice playback is unavailable. The transcript remains active.',
        lastSpokenText: spokenText,
      })
      completePlayback(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(spokenText)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onend = () => {
      setState((value) => ({ ...value, isPlaying: false }))
      completePlayback(true)
    }
    utterance.onerror = () => {
      setState((value) => ({
        ...value,
        error: 'Voice playback is unavailable. The transcript remains active.',
        isPlaying: false,
        notice: '',
      }))
      completePlayback(false)
    }
    utteranceRef.current = utterance
    setState({ ...initialState, isPlaying: true, lastSpokenText: spokenText, notice })
    window.speechSynthesis.speak(utterance)
  })

  const playSpeech = async (text) => {
    const spokenText = text?.trim()
    if (!spokenText) return

    stopSpeech()
    setState({ ...initialState, isLoading: true })

    if (voiceRuntime.mode !== 'real') {
      return playBrowserSpeech(spokenText)
    }

    try {
      const result = await synthesizeSpeech(spokenText)

      if (!result.audioUrl) {
        setState({ ...initialState, lastSpokenText: spokenText })
        return false
      }

      return await new Promise((resolve) => {
        playbackResolverRef.current = resolve
        audioUrlRef.current = result.audioUrl
        const audio = new Audio(result.audioUrl)
        audioRef.current = audio
        audio.addEventListener('ended', () => {
          setState((value) => ({ ...value, isPlaying: false }))
          completePlayback(true)
        })
        audio.addEventListener('error', () => {
          cleanupAudio()
          playbackResolverRef.current = null
          void playBrowserSpeech(spokenText, 'Loom switched to browser voice.').then(resolve)
        })

        setState({ ...initialState, isPlaying: true, lastSpokenText: spokenText })
        audio.play().catch(() => {
          cleanupAudio()
          playbackResolverRef.current = null
          void playBrowserSpeech(spokenText, 'Loom switched to browser voice.').then(resolve)
        })
      })
    } catch (error) {
      cleanupAudio()
      return playBrowserSpeech(spokenText, 'Loom switched to browser voice.')
    }
  }

  const clearNotice = () => setState((value) => ({ ...value, error: '', notice: '' }))

  const reset = () => {
    stopSpeech()
    setState(initialState)
  }

  useEffect(() => cleanupSpeech, [])

  return {
    ...state,
    clearNotice,
    playSpeech,
    reset,
    stopSpeech,
  }
}
