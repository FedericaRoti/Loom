import { Milestone, WandSparkles } from 'lucide-react'

const nodeFill = {
  cool: '#edf3ef',
  dark: '#ffffff',
  green: '#edf3ef',
  neutral: '#f5f1e8',
  warm: '#f9eee9',
}

function ConnectionMap({ artifactReady, map }) {
  const nodeById = Object.fromEntries(map.nodes.map((node) => [node.id, node]))

  return (
    <section className="loom-artifact loom-map-artifact">
      <div className="min-w-0">
        <div className="loom-drawing-surface relative overflow-hidden">
          {!artifactReady && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#fffdf9]/90 px-6 text-center backdrop-blur-sm">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0e3b43] text-white">
                  <WandSparkles size={24} />
                </div>
                <p className="mt-4 text-lg font-semibold text-[#0e3b43]">Building the connection map</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#58706f]">
                  Loom is choosing narrative nodes, links, and a reading path before revealing the map.
                </p>
              </div>
            </div>
          )}

          <svg className="h-[420px] w-full" viewBox="0 0 740 420" role="img" aria-label="Connection map for free will and determinism">
            <rect x="0" y="0" width="740" height="420" fill="#fffdf9" />
            <rect x="248" y="142" width="244" height="94" rx="16" fill="#ffffff" stroke="#0e3b43" strokeOpacity="0.08" />
            {map.links.map((link) => {
              const from = nodeById[link.from]
              const to = nodeById[link.to]
              const midX = (from.x + to.x) / 2
              const midY = (from.y + to.y) / 2

              return (
                <g key={`${link.from}-${link.to}`}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#b8b0a2" strokeWidth="2.5" />
                  <rect x={midX - 60} y={midY - 13} width="120" height="26" rx="13" fill="#fffdf9" stroke="#ded7cb" />
                  <text x={midX} y={midY + 4} textAnchor="middle" className="fill-[#58706f] text-[11px] font-semibold">
                    {link.label}
                  </text>
                </g>
              )
            })}
            {map.nodes.map((node) => (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={46} fill={nodeFill[node.tone] ?? nodeFill.neutral} stroke="#0e3b43" strokeOpacity="0.18" strokeWidth="2" />
                <text x={node.x} y={node.y + 4} textAnchor="middle" className="fill-[#0e3b43] text-[13px] font-bold">
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <aside className="loom-artifact-rail loom-map-rail">
        <p className="loom-artifact-rail-title">Reading path</p>
        <div className="loom-map-summary">
          <p className="text-sm font-semibold text-[#0e3b43]">{map.title}</p>
          <p className="mt-2 text-sm leading-6 text-[#58706f]">{map.lens}</p>
        </div>
        <div className="loom-reading-path">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#c86a4a]">
            <Milestone size={16} />
            Reading path
          </div>
          <ol className="mt-2 space-y-2">
            {map.readingPath.map((item, index) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-[#2b2b2b]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0e3b43] text-xs font-semibold text-white">{index + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </section>
  )
}

export default ConnectionMap
