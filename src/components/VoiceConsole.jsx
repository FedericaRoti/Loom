import { ChevronLeft, ChevronRight, Mic, MicOff, Pause, Play, RotateCcw, Square, Volume2, WandSparkles } from 'lucide-react'

function VoiceConsole({
  currentStep,
  isFirstStep,
  isLastStep,
  isPlaying,
  onBack,
  onEndSession,
  onForward,
  onRestart,
  onToggle,
  progress,
  replyState,
  speechPlayback,
  spokenReply,
  voiceRecorder,
  voiceStatus,
}) {
  const isGenerating = currentStep.id === 'generating'
  const isActive = isPlaying || voiceRecorder.isRecording || speechPlayback.isPlaying
  const activityLabel = voiceRecorder.isRecording
    ? 'Loom is listening...'
    : voiceRecorder.isTranscribing
      ? 'Loom is transcribing...'
      : replyState.isResponding
        ? 'Loom is thinking...'
        : speechPlayback.isPlaying
          ? 'Loom is speaking...'
          : isPlaying
            ? currentStep.voiceState
            : 'Loom is paused'
  const hasError = Boolean(replyState.error || voiceRecorder.error || speechPlayback.error)

  return (
    <section className="loom-voice-console" aria-label="Voice guide">
      <div className="loom-voice-state">
        <span className="loom-voice-orb" aria-hidden="true">
          {isGenerating ? <WandSparkles size={16} /> : <Mic size={16} />}
          {isActive && <span className="loom-voice-pulse" />}
        </span>
        <div className="loom-voice-copy">
          <p className="loom-voice-label">{activityLabel}</p>
          <p className="loom-voice-detail">{hasError ? 'Voice needs attention' : currentStep.status}</p>
        </div>
      </div>
      <div className={`loom-waveform ${isActive ? 'loom-waveform-active' : ''}`} aria-hidden="true">
        {[9, 14, 20, 12, 17, 10, 15].map((height, index) => (
          <span key={index} style={{ height }} />
        ))}
      </div>
      <div className="loom-voice-actions">
        <button
          type="button"
          onClick={voiceRecorder.isRecording ? voiceRecorder.stopRecording : voiceRecorder.startRecording}
          className={`loom-icon-button ${voiceRecorder.isRecording ? 'loom-icon-button-recording' : ''}`}
          aria-label={voiceRecorder.isRecording ? 'Stop recording' : voiceStatus.isReal ? 'Record voice' : 'Add mock voice input'}
          title={voiceRecorder.isRecording ? 'Stop recording' : voiceStatus.isReal ? 'Record voice' : 'Add mock voice input'}
        >
          {voiceRecorder.isRecording ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <button
          type="button"
          onClick={() => speechPlayback.playSpeech(spokenReply)}
          disabled={!spokenReply || speechPlayback.isLoading}
          className="loom-icon-button"
          aria-label={voiceStatus.isReal ? 'Play Loom voice' : 'Play browser mock voice'}
          title={voiceStatus.isReal ? 'Play Loom voice' : 'Play browser mock voice'}
        >
          <Volume2 size={17} />
        </button>
        <button type="button" onClick={speechPlayback.stopSpeech} className="loom-icon-button" aria-label="Interrupt Loom" title="Interrupt Loom"><Square size={14} /></button>
        <button type="button" onClick={onEndSession} className="loom-icon-button loom-end-session" aria-label="End session" title="End session"><Pause size={16} /></button>
        <details className="loom-demo-controls">
          <summary aria-label="Demo controls" title="Demo controls"><Play size={14} /></summary>
          <div>
            <button type="button" onClick={onToggle} className="loom-icon-button" aria-label={isPlaying ? 'Pause demo sequence' : 'Play demo sequence'} title={isPlaying ? 'Pause demo sequence' : 'Play demo sequence'}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button type="button" onClick={onBack} disabled={isFirstStep} className="loom-icon-button" aria-label="Previous demo step" title="Previous demo step"><ChevronLeft size={16} /></button>
            <button type="button" onClick={onRestart} className="loom-icon-button" aria-label="Restart demo sequence" title="Restart demo sequence"><RotateCcw size={15} /></button>
            <button type="button" onClick={onForward} disabled={isLastStep} className="loom-icon-button" aria-label="Next demo step" title="Next demo step"><ChevronRight size={16} /></button>
          </div>
        </details>
      </div>
      <span className="loom-sequence-progress" aria-label={`Demo progress: ${Math.round(progress)} percent`}><span style={{ width: `${progress}%` }} /></span>
    </section>
  )
}

export default VoiceConsole
