import { Target } from 'lucide-react'

const icons = {
  target: <Target size={16} />,
}

function DemoBadge({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-[#171717]/10 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-[#7b3f2f]">
        {icons[icon]}
        <p className="text-xs font-semibold uppercase tracking-[0.08em]">{label}</p>
      </div>
      <p className="mt-1 text-sm font-semibold text-[#171717]">{value}</p>
    </div>
  )
}

export default DemoBadge
