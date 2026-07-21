import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioLines, Check, House, Mic, NotebookPen, Pause, Play, Square, Volume2, WandSparkles, X } from 'lucide-react'
import { Slider } from './components/ui/Slider.jsx'
import { sessions } from './data/sessions.js'
import { useSpeechPlayback } from './hooks/useSpeechPlayback.js'
import { useVoiceRecorder } from './hooks/useVoiceRecorder.js'
import { requestArtifactPlan, requestConversationReply, voiceRuntime } from './services/loomApi.js'
import { createBoardState } from '../shared/boardActions.js'
import { createTurnHistory } from '../shared/conversationTurn.js'

const sessionNames = {
  projectile: 'Why does the ball arc?',
  'free-will': 'Choice under pressure',
}

const timeByStep = ['00:12', '00:24', '00:38', '00:52', '01:08', '01:22', '01:34', '01:48']
const mapLayout = [
  { x: 128, y: 88 }, { x: 612, y: 88 }, { x: 370, y: 188 },
  { x: 150, y: 300 }, { x: 590, y: 300 }, { x: 370, y: 352 },
]
const liveSession = { id: 'live', session: { artifactType: 'stay-on-board', steps: [], title: 'A conversation, out loud' } }
const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))
const sessionStorageKey = 'loom-saved-sessions-v1'

function loadSavedSessions() {
  try {
    const value = window.localStorage.getItem(sessionStorageKey)
    const sessions = value ? JSON.parse(value) : []
    return Array.isArray(sessions) ? sessions : []
  } catch {
    return []
  }
}

function createSavedSession({ id, title, turns }) {
  return {
    angle: [42],
    artifactPlanState: { mode: '', plan: null, sessionId: 'live', status: 'idle' },
    dismissedCheckIds: [],
    id,
    plannerTurn: turns.filter((turn) => turn.transcript.speaker === 'Learner').length,
    plotControlValues: {},
    title: title || 'Untitled conversation',
    turns,
    updatedAt: Date.now(),
    velocity: [25],
  }
}

function getTopicChoice(text) {
  const normalized = text.trim().toLowerCase()
  if (/\b(new|start new|new conversation|new session)\b|nuova (conversazione|sessione)|inizia una nuova/.test(normalized)) return 'new'
  if (/\b(keep|continue|same|current|resume)\b|continua|mantieni|stessa conversazione|questa conversazione/.test(normalized)) return 'keep'
  return null
}

function appendVisualTransition(text, plan) {
  if (!plan?.spokenChoice || plan.viewAction === 'stay-on-board') return text

  const combined = `${text.trim()} ${plan.spokenChoice.trim()}`
  if (plan.viewAction === 'show-artifact' && !/\b(?:let me show you|now .*show you|i(?:'ll| will) show you)\b/i.test(combined)) {
    return `${text.trim()} Now let me show you. ${plan.spokenChoice.trim()}`
  }

  return combined
}

function App() {
  const [angle, setAngle] = useState([42])
  const [velocity, setVelocity] = useState([25])
  const [plotControlValues, setPlotControlValues] = useState({})
  const [isPaused, setIsPaused] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [stepIndex, setStepIndex] = useState(-1)
  const [artifactPlanState, setArtifactPlanState] = useState({ mode: '', plan: null, sessionId: null, status: 'idle' })
  const [isFallbackNoticeVisible, setIsFallbackNoticeVisible] = useState(false)
  const [dismissedCheckIds, setDismissedCheckIds] = useState([])
  const [isResponding, setIsResponding] = useState(false)
  const [liveTurns, setLiveTurns] = useState([])
  const [savedSessions, setSavedSessions] = useState(loadSavedSessions)
  const [liveSessionRecordId, setLiveSessionRecordId] = useState(null)
  const [pendingTopicShift, setPendingTopicShift] = useState(null)
  const timerRef = useRef(null)
  const liveSessionActiveRef = useRef(false)
  const livePlannerTurnRef = useRef(0)
  const liveSessionRecordIdRef = useRef(null)
  const pendingTopicShiftRef = useRef(null)
  const liveTurnsRef = useRef([])
  const speech = useSpeechPlayback()
  const isLiveConversation = sessionId === 'live'

  const activeSession = useMemo(
    () => isLiveConversation ? liveSession : sessions.find((item) => item.id === sessionId) ?? null,
    [isLiveConversation, sessionId],
  )
  const activeStep = activeSession?.session.steps[stepIndex] ?? null
  const isGenerating = activeStep?.id === 'generating'
  const isArtifactPlanning = artifactPlanState.status === 'loading'
  const artifactPlan = artifactPlanState.sessionId === sessionId ? artifactPlanState.plan : null
  const artifactReady = isLiveConversation
    ? Boolean(artifactPlan && artifactPlan.artifactType !== 'stay-on-board')
    : stepIndex === activeSession?.session.steps.length - 1
  const artifactType = artifactPlan?.artifactType ?? activeSession?.session.artifactType
  const conceptChosen = ['choosing', 'generating', 'ready'].includes(activeStep?.id)
  const turnHistory = isLiveConversation
    ? liveTurns
    : createTurnHistory({ session: activeSession?.session, stepIndex, times: timeByStep })
  const resolvedCheckIds = new Set(turnHistory.flatMap((turn) => turn.resolvedCheckIds))
  const comprehensionChecks = turnHistory
    .flatMap((turn) => turn.checks)
    .filter((check) => !dismissedCheckIds.includes(check.id))
    .map((check) => ({ ...check, isResolved: resolvedCheckIds.has(check.id) }))
  const boardState = createBoardState(
    turnHistory.flatMap((turn) => turn.boardActions),
  )
  const boardSources = uniqueSources(turnHistory.flatMap((turn) => turn.sources ?? []))
  const boardTitle = isLiveConversation
    ? [...turnHistory].reverse().find((turn) => turn.boardTitle)?.boardTitle
    : null
  const latestLearnerText = [...turnHistory]
    .reverse()
    .find((turn) => turn.transcript.speaker === 'Learner')?.transcript.text ?? ''

  const handleLiveTranscript = async (text, { allowTopicConfirmation = true, bypassResponseLock = false } = {}) => {
    const learnerText = text.trim()
    if (!learnerText || !liveSessionActiveRef.current || (isResponding && !bypassResponseLock)) return

    if (pendingTopicShiftRef.current) {
      const choice = getTopicChoice(learnerText)
      if (choice) {
        resolveTopicShift(choice)
      } else {
        await speech.playSpeech('Please say start a new conversation, or keep this conversation.')
      }
      return
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const learnerTurn = {
      boardActions: [],
      checks: [],
      id: `learner-${Date.now()}`,
      resolvedCheckIds: [],
      time,
      transcript: { speaker: 'Learner', text: learnerText },
    }
    const requestTurns = [...liveTurnsRef.current, learnerTurn]
    const currentBoard = createBoardState(requestTurns.flatMap((turn) => turn.boardActions))
    const pendingChecks = requestTurns
      .flatMap((turn) => turn.checks)
      .filter((check) => !dismissedCheckIds.includes(check.id))

    setIsResponding(true)

    try {
      const learnerTurns = requestTurns.filter((turn) => turn.transcript.speaker === 'Learner').length
      const shouldPlan = learnerTurns >= 2 && livePlannerTurnRef.current !== learnerTurns
      let plannedArtifact = null
      const replyPromise = requestConversationReply({
        artifactType: artifactReady ? artifactType : 'stay-on-board',
        boardContext: currentBoard.concepts,
        boardLinks: currentBoard.connections,
        learnerText,
        pendingChecks,
        sessionTitle: liveSession.session.title,
        transcript: requestTurns.map((turn) => turn.transcript),
      })

      if (shouldPlan) {
        livePlannerTurnRef.current = learnerTurns
        const planningPromise = requestArtifactPlan({
          activeArtifact: artifactReady ? artifactType : null,
          currentView: artifactReady ? 'artifact' : 'board',
          fallbackArtifactType: 'stay-on-board',
          learnerText,
          sessionTitle: liveSession.session.title,
          transcript: requestTurns.map((turn) => turn.transcript),
        })
        plannedArtifact = await planningPromise

        if (!liveSessionActiveRef.current) return
      }

      if (allowTopicConfirmation && plannedArtifact?.plan.boardMode === 'new-board') {
        const shift = { learnerText }
        pendingTopicShiftRef.current = shift
        setPendingTopicShift(shift)
        await speech.playSpeech('This sounds like a new topic. Would you like to start a new conversation, or keep this one?')
        return
      }

      if (!allowTopicConfirmation && plannedArtifact?.plan.boardMode === 'new-board') {
        plannedArtifact = { ...plannedArtifact, plan: { ...plannedArtifact.plan, boardMode: 'keep' } }
      }

      liveTurnsRef.current = requestTurns
      setLiveTurns(requestTurns)

      const reply = await replyPromise

      if (!liveSessionActiveRef.current) return

      if (reply.error) {
        console.error('Loom conversation fallback:', reply.error)
      }

      const spokenReply = appendVisualTransition(reply.text, plannedArtifact?.plan)

      const loomTurn = {
        boardActions: reply.boardActions,
        boardTitle: reply.boardTitle,
        checks: reply.comprehensionChecks,
        id: `loom-${Date.now()}`,
        resolvedCheckIds: reply.resolvedCheckIds,
        sources: reply.sources,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transcript: { speaker: 'Loom', text: spokenReply },
      }
      liveTurnsRef.current = [...liveTurnsRef.current, loomTurn]
      setLiveTurns(liveTurnsRef.current)
      if (!liveSessionRecordIdRef.current) {
        const recordId = `session-${Date.now()}`
        liveSessionRecordIdRef.current = recordId
        setLiveSessionRecordId(recordId)
        setSavedSessions((current) => [...current, createSavedSession({ id: recordId, title: reply.boardTitle, turns: liveTurnsRef.current })])
      }
      setIsFallbackNoticeVisible(reply.mode === 'mock-fallback')

      if (!shouldPlan || !liveSessionActiveRef.current) {
        void speech.playSpeech(spokenReply)
        return
      }

      if (plannedArtifact.plan.viewAction === 'stay-on-board' || plannedArtifact.plan.viewAction === 'return-to-board') {
        setArtifactPlanState({ ...plannedArtifact, sessionId: 'live', status: 'ready' })
        setIsFallbackNoticeVisible(plannedArtifact.mode === 'mock-fallback')
        void speech.playSpeech(spokenReply)
        return
      }

      if (plannedArtifact.plan.artifactType === 'projectile-simulator') {
        setAngle([plannedArtifact.plan.parameters.angle])
        setVelocity([plannedArtifact.plan.parameters.velocity])
      }
      if (plannedArtifact.plan.artifactType === 'plot-board') setPlotControlValues(getPlotControlDefaults(plannedArtifact.plan.plot))

      if (plannedArtifact.plan.viewAction === 'show-artifact') {
        setArtifactPlanState({ mode: '', plan: null, sessionId: 'live', status: 'loading' })
        void speech.playSpeech(spokenReply)
        await wait(700)

        if (!liveSessionActiveRef.current) return
        setArtifactPlanState({ ...plannedArtifact, sessionId: 'live', status: 'ready' })
        setIsFallbackNoticeVisible(plannedArtifact.mode === 'mock-fallback')
        return
      }

      setArtifactPlanState({ ...plannedArtifact, sessionId: 'live', status: 'ready' })
      setIsFallbackNoticeVisible(plannedArtifact.mode === 'mock-fallback')
      void speech.playSpeech(spokenReply)
    } finally {
      setIsResponding(false)
    }
  }

  const recorder = useVoiceRecorder({ onTranscript: handleLiveTranscript })

  const prepareLiveDraft = ({ recording = false } = {}) => {
    liveSessionActiveRef.current = true
    livePlannerTurnRef.current = 0
    liveTurnsRef.current = []
    liveSessionRecordIdRef.current = null
    pendingTopicShiftRef.current = null
    recorder.reset()
    speech.reset()
    setArtifactPlanState({ mode: '', plan: null, sessionId: null, status: 'idle' })
    setAngle([42])
    setDismissedCheckIds([])
    setIsFallbackNoticeVisible(false)
    setIsPaused(false)
    setPlotControlValues({})
    setIsResponding(false)
    setLiveTurns([])
    setLiveSessionRecordId(null)
    setPendingTopicShift(null)
    setVelocity([25])
    setSessionId('live')
    setStepIndex(-1)
    if (recording) recorder.startRecording()
  }

  const resolveTopicShift = (choice) => {
    const pending = pendingTopicShiftRef.current
    if (!pending) return

    pendingTopicShiftRef.current = null
    setPendingTopicShift(null)

    if (choice === 'keep') {
      const text = 'Let us stay with the current thread. What would you like to clarify?'
      const loomTurn = {
        boardActions: [],
        checks: [],
        id: `loom-${Date.now()}`,
        resolvedCheckIds: [],
        sources: [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transcript: { speaker: 'Loom', text },
      }
      liveTurnsRef.current = [...liveTurnsRef.current, loomTurn]
      setLiveTurns(liveTurnsRef.current)
      void speech.playSpeech(text)
      return
    }

    prepareLiveDraft()
    window.setTimeout(() => {
      void handleLiveTranscript(pending.learnerText, { allowTopicConfirmation: false, bypassResponseLock: true })
    }, 0)
  }

  const resumeSavedSession = (record) => {
    liveSessionActiveRef.current = true
    livePlannerTurnRef.current = record.plannerTurn ?? record.turns.filter((turn) => turn.transcript.speaker === 'Learner').length
    liveTurnsRef.current = record.turns
    liveSessionRecordIdRef.current = record.id
    pendingTopicShiftRef.current = null
    recorder.reset()
    speech.reset()
    setArtifactPlanState(record.artifactPlanState ? { ...record.artifactPlanState, sessionId: 'live' } : { mode: '', plan: null, sessionId: null, status: 'idle' })
    setAngle(record.angle ?? [42])
    setVelocity(record.velocity ?? [25])
    setPlotControlValues(record.plotControlValues ?? {})
    setDismissedCheckIds(record.dismissedCheckIds ?? [])
    setIsFallbackNoticeVisible(false)
    setIsPaused(false)
    setIsResponding(false)
    setLiveTurns(record.turns)
    setLiveSessionRecordId(record.id)
    setPendingTopicShift(null)
    setSessionId('live')
    setStepIndex(-1)
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(savedSessions))
    } catch {
      // Saved sessions remain available for the current page when storage is unavailable.
    }
  }, [savedSessions])

  useEffect(() => {
    if (!isLiveConversation || !liveSessionRecordId) return

    setSavedSessions((current) => current.map((record) => record.id === liveSessionRecordId
      ? {
          ...record,
          angle,
          artifactPlanState,
          dismissedCheckIds,
          plotControlValues,
          plannerTurn: livePlannerTurnRef.current,
          title: boardTitle || record.title,
          turns: liveTurns,
          updatedAt: Date.now(),
          velocity,
        }
      : record))
  }, [angle, artifactPlanState, boardTitle, dismissedCheckIds, isLiveConversation, liveSessionRecordId, liveTurns, plotControlValues, velocity])

  useEffect(() => {
    window.clearTimeout(timerRef.current)

    if (!isLiveConversation && !isPaused && !isArtifactPlanning && activeSession && stepIndex >= 0 && stepIndex < activeSession.session.steps.length - 1) {
      timerRef.current = window.setTimeout(() => setStepIndex((value) => value + 1), activeStep?.delay ?? 1450)
    }

    return () => window.clearTimeout(timerRef.current)
  }, [activeSession, activeStep?.delay, isArtifactPlanning, isLiveConversation, isPaused, stepIndex])

  useEffect(() => {
    if (isLiveConversation || !activeSession || activeStep?.id !== 'choosing' || artifactPlanState.sessionId === sessionId) return

    let isCancelled = false
    setArtifactPlanState({ mode: '', plan: null, sessionId: null, status: 'loading' })

    requestArtifactPlan({
      fallbackArtifactType: activeSession.session.artifactType,
      learnerText: latestLearnerText,
      sessionTitle: activeSession.session.title,
      transcript: turnHistory.map((turn) => turn.transcript),
    }).then((result) => {
      if (isCancelled) return
      if (result.plan.artifactType === 'projectile-simulator') {
        setAngle([result.plan.parameters.angle])
        setVelocity([result.plan.parameters.velocity])
      }
      setArtifactPlanState({ ...result, sessionId, status: 'ready' })
      setIsFallbackNoticeVisible(result.mode === 'mock-fallback')
    })

    return () => {
      isCancelled = true
    }
  }, [activeSession, activeStep?.id, artifactPlanState.sessionId, isLiveConversation, latestLearnerText, sessionId, stepIndex])

  const startSession = (nextSessionId) => {
    liveSessionActiveRef.current = false
    livePlannerTurnRef.current = 0
    liveTurnsRef.current = []
    liveSessionRecordIdRef.current = null
    pendingTopicShiftRef.current = null
    recorder.reset()
    speech.reset()
    setArtifactPlanState({ mode: '', plan: null, sessionId: null, status: 'idle' })
    setIsFallbackNoticeVisible(false)
    setDismissedCheckIds([])
    setIsResponding(false)
    setIsPaused(false)
    setPlotControlValues({})
    setLiveTurns([])
    setLiveSessionRecordId(null)
    setPendingTopicShift(null)
    setSessionId(nextSessionId)
    setStepIndex(0)
  }

  const startNewConversation = () => {
    liveSessionActiveRef.current = false
    livePlannerTurnRef.current = 0
    liveTurnsRef.current = []
    liveSessionRecordIdRef.current = null
    pendingTopicShiftRef.current = null
    recorder.reset()
    speech.reset()
    setArtifactPlanState({ mode: '', plan: null, sessionId: null, status: 'idle' })
    setIsFallbackNoticeVisible(false)
    setDismissedCheckIds([])
    setIsResponding(false)
    setIsPaused(false)
    setPlotControlValues({})
    setLiveTurns([])
    setLiveSessionRecordId(null)
    setPendingTopicShift(null)
    setSessionId(null)
    setStepIndex(-1)
  }

  const startLiveConversation = () => prepareLiveDraft({ recording: true })

  const latestLoomText = isLiveConversation
    ? [...turnHistory].reverse().find((turn) => turn.transcript.speaker === 'Loom')?.transcript.text ?? ''
    : activeStep?.transcript.speaker === 'Loom'
      ? activeStep.id === 'choosing' && artifactPlan?.spokenChoice ? artifactPlan.spokenChoice : activeStep.transcript.text
      : ''
  const resolvedConnectionMap = artifactPlan?.map ? addMapLayout(artifactPlan.map) : activeSession?.session.connectionMap
  const plannerNotice = isFallbackNoticeVisible ? 'Loom switched to a stable demo response.' : ''

  return (
    <main className="loom-session-shell">
      <aside className="loom-sidebar">
        <div className="loom-brand" aria-label="Loom - Understanding, out loud.">
          <img src="/loom-logo.png" alt="Loom - Understanding, out loud." />
        </div>

        <nav className="loom-primary-nav" aria-label="Primary navigation">
          <button type="button" className={`loom-nav-item ${sessionId === null ? 'loom-nav-item-active' : ''}`} onClick={startNewConversation}><House size={18} />Home</button>
          <button type="button" className="loom-nav-item"><NotebookPen size={18} />Notes</button>
        </nav>

        <section className="loom-sessions" aria-label="Sessions">
          <p>Sessions</p>
          {sessions.map((session, index) => (
            <button key={session.id} type="button" className={`loom-session-item ${sessionId === session.id ? 'loom-session-item-active' : ''}`} onClick={() => startSession(session.id)}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {sessionNames[session.id]}
            </button>
          ))}
          {savedSessions.map((session, index) => (
            <button key={session.id} type="button" className={`loom-session-item ${liveSessionRecordId === session.id ? 'loom-session-item-active' : ''}`} onClick={() => resumeSavedSession(session)}>
              <span>{String(sessions.length + index + 1).padStart(2, '0')}</span>
              {session.title}
            </button>
          ))}
        </section>
      </aside>

      <section className="loom-session-workspace">
        <VoiceBar
          isPaused={isPaused}
          isPlaying={speech.isPlaying}
          isLiveConversation={isLiveConversation}
          isRecording={recorder.isRecording}
          isResponding={isResponding}
          isTranscribing={recorder.isTranscribing}
          latestLoomText={latestLoomText}
          hasActiveSession={Boolean(activeSession)}
          onReset={startNewConversation}
          onStart={voiceRuntime.mode === 'real' ? startLiveConversation : () => startSession('projectile')}
          onPlay={() => speech.playSpeech(latestLoomText)}
          onRecordStart={recorder.startRecording}
          onRecordStop={recorder.stopRecording}
          onTogglePause={() => setIsPaused((value) => !value)}
          onClearVoiceNotice={speech.clearNotice}
          onClearPlannerNotice={() => setIsFallbackNoticeVisible(false)}
          onTopicChoice={resolveTopicShift}
          pendingTopicShift={pendingTopicShift}
          plannerNotice={plannerNotice}
          voiceNotice={recorder.error || speech.error || speech.notice}
          voiceState={isLiveConversation
            ? recorder.isRecording ? 'Loom is listening' : recorder.isTranscribing ? 'Loom is transcribing' : isResponding ? 'Loom is thinking' : 'Loom is ready'
            : activeStep?.voiceState ?? 'Loom is listening'}
        />

        <div className="loom-study-columns">
          <section className="loom-board">
            <BoardHeader artifactType={artifactType} boardTitle={boardTitle} session={activeSession?.session} conceptChosen={conceptChosen} />
            {!activeSession && <EmptyBoard />}
            {activeSession && isLiveConversation && isArtifactPlanning && <GenerationBoard step={{ detail: 'Loom is deciding whether the conversation needs a visual artifact.', id: 'generating', status: 'Choosing the next form' }} />}
            {activeSession && !isLiveConversation && isGenerating && <GenerationBoard step={activeStep} />}
            {activeSession && (!artifactReady || artifactType === 'stay-on-board') && !isGenerating && !(isLiveConversation && isArtifactPlanning) && <Motherboard state={boardState} sources={boardSources} />}
            {artifactReady && artifactType === 'projectile-simulator' && <ArtifactStage state={boardState}><ProjectileArtifact angle={angle[0]} velocity={velocity[0]} /></ArtifactStage>}
            {artifactReady && artifactType === 'connection-map' && <ArtifactStage state={boardState}><ConnectionMap map={resolvedConnectionMap} /></ArtifactStage>}
            {artifactReady && artifactType === 'plot-board' && <ArtifactStage state={boardState}><PlotArtifact plot={artifactPlan.plot} values={plotControlValues} /></ArtifactStage>}
            {artifactReady && artifactType === 'projectile-simulator' && <ControlArea angle={angle[0]} insight={artifactPlan?.parameters?.insight} velocity={velocity[0]} onAngleChange={setAngle} onVelocityChange={setVelocity} />}
            {artifactReady && artifactType === 'connection-map' && <MapReadingPath items={resolvedConnectionMap.readingPath} />}
            {artifactReady && artifactType === 'plot-board' && <PlotControlArea controls={artifactPlan.plot.controls} values={plotControlValues} onChange={(controlId, value) => setPlotControlValues((current) => ({ ...current, [controlId]: value }))} />}
          </section>

          <Transcript
            checks={comprehensionChecks}
            choiceText={artifactPlan?.spokenChoice}
            onDismissCheck={(checkId) => setDismissedCheckIds((current) => [...current, checkId])}
            onOpenEntry={() => {
              setIsPaused(true)
              speech.stopSpeech()
            }}
            sessionId={sessionId}
            turns={turnHistory}
          />
        </div>
      </section>
    </main>
  )
}

function VoiceBar({ hasActiveSession, isLiveConversation, isPaused, isPlaying, isRecording, isResponding, isTranscribing, latestLoomText, onClearPlannerNotice, onClearVoiceNotice, onPlay, onRecordStart, onRecordStop, onReset, onStart, onTogglePause, onTopicChoice, pendingTopicShift, plannerNotice, voiceNotice, voiceState }) {
  const label = pendingTopicShift ? 'Loom is waiting for your choice...' : isPaused ? 'Loom is paused...' : isPlaying ? 'Loom is speaking...' : `${voiceState}...`

  return (
    <header className="loom-voice-bar">
      <div className="loom-voice-state">
        <span className="loom-voice-orb"><AudioLines size={22} /></span>
        <div>
          <strong>{label}</strong>
          <p>{isPaused ? 'Your session is ready when you are.' : voiceRuntime.mode === 'real' ? 'AI voice. Speak naturally. Loom will make the idea visible.' : 'Speak naturally. Loom will make the idea visible.'}</p>
        </div>
      </div>
      <div className="loom-waveform" aria-hidden="true">
        {[10, 16, 8, 22, 13, 28, 16, 24, 11, 18, 9, 21, 15, 12, 17].map((height, index) => <span key={index} style={{ height }} />)}
      </div>
      <div className="loom-voice-actions">
        {!hasActiveSession && <button type="button" onClick={onStart} className="loom-start-conversation"><Mic size={16} />Start a conversation</button>}
        {hasActiveSession && <>{isLiveConversation && <button type="button" onClick={isRecording ? onRecordStop : onRecordStart} disabled={isResponding || isTranscribing} className="loom-start-conversation" aria-label={isRecording ? 'Stop recording' : 'Speak to Loom'}>{isRecording ? <Square size={15} /> : <Mic size={16} />}{isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : isResponding ? 'Loom is thinking...' : 'Speak to Loom'}</button>}<button type="button" onClick={onPlay} disabled={!latestLoomText} className="loom-icon-control" aria-label="Play Loom voice" title="Play Loom voice"><Volume2 size={18} /></button><button type="button" onClick={onTogglePause} className="loom-icon-control" aria-label={isPaused ? 'Resume session' : 'Pause session'} title={isPaused ? 'Resume session' : 'Pause session'}>{isPaused ? <Play size={17} /> : <Pause size={17} />}</button><button type="button" className="loom-end-session" onClick={onReset} aria-label="End conversation">End conversation <Square size={13} /></button></>}
      </div>
      {voiceNotice && <div className="loom-voice-notice" role="status"><p>{voiceNotice}</p><button type="button" onClick={onClearVoiceNotice} className="loom-icon-control" aria-label="Dismiss voice notice" title="Dismiss voice notice"><X size={15} /></button></div>}
      {plannerNotice && <div className="loom-voice-notice" role="status"><p>{plannerNotice}</p><button type="button" onClick={onClearPlannerNotice} className="loom-icon-control" aria-label="Dismiss artifact notice" title="Dismiss artifact notice"><X size={15} /></button></div>}
      {pendingTopicShift && <div className="loom-topic-shift" role="status"><p>This sounds like a new topic. Start a new conversation, or keep this one?</p><div><button type="button" onClick={() => onTopicChoice('new')}>Start new</button><button type="button" onClick={() => onTopicChoice('keep')}>Keep current</button></div></div>}
    </header>
  )
}

function BoardHeader({ artifactType, boardTitle, conceptChosen, session }) {
  const title = boardTitle || (!session ? 'Ask Loom out loud' : conceptChosen ? session.title.split(',')[0] : 'Following the thread')
  const subject = !session ? 'New conversation' : conceptChosen ? artifactType === 'projectile-simulator' ? 'Physics' : artifactType === 'connection-map' ? 'Ideas in conversation' : artifactType === 'plot-board' ? 'A visual relationship' : 'Conversation' : 'Conversation'

  return <header className="loom-board-heading"><p>{subject}</p><h1>{title}</h1><span aria-hidden="true" /></header>
}

function EmptyBoard() {
  return <section className="loom-generation-board loom-empty-board"><div><strong>Start with a question</strong><p>Select Start a conversation in the voice bar. Loom will listen, choose a form, and build it here.</p></div></section>
}

function GenerationBoard({ step }) {
  return <section className="loom-generation-board" aria-live="polite"><div className="loom-generation-mark"><WandSparkles size={25} /></div><div><strong>{step.status}</strong><p>{step.detail}</p></div><div className="loom-generation-progress"><span className={step.id === 'understanding' || step.id === 'choosing' || step.id === 'generating' ? 'is-active' : ''} /><span className={step.id === 'choosing' || step.id === 'generating' ? 'is-active' : ''} /><span className={step.id === 'generating' ? 'is-active' : ''} /></div></section>
}

const motherboardSlots = [
  { x: 18, y: 25 }, { x: 76, y: 25 }, { x: 47, y: 47 },
  { x: 18, y: 70 }, { x: 76, y: 70 }, { x: 47, y: 80 },
]

function Motherboard({ state, sources = [] }) {
  const positions = Object.fromEntries(state.concepts.map((concept, index) => [concept.id, motherboardSlots[index] ?? motherboardSlots[motherboardSlots.length - 1]]))

  return <section className="loom-motherboard" aria-label="Conversation motherboard">
    <svg className="loom-motherboard-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id="loom-board-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" /></marker></defs>
      {state.connections.map((connection) => {
        const from = positions[connection.from]
        const to = positions[connection.to]
        if (!from || !to) return null
        const route = routeBoardConnection({ connection, from, positions, to })
        return <g key={`${connection.from}-${connection.to}-${connection.label}`}><path d={route.path} markerEnd="url(#loom-board-arrow)" /><text x={route.label.x} y={route.label.y}>{connection.label}</text></g>
      })}
    </svg>
    {state.concepts.map((concept) => <span key={concept.id} className={`loom-motherboard-concept loom-motherboard-concept-${concept.tone} ${state.focusedId === concept.id ? 'is-focused' : ''}`} style={{ '--x': `${positions[concept.id].x}%`, '--y': `${positions[concept.id].y}%` }}>{concept.label}</span>)}
    {state.formulas.length > 0 && <div className="loom-motherboard-formulas">{state.formulas.map((formula) => <article key={formula.id}><span>{formula.label}</span><strong>{formula.notation}</strong></article>)}</div>}
    {sources.length > 0 && <section className="loom-motherboard-sources" aria-label="Sources"><strong>Sources</strong><div>{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" title={source.url}>{source.title}</a>)}</div></section>}
    {state.page > 1 && <span className="loom-motherboard-page">Board {state.page}</span>}
  </section>
}

function ArtifactStage({ children, state }) {
  const concepts = state.concepts.slice(-4)
  const formulas = state.formulas.slice(-1)

  return <section className="loom-artifact-stage">
    <section className="loom-artifact-thread" aria-label="Thread so far">
      <strong>Thread so far</strong>
      <div>
        {concepts.map((concept) => <span key={concept.id} className={`loom-artifact-thread-concept loom-motherboard-concept-${concept.tone}`}>{concept.label}</span>)}
        {formulas.map((formula) => <span key={formula.id} className="loom-artifact-thread-formula">{formula.notation}</span>)}
      </div>
    </section>
    {children}
  </section>
}

function uniqueSources(sources) {
  const seen = new Set()
  return sources.filter((source) => {
    if (!source?.url || seen.has(source.url)) return false
    seen.add(source.url)
    return true
  }).slice(-4)
}

function routeBoardConnection({ connection, from, positions, to }) {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  const length = Math.hypot(deltaX, deltaY)
  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const blocker = Object.values(positions)
    .filter((point) => point !== from && point !== to)
    .find((point) => distanceToSegment(point, from, to) < 9)

  if (!blocker || length === 0) {
    return { label: { x: midpoint.x, y: midpoint.y - 2 }, path: `M ${from.x} ${from.y} L ${to.x} ${to.y}` }
  }

  const normal = { x: -deltaY / length, y: deltaX / length }
  const labelHash = [...`${connection.from}-${connection.to}`].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  const direction = labelHash % 2 === 0 ? 1 : -1
  const control = { x: midpoint.x + normal.x * 14 * direction, y: midpoint.y + normal.y * 14 * direction }

  return {
    label: { x: (from.x + 2 * control.x + to.x) / 4, y: (from.y + 2 * control.y + to.y) / 4 - 1.5 },
    path: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
  }
}

function distanceToSegment(point, start, end) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = deltaX ** 2 + deltaY ** 2
  const progress = Math.max(0, Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared))
  return Math.hypot(point.x - (start.x + progress * deltaX), point.y - (start.y + progress * deltaY))
}

function ProjectileArtifact({ angle, velocity }) {
  const normalizedAngle = Math.max(10, Math.min(angle, 80))
  const normalizedVelocity = Math.max(10, Math.min(velocity, 50))
  const peakX = 50 + (normalizedAngle - 45) * 0.35
  const peakY = 20 + (50 - normalizedVelocity) * 0.35
  const endY = 82
  const curvePeakX = (7 + 2 * peakX + 94) / 4
  const curvePeakY = (endY + peakY) / 2
  const path = `M 7 ${endY} Q ${peakX} ${peakY} 94 ${endY}`

  return <section className="loom-artifact-area" aria-label="Projectile simulator"><svg viewBox="0 0 100 100" role="img" aria-label="Projectile trajectory simulation"><defs><linearGradient id="loom-trajectory-gradient" x1="0%" x2="100%"><stop offset="0%" stopColor="#c2694a" /><stop offset="52%" stopColor="#d4a24a" /><stop offset="100%" stopColor="#8ea787" /></linearGradient></defs>{Array.from({ length: 10 }, (_, index) => <line key={`v-${index}`} x1={index * 10} y1="8" x2={index * 10} y2="88" />)}{Array.from({ length: 9 }, (_, index) => <line key={`h-${index}`} x1="4" y1={10 + index * 10} x2="97" y2={10 + index * 10} />)}<line className="loom-ground" x1="7" y1={endY} x2="94" y2={endY} /><path d={path} className="loom-trajectory" /><circle cx="7" cy={endY} r="1.35" className="loom-launch" /><circle cx={curvePeakX} cy={curvePeakY} r="1.15" className="loom-peak" /><circle cx="94" cy={endY} r="1.35" className="loom-landing" /><text x="8.5" y={endY - 1.5}>launch</text><text x={curvePeakX + 1.5} y={curvePeakY - 1.2}>peak</text><text x="88" y={endY - 1.5}>landing</text></svg></section>
}

function PlotArtifact({ plot, values }) {
  const xToScreen = (value) => 12 + ((value - plot.xAxis.min) / (plot.xAxis.max - plot.xAxis.min)) * 80
  const yToScreen = (value) => 86 - ((value - plot.yAxis.min) / (plot.yAxis.max - plot.yAxis.min)) * 72
  const series = plot.series.map((item) => ({ ...item, points: getPlotPoints(item, plot, values) }))

  return <section className="loom-artifact-area loom-plot-area" aria-label={plot.title}>
    <svg viewBox="0 0 100 100" role="img" aria-label={plot.title}>
      {Array.from({ length: 6 }, (_, index) => <line key={`plot-v-${index}`} x1={12 + index * 16} y1="14" x2={12 + index * 16} y2="86" />)}
      {Array.from({ length: 6 }, (_, index) => <line key={`plot-h-${index}`} x1="12" y1={14 + index * 14.4} x2="92" y2={14 + index * 14.4} />)}
      <line className="loom-plot-axis" x1="12" y1="86" x2="94" y2="86" />
      <line className="loom-plot-axis" x1="12" y1="88" x2="12" y2="11" />
      {series.map((item) => <path key={item.id} className={`loom-plot-series loom-plot-series-${item.tone}`} d={toPlotPath(item.points, xToScreen, yToScreen)} />)}
      {plot.annotations.map((annotation) => <text className="loom-plot-annotation" key={`${annotation.label}-${annotation.x}-${annotation.y}`} x={xToScreen(annotation.x)} y={yToScreen(annotation.y)}>{annotation.label}</text>)}
      <text className="loom-plot-axis-label" x="52" y="97" textAnchor="middle">{plot.xAxis.label}</text>
      <text className="loom-plot-axis-label" x="4" y="53" transform="rotate(-90 4 53)" textAnchor="middle">{plot.yAxis.label}</text>
      {series.map((item, index) => <text className={`loom-plot-legend loom-plot-legend-${item.tone}`} key={`legend-${item.id}`} x="16" y={6 + index * 4}>{item.label}</text>)}
    </svg>
  </section>
}

function getPlotPoints(series, plot, values) {
  if (series.points) return series.points

  const formula = { ...series.formula }
  for (const control of plot.controls) {
    if (control.seriesId === series.id && values[control.id] !== undefined) formula[control.coefficient] = values[control.id]
  }

  return Array.from({ length: 49 }, (_, index) => {
    const x = plot.xAxis.min + ((plot.xAxis.max - plot.xAxis.min) * index) / 48
    return [x, evaluateFormula(formula, x)]
  })
}

function evaluateFormula(formula, x) {
  if (formula.kind === 'linear') return formula.slope * x + formula.intercept
  if (formula.kind === 'quadratic') return formula.a * x ** 2 + formula.b * x + formula.c
  return formula.a * formula.base ** x + formula.verticalShift
}

function toPlotPath(points, xToScreen, yToScreen) {
  return points
    .filter(([, y]) => Number.isFinite(y))
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${xToScreen(x)} ${yToScreen(y)}`)
    .join(' ')
}

function ConnectionMap({ map }) {
  const nodeById = Object.fromEntries(map.nodes.map((node) => [node.id, node]))
  return <section className="loom-artifact-area loom-map-area" aria-label="Narrative connection map"><svg viewBox="0 0 740 420" role="img" aria-label="Connection map for free will and determinism"><defs><marker id="loom-map-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" /></marker></defs>{map.links.map((link) => { const from = nodeById[link.from]; const to = nodeById[link.to]; const deltaX = to.x - from.x; const deltaY = to.y - from.y; const distance = Math.hypot(deltaX, deltaY); const nodeOffset = 53; return <line key={`${link.from}-${link.to}`} className="loom-map-link" x1={from.x + (deltaX / distance) * nodeOffset} y1={from.y + (deltaY / distance) * nodeOffset} x2={to.x - (deltaX / distance) * nodeOffset} y2={to.y - (deltaY / distance) * nodeOffset} markerEnd="url(#loom-map-arrow)" /> })}{map.nodes.map((node) => <g key={node.id} className={`loom-map-node loom-map-node-${node.tone}`}><circle cx={node.x} cy={node.y} r="46" /><text x={node.x} y={node.y + 5} textAnchor="middle">{node.label}</text></g>)}</svg></section>
}

function ControlArea({ angle, insight, velocity, onAngleChange, onVelocityChange }) {
  return <section className="loom-control-area"><Control label="Launch angle" value={`${angle} deg`}><Slider value={[angle]} onValueChange={onAngleChange} min={10} max={80} step={1} /></Control><Control label="Initial velocity" value={`${velocity} m/s`}><Slider value={[velocity]} onValueChange={onVelocityChange} min={10} max={50} step={1} /></Control><article className="loom-board-note"><strong>Read the change</strong><p>{insight ?? 'A higher angle raises the peak. More speed increases both height and range.'}</p></article></section>
}

function PlotControlArea({ controls, onChange, values }) {
  if (controls.length === 0) return <section className="loom-plot-caption"><strong>Read the relationship</strong><p>Follow the curve from left to right and notice how the values change together.</p></section>

  return <section className="loom-control-area loom-plot-controls">
    {controls.map((control) => <Control key={control.id} label={control.label} value={`${values[control.id]}${control.unit}`}><Slider value={[values[control.id]]} onValueChange={(nextValue) => onChange(control.id, nextValue[0])} min={control.min} max={control.max} step={control.step} /></Control>)}
    <article className="loom-board-note"><strong>Try a value</strong><p>Move a control, then ask Loom what you notice.</p></article>
  </section>
}

function MapReadingPath({ items }) { return <section className="loom-map-reading"><strong>Follow the thread</strong><ol>{items.map((item) => <li key={item}>{item}</li>)}</ol></section> }
function Control({ children, label, value }) { return <label className="loom-control"><span><strong>{label}</strong><b>{value}</b></span>{children}</label> }

function Transcript({ checks, choiceText, onDismissCheck, onOpenEntry, sessionId, turns }) {
  const [selectedEntry, setSelectedEntry] = useState(null)
  const entries = turns.map((turn) => ({ ...turn.transcript, text: turn.id === 'choosing' && choiceText ? choiceText : turn.transcript.text, time: turn.time }))

  useEffect(() => {
    setSelectedEntry(null)
  }, [sessionId])

  const openEntry = (entry) => {
    onOpenEntry()
    setSelectedEntry(entry)
  }

  return <>
    <div className="loom-side-stack">
      <aside className="loom-transcript" aria-label="Transcript">
        <header>
          <h2>Transcript</h2>
          <div className="loom-transcript-header-actions">
            <span className="loom-transcript-live">Live</span>
          </div>
        </header>
        <div className="loom-transcript-list">
          {entries.length === 0
            ? <p className="loom-transcript-empty">Your spoken conversation will appear here.</p>
            : entries.map((entry) => <TranscriptEntry key={`${entry.speaker}-${entry.time}`} entry={entry} preview onOpen={() => openEntry(entry)} />)}
        </div>
      </aside>
      <section className="loom-comprehension-checks" aria-label="Comprehension checks">
        <header><p>Check your understanding</p><span>{checks.filter((check) => check.isResolved).length}/{checks.length}</span></header>
        <div>{checks.length === 0
          ? <p className="loom-comprehension-empty">Questions will appear as the conversation develops.</p>
          : checks.map((check) => <article className={`loom-comprehension-check ${check.isResolved ? 'is-resolved' : ''}`} key={check.id}>
          <p>{check.question}</p>
          {check.isResolved
            ? <span className="loom-comprehension-check-complete" aria-label="Answered"><Check size={15} /></span>
            : <button type="button" className="loom-icon-control" onClick={() => onDismissCheck(check.id)} aria-label={`Hide question: ${check.question}`} title="Hide question"><X size={15} /></button>}
        </article>)}</div>
      </section>
    </div>
    {selectedEntry && <div className="loom-transcript-modal" role="presentation" onClick={() => setSelectedEntry(null)}>
      <section role="dialog" aria-modal="true" aria-label={`${selectedEntry.speaker} message`} onClick={(event) => event.stopPropagation()}>
        <header>
          <div><p>{selectedEntry.speaker}</p><h2>{selectedEntry.time}</h2></div>
          <button type="button" className="loom-icon-control" onClick={() => setSelectedEntry(null)} aria-label="Close message" title="Close message"><X size={17} /></button>
        </header>
        <div className="loom-transcript-modal-list"><TranscriptEntry entry={selectedEntry} /></div>
      </section>
    </div>}
  </>
}

function TranscriptEntry({ entry, preview = false, onOpen }) {
  const speakerClass = entry.speaker === 'Loom' ? 'loom-speaker-loom' : 'loom-speaker-learner'
  const text = preview ? getTranscriptPreview(entry.text) : entry.text
  const content = <><span className="loom-transcript-entry-meta"><strong>{entry.speaker}</strong><time>{entry.time}</time></span><span className="loom-transcript-entry-text">{text}</span></>

  return onOpen
    ? <button type="button" className={`loom-transcript-entry loom-transcript-preview ${speakerClass}`} onClick={onOpen} aria-label={`Open full message from ${entry.speaker}`}>{content}</button>
    : <article className={`loom-transcript-entry ${speakerClass}`}>{content}</article>
}

function getTranscriptPreview(text) {
  const limit = 72
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}...` : text
}

function addMapLayout(map) {
  return {
    ...map,
    nodes: map.nodes.map((node, index) => ({ ...node, ...mapLayout[index] })),
  }
}

function getPlotControlDefaults(plot) {
  return Object.fromEntries(plot.controls.map((control) => {
    const series = plot.series.find((item) => item.id === control.seriesId)
    return [control.id, series.formula[control.coefficient]]
  }))
}

export default App
