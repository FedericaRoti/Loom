import { LineChart, WandSparkles } from 'lucide-react'

function ProjectileSimulator({ angle, artifactReady, insight, velocity, trajectory, onAngleChange, onVelocityChange }) {
  return (
    <section className="loom-artifact loom-projectile-artifact">
      <div className="min-w-0">
        <div className="loom-drawing-surface relative overflow-hidden">
          {!artifactReady && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#fffdf9]/90 px-6 text-center backdrop-blur-sm">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0e3b43] text-white">
                  <WandSparkles size={24} />
                </div>
                <p className="mt-4 text-lg font-semibold text-[#0e3b43]">Building the simulator</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#58706f]">
                  Loom is choosing controls, trajectory, and metrics before revealing the artifact.
                </p>
              </div>
            </div>
          )}
          <svg className="h-[360px] w-full" viewBox="0 0 740 340" role="img" aria-label="Projectile trajectory visualization">
            <defs>
              <linearGradient id="trajectory" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c86a4a" />
                <stop offset="100%" stopColor="#7f9b8a" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="740" height="340" fill="#fffdf9" />
            <g stroke="#e5ded1" strokeWidth="1">
              {Array.from({ length: 8 }, (_, index) => (
                <line key={`v-${index}`} x1={40 + index * 92} y1="24" x2={40 + index * 92} y2="302" />
              ))}
              {Array.from({ length: 5 }, (_, index) => (
                <line key={`h-${index}`} x1="34" y1={62 + index * 60} x2="706" y2={62 + index * 60} />
              ))}
            </g>
            <line x1="34" y1="302" x2="706" y2="302" stroke="#0e3b43" strokeWidth="2" />
            <path d={trajectory.path} fill="none" stroke="url(#trajectory)" strokeLinecap="round" strokeWidth="6" />
            <circle cx="34" cy="302" r="9" fill="#c86a4a" />
            {artifactReady && (
              <circle r="7" fill="#0e3b43">
                <animateMotion dur="4.2s" path={trajectory.path} repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={trajectory.peak.x} cy={trajectory.peak.y} r="7" fill="#0e3b43" />
            <circle cx={trajectory.landingX} cy="302" r="9" fill="#7f9b8a" />
            <text x="46" y="292" className="fill-[#0e3b43] text-[13px] font-semibold">launch</text>
            <text x={trajectory.peak.x + 10} y={trajectory.peak.y - 8} className="fill-[#0e3b43] text-[13px] font-semibold">peak</text>
            <text x={trajectory.landingX - 52} y="292" className="fill-[#0e3b43] text-[13px] font-semibold">landing</text>
          </svg>
        </div>
      </div>

      <aside className="loom-artifact-rail">
        <p className="loom-artifact-rail-title">Try changing</p>
        <Control label="Launch angle" value={angle} suffix="deg" min={15} max={75} onChange={onAngleChange} />
        <Control label="Initial velocity" value={velocity} suffix="m/s" min={10} max={40} onChange={onVelocityChange} />
        <div className="loom-insight">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#557565]">
            <LineChart size={16} />
            Read the change
          </div>
          <p className="mt-2 text-sm leading-6 text-[#2b2b2b]">{insight}</p>
        </div>
      </aside>
    </section>
  )
}

function Control({ label, value, suffix, min, max, onChange }) {
  return (
    <label className="loom-control">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="rounded-sm bg-[#0e3b43] px-2 py-1 text-sm font-semibold text-white">
          {value} {suffix}
        </span>
      </span>
      <input
        aria-label={label}
        className="mt-4 w-full accent-[#c86a4a]"
        type="range"
        min={min}
        max={max}
        value={value}
        onInput={(event) => onChange(Number(event.target.value))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export default ProjectileSimulator
