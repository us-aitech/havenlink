import { CircleCheck, CircleX } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { dbm } from '@/lib/format'
import { ONT_STATUS_LABEL, ONT_STATUS_TONE } from '@/lib/workflows'
import type { Ont, OntStatus } from '@/types'
import { ONT_CELL_CLASS, ONT_STATUSES, ONT_STATUS_ICON, RX_STRONG, RX_THRESHOLD, RX_WEAK, rxPass } from './NetUtils'

export function OntStatusBadge({ status, className }: { status: OntStatus; className?: string }) {
  return (
    <Badge tone={ONT_STATUS_TONE[status]} icon={ONT_STATUS_ICON[status]} className={className}>
      {ONT_STATUS_LABEL[status]}
    </Badge>
  )
}

export function OntCell({
  ont,
  status,
  rx,
  selected,
  onSelect,
  size = 'md',
}: {
  ont: Ont
  status: OntStatus
  rx: number | null
  selected?: boolean
  onSelect?: (id: string) => void
  size?: 'sm' | 'md'
}) {
  const label = `${ont.unit} · ${ONT_STATUS_LABEL[status]} · ${dbm(rx)}${ont.smartHome ? ' · Smart home' : ''}${ont.isDemoHome ? ' · Demo home' : ''}`
  const className = cn(
    'relative inline-flex shrink-0 items-center justify-center rounded-[4px] transition-[box-shadow,transform]',
    size === 'sm' ? 'size-4' : 'size-5',
    ONT_CELL_CLASS[status],
    ont.isDemoHome && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
    selected && !ont.isDemoHome && 'ring-2 ring-fg ring-offset-2 ring-offset-surface',
    selected && ont.isDemoHome && 'ring-fg',
  )
  const dot = ont.smartHome && <span className="size-1.5 rounded-full bg-surface" />
  if (!onSelect) {
    return (
      <span title={label} aria-label={label} role="img" className={className}>
        {dot}
      </span>
    )
  }
  return (
    <button type="button" onClick={() => onSelect(ont.id)} title={label} aria-label={label} aria-pressed={selected} className={cn(className, 'hover:scale-110')}>
      {dot}
    </button>
  )
}

export function OntLegend({ className, showDemo = true, showSpare = true }: { className?: string; showDemo?: boolean; showSpare?: boolean }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-3', className)}>
      {ONT_STATUSES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-[3px]', ONT_CELL_CLASS[s])} />
          {ONT_STATUS_LABEL[s]}
        </span>
      ))}
      {showSpare && (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] border border-dashed border-border-strong" />
          Spare port
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex size-2.5 items-center justify-center rounded-[3px] bg-neutral">
          <span className="size-1 rounded-full bg-surface" />
        </span>
        Smart-home unit
      </span>
      {showDemo && (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-surface-3 ring-2 ring-accent ring-offset-1 ring-offset-surface" />
          Demo home
        </span>
      )}
    </div>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className={cn('text-2xl leading-8 font-semibold tracking-[-0.02em] tabular', value === null ? 'text-critical-fg' : pass ? 'text-fg' : 'text-warning-fg')}>
            {value === null ? 'No light' : value.toFixed(1)}
          </span>
          {value !== null && <span className="text-[13px] font-medium text-fg-3">dBm</span>}
        </div>
        <Badge tone={pass ? 'good' : 'critical'} icon={pass ? CircleCheck : CircleX} className="tabular">
          {pass ? `Pass · ${margin} dB margin` : value === null ? 'Fail · loss of signal' : `Fail · ${margin} dB below threshold`}
        </Badge>
      </div>
      <div className="relative mt-4 h-2">
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          <div className="bg-good-line" style={{ width: `${threshold}%` }} />
          <div className="flex-1 bg-critical-line" />
        </div>
        <div className="absolute -top-1 -bottom-1 w-px -translate-x-1/2 bg-critical" style={{ left: `${threshold}%` }} title="−27 dBm receive threshold" />
        {value !== null && (
          <div
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface shadow-sm ring-2 ring-fg transition-[left] duration-500"
            style={{ left: `${gaugePosition(value) * 100}%` }}
          />
        )}
      </div>
      <div className="relative mt-2 h-4 text-[11px] text-fg-3 tabular">
        {TICKS.map((t, i) => (
          <span
            key={t}
            className={cn('absolute', i === 0 ? 'left-0' : i === TICKS.length - 1 ? 'right-0' : '-translate-x-1/2', t === RX_THRESHOLD && 'font-medium text-critical-fg')}
            style={i === 0 || i === TICKS.length - 1 ? undefined : { left: `${gaugePosition(t) * 100}%` }}
          >
            −{Math.abs(t)}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-3 text-xs text-fg-3">
        <span>Stronger</span>
        <span>Receive threshold −27 dBm</span>
        <span>Weaker</span>
      </div>
    </div>
  )
}
