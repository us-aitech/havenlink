import type { KeyboardEvent } from 'react'
import { Badge, ProgressBar, StatusDot, type Tone } from '@/components/ui'
import { currency, num, pct } from '@/lib/format'
import type { Property } from '@/types'

export interface PropertyStats {
  onts: number
  online: number
  openWorkOrders: number
  p1: number
}

export const DEMO_PROPERTY = 'p-palm-cove'

export function onlineTone(ratio: number): Tone {
  if (ratio >= 0.99) return 'good'
  if (ratio >= 0.95) return 'warning'
  return 'critical'
}

export function onlineLabel(ratio: number): string {
  if (ratio >= 0.99) return 'Healthy'
  if (ratio >= 0.95) return 'Watch'
  return 'Outage'
}

export function onlinePct(stats: PropertyStats): string {
  const ratio = stats.onts ? stats.online / stats.onts : 0
  return pct(ratio, ratio < 1 ? 1 : 0)
}

export function activateOnKey(action: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }
}

export function OnlineValue({ stats }: { stats: PropertyStats }) {
  const ratio = stats.onts ? stats.online / stats.onts : 0
  const tone = onlineTone(ratio)
  return (
    <span className="inline-flex items-center gap-1.5" title={`${stats.online} of ${stats.onts} ONTs online · ${onlineLabel(ratio)}`}>
      <StatusDot tone={tone} pulse={tone === 'critical'} />
      <span className="tabular">{onlinePct(stats)}</span>
      <span className="sr-only">{onlineLabel(ratio)}</span>
    </span>
  )
}

export function PropCard({ property, stats, onOpen }: { property: Property; stats: PropertyStats; onOpen: () => void }) {
  const adoption = property.units ? property.smartHomeUnits / property.units : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={activateOnKey(onOpen)}
      aria-label={`Open ${property.name}`}
      className="flex min-w-0 cursor-pointer flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{property.name}</h3>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <p className="truncate text-[13px] text-fg-3">{property.city}</p>
            {property.id === DEMO_PROPERTY && <Badge tone="accent">Demo home</Badge>}
          </div>
        </div>
        <Badge className="shrink-0">{property.type}</Badge>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4">
        <div className="min-w-0">
          <dt className="text-xs text-fg-3">Units</dt>
          <dd className="mt-0.5 text-base font-semibold text-fg tabular">{num(property.units)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-fg-3">ONTs online</dt>
          <dd className="mt-0.5 text-base font-semibold text-fg">
            <OnlineValue stats={stats} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-fg-3">Open WOs</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-base font-semibold text-fg tabular">
            {stats.openWorkOrders}
            {stats.p1 > 0 && <Badge tone="critical">P1</Badge>}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-fg-3">Smart-home adoption</span>
          <span className="text-fg-3 tabular">
            <span className="font-medium text-fg">{pct(adoption)}</span> · {property.smartHomeUnits} of {property.units}
          </span>
        </div>
        <ProgressBar value={adoption} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-[13px]">
        <span className="min-w-0 truncate text-fg-3">
          {property.contract} contract · {property.package}
        </span>
        <span className="shrink-0 font-semibold text-fg tabular">
          {currency(property.monthlyContract)}
          <span className="font-normal text-fg-3">/mo</span>
        </span>
      </div>
    </div>
  )
}
