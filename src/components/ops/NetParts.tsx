import { CircleCheck, CircleX } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ONT_STATUS_LABEL, ONT_STATUS_TONE } from '@/lib/workflows'
import type { OntStatus } from '@/types'
import { ONT_STATUS_ICON, RX_STRONG, RX_THRESHOLD, RX_WEAK, rxPass } from './NetUtils'

export function OntStatusBadge({ status, className }: { status: OntStatus; className?: string }) {
  return (
    <Badge tone={ONT_STATUS_TONE[status]} icon={ONT_STATUS_ICON[status]} className={className}>
      {ONT_STATUS_LABEL[status]}
    </Badge>
  )
}

function gaugePosition(value: number): number {
  return Math.max(0, Math.min(1, (RX_STRONG - value) / (RX_STRONG - RX_WEAK)))
}

const TICKS = [-8, -12, -16, -20, -24, -27, -30]

export function RxGauge({ value, className }: { value: number | null; className?: string }) {
  const pass = rxPass(value)
  const threshold = gaugePosition(RX_THRESHOLD) * 100
  const margin = value === null ? null : Math.abs(value - RX_THRESHOLD).toFixed(1)
  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-2xl font-semibold tracking-tight tabular', value === null ? 'text-critical-fg' : pass ? 'text-fg' : 'text-warning-fg')}>
            {value === null ? 'No light' : value.toFixed(1)}
          </span>
          {value !== null && <span className="text-sm text-fg-3">dBm</span>}
        </div>
        <Badge tone={pass ? 'good' : 'critical'} icon={pass ? CircleCheck : CircleX}>
          {pass ? `PASS · ${margin} dB margin` : value === null ? 'FAIL · LOS' : `FAIL · ${margin} dB below threshold`}
        </Badge>
      </div>
      <div className="relative mt-4 h-2.5">
        <div className="absolute inset-0 flex overflow-hidden rounded-full ring-1 ring-border ring-inset">
          <div style={{ width: `${threshold}%`, background: 'linear-gradient(90deg, rgb(52 211 153 / 0.75), rgb(52 211 153 / 0.45) 70%, rgb(251 191 36 / 0.6))' }} />
          <div className="flex-1 bg-critical-soft" />
        </div>
        <div className="absolute -top-1.5 -bottom-1.5 w-0.5 -translate-x-1/2 rounded bg-critical" style={{ left: `${threshold}%` }} title="-27 dBm threshold" />
        {value !== null && (
          <div
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-border-strong bg-white transition-[left] duration-500"
            style={{ left: `${gaugePosition(value) * 100}%` }}
          />
        )}
      </div>
      <div className="relative mt-2 h-4 text-[10px] text-fg-3 tabular">
        {TICKS.map((t, i) => (
          <span
            key={t}
            className={cn('absolute', i === 0 ? 'left-0' : i === TICKS.length - 1 ? 'right-0' : '-translate-x-1/2', t === RX_THRESHOLD && 'font-semibold text-critical-fg')}
            style={i === 0 || i === TICKS.length - 1 ? undefined : { left: `${gaugePosition(t) * 100}%` }}
          >
            −{Math.abs(t)}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-fg-4">
        <span>Stronger</span>
        <span>Receive threshold −27 dBm</span>
        <span>Weaker</span>
      </div>
    </div>
  )
}
