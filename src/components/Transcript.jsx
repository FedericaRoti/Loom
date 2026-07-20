import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const modeLabels = {
  mock: 'mock input',
  'mock reply': 'mock reply',
  'model reply': 'model reply',
  spoken: 'spoken input',
  transcribed: 'transcribed input',
  voice: 'voice reply',
}

function Transcript({ entries, onClose }) {
  const latestEntryRef = useRef(null)
  const groupedEntries = entries.reduce((groups, entry, index) => {
    const existing = groups.find((group) => group.speaker === entry.speaker)

    if (existing) {
      existing.text.push(entry.text)
      existing.mode = entry.mode
      existing.index = index
      return groups
    }

    groups.push({ ...entry, index, text: [entry.text] })
    return groups
  }, [])

  useEffect(() => {
    latestEntryRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [entries.length])

  return (
    <aside id="loom-transcript" className="loom-transcript" aria-label="Transcript">
      <div className="loom-transcript-heading">
        <div>
          <h2>Transcript</h2>
          <p>Spoken exchange, kept in view.</p>
        </div>
        <button type="button" className="loom-icon-button" onClick={onClose} aria-label="Close transcript" title="Close transcript"><X size={16} /></button>
      </div>
      <div className="loom-transcript-list">
        {groupedEntries.map((entry) => {
          const isLatest = entry.index === entries.length - 1
          const isLoom = entry.speaker === 'Loom'

          return (
            <article
              key={entry.speaker}
              ref={isLatest ? latestEntryRef : null}
              className={`loom-transcript-entry ${
                isLatest ? 'loom-transcript-entry-current' : isLoom ? 'loom-transcript-entry-loom' : 'loom-transcript-entry-learner'
              }`}
            >
              <div className="loom-transcript-entry-meta">
                <span className={`loom-transcript-speaker ${isLoom ? 'loom-transcript-speaker-loom' : ''}`}>{entry.speaker}</span>
                <span>{isLatest ? 'Now' : modeLabels[entry.mode] ?? entry.mode}</span>
              </div>
              <p>{entry.text.join('\n\n')}</p>
            </article>
          )
        })}
      </div>
    </aside>
  )
}

export default Transcript
