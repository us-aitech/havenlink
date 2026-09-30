import {
  Bell,
  Droplets,
  Lightbulb,
  KeyRound,
  Network,
  ShieldAlert,
  Thermometer,
  Workflow,
  Wrench,
  ClipboardList,
  Settings2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { SEVERITY_TONE } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { ActivityEvent, EventCategory } from '@/types'
import { EmptyState, TONE_SOFT } from './ui'

export const CATEGORY_ICON: Record<EventCategory, LucideIcon> = {
  water: Droplets,
  security: ShieldAlert,
  network: Network,
  lighting: Lightbulb,
  access: KeyRound,
  climate: Thermometer,
  automation: Workflow,
  'work-order': ClipboardList,
  maintenance: Wrench,
  system: Settings2,
}

export function EventFeed({ events, limit = 12, showProperty, compact, emptyText = 'No activity yet' }: { events: ActivityEvent[]; limit?: number; showProperty?: boolean; compact?: boolean; emptyText?: string }) {
  const now = useNow(5000)
  const properties = useStore((s) => s.ops.properties)
  const items = events.slice(0, limit)
  if (!items.length) return <EmptyState icon={Bell} title={emptyText} />
  return (
    <ol className="-my-1 flex flex-col divide-y divide-border">
      {items.map((e) => {
        const Icon = CATEGORY_ICON[e.category]
        const tone = SEVERITY_TONE[e.severity]
        const emphasized = e.severity === 'critical' || e.severity === 'warning'
        const property = showProperty && e.propertyId ? properties.find((p) => p.id === e.propertyId)?.name : null
        return (
          <li key={e.id} className={cn('flex gap-3', compact ? 'py-2' : 'py-2.5')}>
            <div className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md', emphasized ? TONE_SOFT[tone] + ' ring-1 ring-inset' : 'bg-surface-3 text-fg-3')}>
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={cn('text-[13px] leading-5 font-medium', e.severity === 'critical' ? 'text-critical-fg' : 'text-fg')}>{e.title}</p>
                <span className="shrink-0 text-xs text-fg-4 tabular">{timeAgo(e.ts, now)}</span>
              </div>
              {(e.detail || property) && (
                <p className="truncate text-xs leading-5 text-fg-3">
                  {property && <span className="text-fg-2">{property}</span>}
                  {property && e.detail && <span className="mx-1 text-fg-4">·</span>}
                  {e.detail}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
