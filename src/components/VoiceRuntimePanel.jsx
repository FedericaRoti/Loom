import { Radio, ShieldCheck } from 'lucide-react'

function VoiceRuntimePanel({ runtime, status }) {
  return (
    <section className="rounded-lg border border-[#171717]/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#7b3f2f]">
            <Radio size={18} />
            <p className="text-sm font-semibold uppercase tracking-[0.08em]">Voice runtime</p>
          </div>
          <h2 className="mt-1 text-xl font-semibold">{status.label}</h2>
          <p className="mt-1 text-sm leading-6 text-[#605b52]">{status.detail}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#edf7f2] px-3 py-2 text-sm font-semibold text-[#23634b]">
          <ShieldCheck size={16} />
          Mock fallback preserved
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <RuntimeMetric label="Artifact plan" value={runtime.artifactPlannerModel} />
        <RuntimeMetric label="Conversation" value={runtime.conversationModel} />
        <RuntimeMetric label="Realtime" value={runtime.realtimeModel} />
        <RuntimeMetric label="STT" value={runtime.transcriptionModel} />
        <RuntimeMetric label="TTS" value={runtime.ttsModel} />
      </div>
    </section>
  )
}

function RuntimeMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f8f6f0] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7b3f2f]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#171717]">{value}</p>
    </div>
  )
}

export default VoiceRuntimePanel
