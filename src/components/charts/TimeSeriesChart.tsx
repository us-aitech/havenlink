import { useId, useState, type PointerEvent } from 'react'
import { CHART_INK, SERIES, STATUS } from './palette'
import { ChartTooltip } from './Tooltip'
import { useWidth } from './useWidth'

export interface TimePoint {
  t: number
  v: number
}

interface Props {
  data: TimePoint[]
  height?: number
  yMax?: number
  unit: string
  color?: string
  threshold?: { value: number; label: string }
  formatValue?: (v: number) => string
  formatTime?: (t: number, now: number) => string
  label: string
}

const PAD = { top: 12, right: 12, bottom: 22, left: 34 }

function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(v))
  const n = v / exp
  const nice = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => n <= step) ?? 10
  return nice * exp
}

function defaultTime(t: number, now: number): string {
  const s = Math.round((now - t) / 1000)
  return s <= 1 ? 'now' : `-${s}s`
}

export function TimeSeriesChart({ data, height = 180, yMax, unit, color = SERIES[0], threshold, formatValue = (v) => v.toFixed(1), formatTime = defaultTime, label }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const maxV = niceMax(yMax ?? Math.max(threshold ? threshold.value * 1.15 : 0, ...data.map((d) => d.v), 1))
  const t0 = data[0]?.t ?? 0
  const t1 = data[data.length - 1]?.t ?? 1
  const x = (t: number) => PAD.left + (t1 === t0 ? 0 : ((t - t0) / (t1 - t0)) * innerW)
  const y = (v: number) => PAD.top + innerH - (Math.min(v, maxV) / maxV) * innerH
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.t).toFixed(1)},${y(d.v).toFixed(1)}`).join('')
  const area = data.length ? `${line}L${x(t1).toFixed(1)},${y(0)}L${x(t0).toFixed(1)},${y(0)}Z` : ''
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV)
  const xTicks = data.length > 1 ? [0, 0.25, 0.5, 0.75, 1].map((f) => t0 + f * (t1 - t0)) : []
  const hovered = hover !== null ? data[hover] : null

  function onMove(e: PointerEvent<SVGRectElement>) {
    if (!data.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / innerW))
    const target = t0 + ratio * (t1 - t0)
    let best = 0
    for (let i = 1; i < data.length; i++) if (Math.abs(data[i].t - target) < Math.abs(data[best].t - target)) best = i
    setHover(best)
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          <defs>
            <linearGradient id={`g-${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.18 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} style={{ stroke: v === 0 ? CHART_INK.axis : CHART_INK.grid }} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="10" style={{ fill: CHART_INK.label }} className="tabular">
                {Number.isInteger(v) ? v : v.toFixed(1)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text key={i} x={x(t)} y={height - 6} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} fontSize="10" style={{ fill: CHART_INK.label }}>
              {formatTime(t, t1)}
            </text>
          ))}
          {threshold && threshold.value <= maxV && (
            <g>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(threshold.value)} y2={y(threshold.value)} style={{ stroke: STATUS.critical }} strokeDasharray="4 4" strokeWidth="1.5" />
              <text x={width - PAD.right} y={y(threshold.value) - 6} textAnchor="end" fontSize="10" fontWeight="500" style={{ fill: 'var(--critical-fg)' }}>
                {threshold.label}
              </text>
            </g>
          )}
          <path d={area} fill={`url(#g-${gid})`} />
          <path d={line} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hovered && (
            <g>
              <line x1={x(hovered.t)} x2={x(hovered.t)} y1={PAD.top} y2={PAD.top + innerH} style={{ stroke: CHART_INK.crosshair }} />
              <circle cx={x(hovered.t)} cy={y(hovered.v)} r="4.5" style={{ fill: color, stroke: CHART_INK.surface }} strokeWidth="2" />
            </g>
          )}
          <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}
      {hovered && (
        <ChartTooltip x={x(hovered.t)} y={y(hovered.v)} width={width}>
          <div className="text-fg-3">{formatTime(hovered.t, t1)}</div>
          <div className="mt-0.5 font-semibold text-fg tabular">
            {formatValue(hovered.v)} <span className="font-normal text-fg-3">{unit}</span>
          </div>
        </ChartTooltip>
      )}
    </div>
  )
}
