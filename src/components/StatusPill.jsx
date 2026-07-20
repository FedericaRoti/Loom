function StatusPill({ icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#171717]/10 bg-white px-3 py-2 text-sm font-medium shadow-sm">
      {icon}
      <span>{label}</span>
    </div>
  )
}

export default StatusPill
