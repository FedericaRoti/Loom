import { validateBoardActions } from '../../shared/boardActions.js'
import { createMockArtifactPlan, validateArtifactPlan } from '../../shared/artifactPlan.js'

const API_MODE = import.meta.env.VITE_LOOM_API_MODE ?? 'mock'
const API_BASE_URL = import.meta.env.VITE_LOOM_API_BASE_URL ?? '/api'

export const voiceRuntime = {
  artifactPlannerModel: import.meta.env.VITE_LOOM_ARTIFACT_PLANNER_MODEL ?? 'gpt-5.6-sol',
  conversationModel: import.meta.env.VITE_LOOM_CONVERSATION_MODEL ?? 'gpt-5.6-terra',
  mode: API_MODE,
  realtimeModel: import.meta.env.VITE_LOOM_REALTIME_MODEL ?? 'gpt-realtime-2.1',
  transcriptionModel: import.meta.env.VITE_LOOM_TRANSCRIPTION_MODEL ?? 'gpt-4o-transcribe',
  ttsModel: import.meta.env.VITE_LOOM_TTS_MODEL ?? 'gpt-4o-mini-tts',
  ttsVoice: import.meta.env.VITE_LOOM_TTS_VOICE ?? 'cedar',
}

export function getVoiceRuntimeStatus() {
  if (API_MODE !== 'real') {
    return {
      label: 'Mock voice',
      detail: 'Deterministic demo mode. No network calls.',
      isReal: false,
    }
  }

  return {
    label: 'Real voice ready',
    detail: 'Browser should connect through server endpoints; API keys must stay server-side.',
    isReal: true,
  }
}

export async function requestRealtimeClientSecret() {
  if (API_MODE !== 'real') {
    return {
      clientSecret: null,
      mode: 'mock',
    }
  }

  const response = await fetch(`${API_BASE_URL}/realtime/client-secret`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: voiceRuntime.realtimeModel,
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to create realtime client secret.')
  }

  return response.json()
}

export async function transcribeAudio(audioBlob) {
  if (API_MODE !== 'real') {
    return {
      text: 'Mock transcription keeps the demo deterministic.',
    }
  }

  const formData = new FormData()
  formData.append('audio', audioBlob)
  formData.append('model', voiceRuntime.transcriptionModel)

  const response = await fetch(`${API_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Unable to transcribe audio.')
  }

  return response.json()
}

export async function requestConversationReply({ artifactType, boardContext = [], boardLinks = [], learnerText, pendingChecks = [], plannedArtifact = null, sessionTitle, transcript }) {
  if (API_MODE !== 'real') {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 450)
    })

    return { mode: 'mock', ...createMockConversationReply(artifactType, learnerText) }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/conversation/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artifactType,
        boardContext,
        boardLinks,
        learnerText,
        model: voiceRuntime.conversationModel,
        pendingChecks,
        plannedArtifact,
        sessionTitle,
        transcript,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(getResponseError(payload, 'Unable to generate Loom reply.'))
    }

    const reply = await response.json()
    const validationError = validateConversationReply(reply)
    if (validationError) throw new Error(validationError)

    return reply
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to generate Loom reply.',
      mode: 'mock-fallback',
      ...createMockConversationReply(artifactType, learnerText),
    }
  }
}

export async function requestArtifactPlan({ activeArtifact = null, currentView = 'board', fallbackArtifactType, learnerText = '', sessionTitle, transcript }) {
  if (API_MODE !== 'real') {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 650)
    })

    return {
      mode: 'mock',
      plan: createMockArtifactPlan(chooseMockArtifactPlan({ activeArtifact, currentView, learnerText, transcript })),
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/artifact/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        learnerText,
        model: voiceRuntime.artifactPlannerModel,
        activeArtifact,
        currentView,
        sessionTitle,
        transcript,
      }),
    })

    if (!response.ok) throw new Error('Unable to generate artifact plan.')

    const plan = await response.json()
    const validationError = validateArtifactPlan(plan)
    if (validationError) throw new Error(validationError)

    return { mode: 'model', plan }
  } catch (error) {
    const artifactType = fallbackArtifactType ?? chooseMockArtifactType({ learnerText, transcript })
    const viewAction = currentView === 'artifact' && artifactType !== 'stay-on-board'
      ? 'continue-artifact'
      : undefined

    return {
      error: error instanceof Error ? error.message : 'Unable to generate artifact plan.',
      mode: 'mock-fallback',
      plan: createMockArtifactPlan({ artifactType, viewAction }),
    }
  }
}

function chooseMockArtifactPlan({ activeArtifact, currentView, learnerText, transcript }) {
  const isManipulationQuestion = /\b(angle|speed|velocity|range|height|launch|change|increase|decrease|move|set)\b/i.test(learnerText)

  if (currentView === 'artifact' && activeArtifact && isManipulationQuestion) {
    return { artifactType: activeArtifact, viewAction: 'continue-artifact' }
  }

  if (currentView === 'artifact') {
    return { artifactType: 'stay-on-board', viewAction: 'return-to-board' }
  }

  return { artifactType: chooseMockArtifactType({ learnerText, transcript }) }
}

function chooseMockArtifactType({ learnerText, transcript }) {
  const transcriptText = Array.isArray(transcript)
    ? transcript.map((entry) => entry.text ?? '').join(' ')
    : ''
  const conceptText = `${learnerText} ${transcriptText}`.toLowerCase()
  const hasProjectileContext = /\b(projectile|thrown ball|throw|launch|trajectory|arc|landing|range)\b/.test(conceptText)
  const hasManipulableQuantity = /\b(angle|speed|velocity|distance|rate|time|height|force|mass|temperature|volume|percent|ratio|calculate|change)\b/.test(conceptText)
  const hasPlottableRelationship = /\b(function|graph|linear|quadratic|exponential|growth|rate|proportion|trend|curve)\b/.test(conceptText)
  const hasConceptualTension = /\b(choice|character|determinism|free will|responsibility|pressure|cause|consequence|idea|argument|belief|value)\b/.test(conceptText)

  if (hasProjectileContext && hasManipulableQuantity) return 'projectile-simulator'
  if (hasPlottableRelationship) return 'plot-board'
  if (hasConceptualTension) return 'connection-map'

  return 'stay-on-board'
}

function createMockConversationReply(artifactType, learnerText = '') {
  const isProjectile = artifactType === 'projectile-simulator'

  if (!isProjectile) {
    return {
      boardActions: [],
      boardTitle: 'Following the thread',
      text: learnerText
        ? `I heard your question about ${learnerText}. Let us keep it in view while I reconnect the live explanation.`
        : 'Let us keep the question in view while I reconnect the live explanation.',
      comprehensionChecks: [],
      resolvedCheckIds: [],
      sources: [],
    }
  }

  return {
    boardActions: [{ type: 'add_concept', id: 'two-motions', label: 'two motions', tone: 'sage' }],
    boardTitle: 'Projectile motion',
    text: 'Yes. Think of the path as two motions at once: sideways motion keeps going, while vertical motion rises, slows, and falls.',
    comprehensionChecks: [
      { id: 'launch-values', question: 'Which two launch values shape the path?' },
      { id: 'sideways-motion', question: 'Which motion keeps moving sideways?' },
    ],
    resolvedCheckIds: [],
    sources: [],
  }
}

function getResponseError(payload, fallback) {
  if (typeof payload?.error === 'string') return payload.error
  if (typeof payload?.error?.message === 'string') return payload.error.message
  return fallback
}

function validateConversationReply(reply) {
  if (!reply || typeof reply.text !== 'string') return 'Conversation reply is missing text.'
  if (typeof reply.boardTitle !== 'string' || !reply.boardTitle.trim()) return 'Conversation reply is missing a board title.'
  const boardError = validateBoardActions(reply.boardActions)
  if (boardError) return boardError
  if (!Array.isArray(reply.comprehensionChecks) || reply.comprehensionChecks.length > 3) {
    return 'Conversation reply must contain up to three comprehension checks.'
  }
  if (reply.comprehensionChecks.some((check) => !check || typeof check.id !== 'string' || typeof check.question !== 'string')) {
    return 'Conversation reply has an invalid comprehension check.'
  }
  if (!Array.isArray(reply.resolvedCheckIds) || reply.resolvedCheckIds.length > 3 || reply.resolvedCheckIds.some((id) => typeof id !== 'string')) {
    return 'Conversation reply has invalid resolved comprehension checks.'
  }
  if (!Array.isArray(reply.sources) || reply.sources.some((source) => !source || typeof source.title !== 'string' || typeof source.url !== 'string')) {
    return 'Conversation reply has invalid sources.'
  }

  return null
}

export async function synthesizeSpeech(text) {
  if (API_MODE !== 'real') {
    return {
      audioUrl: null,
      text,
    }
  }

  const response = await fetch(`${API_BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      instructions: 'Speak like a calm, attentive sports coach: direct, encouraging, and measured. Keep the pace clear, never theatrical or overly intense.',
      model: voiceRuntime.ttsModel,
      voice: voiceRuntime.ttsVoice,
    }),
  })

  if (!response.ok) {
    throw new Error('Unable to synthesize speech.')
  }

  const audioBlob = await response.blob()
  return {
    audioUrl: URL.createObjectURL(audioBlob),
    text,
  }
}
