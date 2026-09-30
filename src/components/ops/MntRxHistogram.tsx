import { useState } from 'react'
import { CHART_INK, SERIES, STATUS } from '@/components/charts/palette'
import { ChartTooltip } from '@/components/charts/Tooltip'
import { useWidth } from '@/components/charts/useWidth'
import { signedDbm } from './MntShared'

export interface RxBin {
  center: number
  count: number
  fail: boolean
}

const PAD = { top: 24, right: 8, bottom: 24, left: 28 }
const BIN_WIDTH_DB = 2
const GAP = 2

function niceMax(v: number): number {
  if (v <= 4) return 4
  const exp = 10 ** Math.floor(Math.log10(v))
  const n = v / exp
  const nice = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => n <= step) ?? 10
  return nice * exp
}

export function MntRxHistogram({ bins, threshold, height = 208 }: { bins: RxBin[]; threshold: number; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const maxCount = Math.max(0, ...bins.map((b) => b.count))
  const maxV = niceMax(maxCount)
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const band = bins.length ? innerW / bins.length : 0
  const barW = Math.max(1, band - GAP)
  const y = (v: number) => PAD.top + innerH - (v / maxV) * innerH
  const ticks = [0, maxV / 2, maxV]
  const firstEdge = bins.length ? bins[0].center + BIN_WIDTH_DB / 2 : 0
  const thresholdX = PAD.left + band * ((firstEdge - threshold) / BIN_WIDTH_DB)
  const peak = bins.reduce((best, b, i) => (b.count > bins[best].count ? i : best), 0)

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Histogram of ONT receive power in ${BIN_WIDTH_DB} dB bins; readings at or below ${signedDbm(threshold, 0)} dBm fail`} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} style={{ stroke: v === 0 ? CHART_INK.axis : CHART_INK.grid }} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="10" style={{ fill: CHART_INK.label }} className="tabular">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {bins.map((b, i) => {
            const left = PAD.left + band * i + GAP / 2
            const top = y(b.count)
            const h = Math.max(0, y(0) - top)
            const r = Math.min(4, h, barW / 2)
            const right = left + barW
            const showValue = b.count > 0 && (i === peak || b.fail)
            return (
              <g key={b.center} opacity={hover === null || hover === i ? 1 : 0.5}>
                {h > 0 && (
                  <path
                    d={`M${left},${y(0)}V${top + r}Q${left},${top} ${left + r},${top}H${right - r}Q${right},${top} ${right},${top + r}V${y(0)}Z`}
                    style={{ fill: b.fail ? STATUS.critical : SERIES[0] }}
                  />
                )}
                {showValue && (
                  <text x={left + barW / 2} y={top - 5} textAnchor="middle" fontSize="10" fontWeight="500" style={{ fill: CHART_INK.strong }} className="tabular">
                    {b.count}
                  </text>
                )}
                <text x={left + barW / 2} y={height - 6} textAnchor="middle" fontSize="10" style={{ fill: CHART_INK.label }} className="tabular">
                  {signedDbm(b.center, 0)}
                </text>
              </g>
            )
          })}
          <line x1={thresholdX} x2={thresholdX} y1={PAD.top - 12} y2={y(0)} strokeDasharray="3 3" style={{ stroke: CHART_INK.strong }} />
          <text x={thresholdX + 4} y={PAD.top - 14} fontSize="10" fontWeight="500" style={{ fill: CHART_INK.strong }} className="tabular">
            {signedDbm(threshold, 0)} dBm
          </text>
          {bins.map((b, i) => (
            <rect
              key={b.center}
              x={PAD.left + band * i}
              y={PAD.top}
              width={band}
              height={innerH}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </svg>
      )}
      {hover !== null && bins[hover] && (
        <ChartTooltip x={PAD.left + band * hover + band / 2 + barW / 2} y={y(bins[hover].count)} width={width}>
          <div className="font-semibold text-fg tabular">
            {bins[hover].count} {bins[hover].count === 1 ? 'ONT' : 'ONTs'}
          </div>
          <div className="mt-0.5 text-fg-3 tabular">
            {signedDbm(bins[hover].center - BIN_WIDTH_DB / 2, 0)} to {signedDbm(bins[hover].center + BIN_WIDTH_DB / 2, 0)} dBm · {bins[hover].fail ? 'Fail' : 'Pass'}
          </div>
        </ChartTooltip>
      )}
    </div>
  )
}
