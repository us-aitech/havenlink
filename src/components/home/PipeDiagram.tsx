import { cn } from '@/lib/cn'
import type { ValveState, WaterStatus } from '@/types'

const VALVE_STROKE: Record<ValveState, string> = {
  open: 'stroke-good',
  opening: 'stroke-warning',
  closing: 'stroke-warning',
  closed: 'stroke-critical',
}

const VALVE_FILL: Record<ValveState, string> = {
  open: 'fill-good',
  opening: 'fill-warning',
  closing: 'fill-warning',
  closed: 'fill-critical',
}

const VALVE_TEXT: Record<ValveState, string> = {
  open: 'text-good-fg',
  opening: 'text-warning-fg',
  closing: 'text-warning-fg',
  closed: 'text-critical-fg',
}

const VALVE_LABEL: Record<ValveState, string> = {
  open: 'Open',
  opening: 'Opening',
  closing: 'Closing',
  closed: 'Closed',
}

const Y = 70

function polar(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) }
}

function Gauge({ pressure }: { pressure: number }) {
  const needle = polar(-120 + (Math.max(0, Math.min(100, pressure)) / 100) * 240, 11)
  const a = polar(-120, 13)
  const b = polar(120, 13)
  return (
    <g transform={`translate(80 ${Y})`}>
      <circle r="19" className="fill-surface stroke-border-strong" strokeWidth="1.5" />
      <path d={`M${a.x},${a.y} A13,13 0 1 1 ${b.x},${b.y}`} className="fill-none stroke-border" strokeWidth="2" strokeLinecap="round" />
      <line x1="0" y1="0" x2={needle.x} y2={needle.y} className="stroke-fg-2" strokeWidth="2" strokeLinecap="round" style={{ transition: 'all 0.6s ease' }} />
      <circle r="2.5" className="fill-fg-2" />
    </g>
  )
}

function FlowSensor({ flowing, speed }: { flowing: boolean; speed: number }) {
  return (
    <g transform={`translate(240 ${Y})`}>
      <rect x="-27" y="-21" width="54" height="42" rx="10" className={cn('fill-surface', flowing ? 'stroke-info' : 'stroke-border-strong')} strokeWidth="1.5" />
      <g>
        {flowing && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={`${speed * 2}s`} repeatCount="indefinite" />}
        {[0, 120, 240].map((deg) => (
          <path key={deg} d="M0,-1.5 C4,-4 4.5,-9.5 0.5,-11.5 C-2.5,-9 -2.5,-4.5 0,-1.5Z" transform={`rotate(${deg})`} className={flowing ? 'fill-info' : 'fill-fg-4'} />
        ))}
        <circle r="2.4" className="fill-surface stroke-fg-3" strokeWidth="1" />
      </g>
    </g>
  )
}

function Valve({ valve }: { valve: ValveState }) {
  const moving = valve === 'closing' || valve === 'opening'
  const turned = valve === 'closed' || valve === 'closing'
  return (
    <g transform={`translate(400 ${Y})`}>
      <circle r="23" className={cn('fill-surface', VALVE_STROKE[valve])} strokeWidth="2" />
      <g className={cn(moving && 'animate-pulse')} style={{ transform: `rotate(${turned ? 90 : 0}deg)`, transition: 'transform 3s ease-in-out' }}>
        <rect x="-15" y="-3.5" width="30" height="7" rx="3.5" className={VALVE_FILL[valve]} />
      </g>
      <circle r="4" className={cn('fill-surface', VALVE_STROKE[valve])} strokeWidth="1.5" />
    </g>
  )
}

function House({ leak }: { leak: boolean }) {
  return (
    <g>
      <path d="M526 48 L560 20 L594 48 V102 H526Z" className="fill-surface stroke-border-strong" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="551" y="78" width="18" height="24" rx="2" className="fill-surface-3" />
      {leak && (
        <g className="fill-info">
          <path d="M540 60 q5 7 0 10.5 q-5 -3.5 0 -10.5Z" />
          <path d="M580 66 q4 6 0 9 q-4 -3 0 -9Z" opacity="0.8" />
          <ellipse cx="560" cy="101" rx="22" ry="2.5" opacity="0.5" />
        </g>
      )}
    </g>
  )
}

function Caption({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0 px-1">
      <div className="truncate text-xs text-fg-3">{label}</div>
      <div className={cn('text-[13px] leading-5 font-medium text-fg tabular', valueClassName)}>{value}</div>
    </div>
  )
}

export function PipeDiagram({ flow, valve, status, pressure }: { flow: number; valve: ValveState; status: WaterStatus; pressure: number }) {
  const flowing = flow > 0.02
  const closed = valve === 'closed'
  const leak = status === 'leak'
  const water = leak && !closed ? 'stroke-critical' : 'stroke-info'
  const speed = flow > 5 ? 0.35 : flow > 1.5 ? 0.7 : 1.3
  const animation = { animation: `flow ${speed}s linear infinite` }
  const homeLabel = leak ? (closed ? 'Leak contained' : 'Leak detected') : closed ? 'Water off' : 'No leaks'

  return (
    <div className="mx-auto w-full max-w-2xl">
      <svg viewBox="0 10 640 100" className="block h-auto w-full" role="img" aria-label={`Main water line: ${flow.toFixed(1)} GPM, ${pressure.toFixed(0)} psi, valve ${valve}`}>
        <rect x="18" y={Y - 10} width="552" height="20" rx="10" className="fill-surface stroke-border-strong" strokeWidth="1" />
        <line x1="30" x2="400" y1={Y} y2={Y} className={water} strokeWidth="4" strokeLinecap="round" strokeDasharray="8 10" opacity={flowing ? 1 : 0.45} style={flowing ? animation : undefined} />
        <line
          x1="400"
          x2="526"
          y1={Y}
          y2={Y}
          className={closed ? 'stroke-border-strong' : water}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="8 10"
          opacity={closed || flowing ? 1 : 0.45}
          style={flowing && !closed ? animation : undefined}
        />
        <Gauge pressure={pressure} />
        <FlowSensor flowing={flowing} speed={speed} />
        <Valve valve={valve} />
        <House leak={leak} />
      </svg>
      <div className="mt-3 grid grid-cols-4 text-center">
        <Caption label="Pressure" value={`${pressure.toFixed(0)} psi`} />
        <Caption label="Flow sensor" value={`${flow.toFixed(1)} GPM`} valueClassName={flowing ? 'text-info-fg' : undefined} />
        <Caption label="Main valve" value={VALVE_LABEL[valve]} valueClassName={VALVE_TEXT[valve]} />
        <Caption label="Home" value={homeLabel} valueClassName={leak ? 'text-critical-fg' : undefined} />
      </div>
    </div>
  )
}
