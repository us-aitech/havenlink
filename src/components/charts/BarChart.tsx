import { useState } from 'react'
import { CHART_INK, SERIES } from './palette'
import { ChartTooltip } from './Tooltip'
import { useWidth } from './useWidth'

export interface BarDatum {
  label: string
  value: number
  muted?: boolean
}

interface Props {
  data: BarDatum[]
  height?: number
  color?: string
  unit?: string
  formatValue?: (v: number) => string
  label: string
}

const PAD = { top: 18, right: 4, bottom: 22, left: 4 }

export function BarChart({ data, height = 160, color = SERIES[0], unit = '', formatValue = (v) => v.toLocaleString(), label }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const maxV = Math.max(...data.map((d) => d.value), 1) * 1.12
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const band = data.length ? innerW / data.length : 0
  const barW = Math.min(36, band * 0.6)
  const y = (v: number) => PAD.top + innerH - (v / maxV) * innerH
  const maxIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} style={{ stroke: CHART_INK.axis }} />
          {data.map((d, i) => {
            const cx = PAD.left + band * i + band / 2
            const top = y(d.value)
            const h = Math.max(0, y(0) - top)
            const r = Math.min(4, h)
            const left = cx - barW / 2
            const right = cx + barW / 2
            return (
              <g key={d.label} opacity={hover === null || hover === i ? 1 : 0.5}>
                <path d={`M${left},${y(0)}V${top + r}Q${left},${top} ${left + r},${top}H${right - r}Q${right},${top} ${right},${top + r}V${y(0)}Z`} style={{ fill: color }} opacity={d.muted ? 0.4 : 1} />
                {(i === maxIndex || i === data.length - 1) && (
                  <text x={cx} y={top - 5} textAnchor="middle" fontSize="10" fontWeight="500" style={{ fill: CHART_INK.strong }} className="tabular">
                    {formatValue(d.value)}
                  </text>
                )}
                <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" style={{ fill: CHART_INK.label }}>
                  {d.label}
                </text>
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} fill="transparent" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <ChartTooltip x={PAD.left + band * hover + band / 2 + barW / 2} y={y(data[hover].value)} width={width}>
          <div className="text-fg-3">{data[hover].label}</div>
          <div className="mt-0.5 font-semibold text-fg tabular">
            {formatValue(data[hover].value)} <span className="font-normal text-fg-3">{unit}</span>
          </div>
        </ChartTooltip>
      )}
    </div>
  )
}
