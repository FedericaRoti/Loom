function SessionSwitcher({ activeSessionId, sessions, onChange }) {
  return (
    <div className="loom-scene-switcher" aria-label="Study scene switcher">
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId

        return (
          <button
            key={session.id}
            type="button"
            onClick={() => onChange(session.id)}
            className={`loom-scene-switcher-button ${
              isActive ? 'loom-scene-switcher-button-active' : ''
            }`}
          >
            <span className="loom-session-index">{String(sessions.indexOf(session) + 1).padStart(2, '0')}</span>
            <span className="loom-session-copy">
              <strong>{session.label}</strong>
              <small>{isActive ? 'Current session' : 'Open session'}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default SessionSwitcher
