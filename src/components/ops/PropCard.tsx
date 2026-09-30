import type { KeyboardEvent } from 'react'
import { ChevronRight, ClipboardList, House, MapPin, UserRound } from 'lucide-react'
import { Badge, ProgressBar, StatusDot, type Tone } from '@/components/ui'
import { currency, num, pct } from '@/lib/format'
import type { Property, PropertyType } from '@/types'
import { PACKAGE_TONE } from './InstPackages'

export interface PropertyStats {
  onts: number
  online: number
  openWorkOrders: number
  p1: number
}

export const PROPERTY_TYPE_TONE: Record<PropertyType, Tone> = {
  MDU: 'info',
  'SFH Community': 'accent',
  Commercial: 'neutral',
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

export function PropCard({ property, stats, onOpen }: { property: Property; stats: PropertyStats; onOpen: () => void }) {
  const onlineRatio = stats.onts ? stats.online / stats.onts : 0
  const adoption = property.units ? property.smartHomeUnits / property.units : 0
  const tone = onlineTone(onlineRatio)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      aria-label={`Open ${property.name}`}
      className="group flex cursor-pointer flex-col rounded-xl border border-border bg-surface p-5 transition outline-none hover:border-border-strong hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent-line"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{property.name}</h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-fg-3">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{property.city}</span>
          </div>
        </div>
        <Badge tone={PROPERTY_TYPE_TONE[property.type]}>{property.type}</Badge>
      </div>
      {property.id === DEMO_PROPERTY && (
        <div className="mt-3">
          <Badge tone="accent" icon={House}>
            Demo home inside
          </Badge>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-border">
          <dt className="text-[11px] text-fg-3">Units</dt>
          <dd className="mt-0.5 text-base font-semibold text-fg">{num(property.units)}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-border" title={`${stats.online} of ${stats.onts} ONTs online · ${onlineLabel(onlineRatio)}`}>
          <dt className="text-[11px] text-fg-3">ONTs online</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-base font-semibold text-fg">
            <StatusDot tone={tone} pulse={tone === 'critical'} />
            {pct(onlineRatio, onlineRatio < 1 ? 1 : 0)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-inset ring-border">
          <dt className="text-[11px] text-fg-3">Open WOs</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-base font-semibold text-fg">
            <ClipboardList className="size-3.5 text-fg-3" />
            {stats.openWorkOrders}
            {stats.p1 > 0 && <span className="rounded bg-critical px-1 text-[10px] font-semibold text-white">P1</span>}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-fg-3">Smart-home adoption</span>
          <span className="text-fg-2 tabular">
            <span className="font-semibold text-fg">{pct(adoption)}</span> · {property.smartHomeUnits}/{property.units}
          </span>
        </div>
        <ProgressBar value={adoption} />
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-fg-3">Package</span>
          <Badge tone={PACKAGE_TONE[property.package]}>{property.package}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-fg-3">Contract</span>
          <span className="text-fg">
            {property.contract} · <span className="tabular">{currency(property.monthlyContract)}</span>/mo
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-fg-3">Manager</span>
          <span className="inline-flex min-w-0 items-center gap-1 text-fg">
            <UserRound className="size-3 shrink-0 text-fg-3" />
            <span className="truncate">{property.manager}</span>
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-1 text-xs font-medium text-fg-3 transition group-hover:text-accent-fg">
        View property
        <ChevronRight className="size-3.5" />
      </div>
    </div>
  )
}
