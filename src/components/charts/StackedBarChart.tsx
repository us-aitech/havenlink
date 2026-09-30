import { useState } from 'react'
import { CHART_INK } from './palette'
import { ChartTooltip } from './Tooltip'
import { useWidth } from './useWidth'

export interface BarSeries {
  key: string
  label: string
  color: string
}

interface Props<T extends object> {
  data: T[]
  xKey: keyof T & string
  series: BarSeries[]
  height?: number
  formatValue?: (v: number) => string
  formatAxis?: (v: number) => string
  label: string
}

const PAD = { top: 10, right: 8, bottom: 24, left: 44 }

function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(v))
  const n = v / exp
  const nice = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => n <= step) ?? 10
  return nice * exp
}

export function ChartLegend({ series }: { series: BarSeries[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-fg-3">
          <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

export function StackedBarChart<T extends object>({ data, xKey, series, height = 240, formatValue = (v) => v.toLocaleString(), formatAxis, label }: Props<T>) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const val = (row: T, key: string) => Number((row as Record<string, unknown>)[key] ?? 0)
  const cat = (row: T) => String((row as Record<string, unknown>)[xKey])
  const totals = data.map((row) => series.reduce((sum, s) => sum + val(row, s.key), 0))
  const maxV = niceMax(Math.max(...totals, 1))
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const band = data.length ? innerW / data.length : 0
  const barW = Math.min(44, band * 0.62)
  const y = (v: number) => PAD.top + innerH - (v / maxV) * innerH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV)
  const axisFmt = formatAxis ?? formatValue
  const gap = 2

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend series={series} />
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label} className="block">
            {ticks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} style={{ stroke: v === 0 ? CHART_INK.axis : CHART_INK.grid }} />
                <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="10" style={{ fill: CHART_INK.label }} className="tabular">
                  {axisFmt(v)}
                </text>
              </g>
            ))}
            {data.map((row, i) => {
              const cx = PAD.left + band * i + band / 2
              let acc = 0
              const segments = series.map((s, si) => {
                const v = val(row, s.key)
                const top = y(acc + v)
                const bottom = y(acc)
                acc += v
                const h = Math.max(0, bottom - top - (si === 0 ? 0 : gap))
                return { key: s.key, color: s.color, top, h, isTop: si === series.length - 1 }
              })
              const left = cx - barW / 2
              const right = cx + barW / 2
              return (
                <g key={cat(row)} opacity={hover === null || hover === i ? 1 : 0.45}>
                  {segments.map((seg) =>
                    seg.isTop && seg.h > 4 ? (
                      <path key={seg.key} d={`M${left},${seg.top + seg.h}V${seg.top + 4}Q${left},${seg.top} ${left + 4},${seg.top}H${right - 4}Q${right},${seg.top} ${right},${seg.top + 4}V${seg.top + seg.h}Z`} style={{ fill: seg.color }} />
                    ) : (
                      <rect key={seg.key} x={left} y={seg.top} width={barW} height={seg.h} style={{ fill: seg.color }} />
                    ),
                  )}
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="11" style={{ fill: CHART_INK.label }}>
                    {cat(row)}
                  </text>
                  <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} fill="transparent" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} />
                </g>
              )
            })}
          </svg>
        )}
        {hover !== null && data[hover] && (
          <ChartTooltip x={PAD.left + band * hover + band / 2 + barW / 2} y={y(totals[hover])} width={width}>
            <div className="mb-1.5 font-medium text-fg">{cat(data[hover])}</div>
            <div className="flex flex-col gap-1">
              {[...series].reverse().map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-fg-3">
                    <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="text-fg tabular">{formatValue(val(data[hover], s.key))}</span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1">
                <span className="text-fg-3">Total</span>
                <span className="font-semibold text-fg tabular">{formatValue(totals[hover])}</span>
              </div>
            </div>
          </ChartTooltip>
        )}
      </div>
    </div>
  )
}
