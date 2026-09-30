import { cn } from '@/lib/cn'
import type { ValveState, WaterStatus } from '@/types'

export function PipeDiagram({ flow, valve, status, pressure }: { flow: number; valve: ValveState; status: WaterStatus; pressure: number }) {
  const flowing = flow > 0.02
  const closed = valve === 'closed'
  const moving = valve === 'closing' || valve === 'opening'
  const upstreamColor = status === 'leak' && !closed ? '#fb7185' : '#22d3ee'
  const downstreamColor = closed ? '#3f3f46' : upstreamColor
  const speed = flowing ? Math.max(0.25, 1.4 - flow / 8) : 0
  const valveColor = closed ? '#fb7185' : moving ? '#fbbf24' : '#34d399'
  return (
    <svg viewBox="0 0 640 150" className="mx-auto max-h-44 w-full" role="img" aria-label={`Main water line: flow ${flow.toFixed(1)} GPM, valve ${valve}`}>
      <defs>
        <linearGradient id="pipe" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="0.5" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <text x="24" y="40" fontSize="11" fill="#71717a">Street supply</text>
      <text x="24" y="54" fontSize="11" fill="#a1a1aa" className="tabular">{pressure.toFixed(0)} psi</text>
      <rect x="20" y="66" width="560" height="22" rx="11" fill="url(#pipe)" stroke="#1f2937" />
      <line x1="30" x2="360" y1="77" y2="77" stroke={upstreamColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="8 10" opacity={flowing || !closed ? 0.85 : 0.35} style={flowing ? { animation: `flow ${speed}s linear infinite` } : undefined} />
      <line x1="360" x2="560" y1="77" y2="77" stroke={downstreamColor} strokeWidth="4" strokeLinecap="round" strokeDasharray="8 10" opacity={closed ? 0.5 : 0.85} style={flowing && !closed ? { animation: `flow ${speed}s linear infinite` } : undefined} />
      <g transform="translate(190 52)">
        <rect width="80" height="50" rx="10" fill="#0b1220" stroke={flowing ? '#22d3ee' : '#334155'} strokeWidth="1.5" />
        <text x="40" y="22" textAnchor="middle" fontSize="15" fontWeight="600" fill="#f4f4f5" className="tabular">
          {flow.toFixed(1)}
        </text>
        <text x="40" y="37" textAnchor="middle" fontSize="9" fill="#a1a1aa">GPM</text>
      </g>
      <text x="230" y="124" textAnchor="middle" fontSize="11" fill="#a1a1aa">Flow sensor</text>
      <g transform="translate(360 77)">
        <circle r="24" fill="#0b1220" stroke={valveColor} strokeWidth="2" />
        <g className={cn(moving && 'animate-pulse')} style={{ transform: `rotate(${closed || valve === 'closing' ? 90 : 0}deg)`, transition: 'transform 3s ease-in-out' }}>
          <rect x="-16" y="-3.5" width="32" height="7" rx="3.5" fill={valveColor} />
        </g>
        <circle r="4" fill="#0b1220" stroke={valveColor} strokeWidth="1.5" />
      </g>
      <text x="360" y="124" textAnchor="middle" fontSize="11" fill="#a1a1aa">Shut-off valve</text>
      <text x="360" y="138" textAnchor="middle" fontSize="10" fontWeight="600" fill={valveColor}>
        {valve.toUpperCase()}
      </text>
      <g transform="translate(560 40)">
        <path d="M0 30 L32 6 L64 30 V78 H0Z" fill="#0b1220" stroke={closed ? '#3f3f46' : '#334155'} strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="24" y="52" width="16" height="26" rx="2" fill="#1e293b" />
        {status === 'leak' && (
          <g>
            <path d="M48 58 q4 6 0 9 q-4 -3 0 -9Z" fill="#38bdf8" />
            <path d="M14 60 q3 5 0 7 q-3 -2 0 -7Z" fill="#38bdf8" opacity="0.8" />
          </g>
        )}
      </g>
      <text x="592" y="136" textAnchor="middle" fontSize="11" fill="#a1a1aa">Home</text>
    </svg>
  )
}
