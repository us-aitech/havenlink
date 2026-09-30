import { Link } from 'react-router'
import { ArrowUpDown, ArrowUpRight, Box, Cable, Server, type LucideIcon } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatWeekday } from '@/lib/format'
import type { Tone } from '@/lib/workflows'
import type { AssetCondition, AssetKind, Technician } from '@/types'

export const DAY_MS = 86_400_000

export const ASSET_KIND_ICON: Record<AssetKind, LucideIcon> = {
  cabinet: Server,
  pedestal: Box,
  riser: ArrowUpDown,
  'slack-storage': Cable,
}

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  cabinet: 'Cabinet',
  pedestal: 'Pedestal',
  riser: 'Riser',
  'slack-storage': 'Slack storage',
}

export const CONDITION_TONE: Record<AssetCondition, Tone> = {
  good: 'good',
  fair: 'warning',
  poor: 'critical',
}

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

export const MNT_STAGE_TONE: Record<string, Tone> = {
  scheduled: 'neutral',
  inspecting: 'info',
  'light-level': 'info',
  documenting: 'info',
  closed: 'good',
}

export const LINK_BUTTON =
  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-surface px-2.5 text-xs font-medium whitespace-nowrap text-fg shadow-xs ring-1 ring-border ring-inset transition-colors hover:bg-surface-2'

export function workOrderHref(id: string): string {
  return `/ops/work-orders?id=${encodeURIComponent(id)}`
}

export function OpenWorkOrderLink({ id, number, className }: { id: string; number: string; className?: string }) {
  return (
    <Link
      to={workOrderHref(id)}
      aria-label={`Open ${number}`}
      title={`Open ${number}`}
      className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg', className)}
    >
      <ArrowUpRight className="size-4" />
    </Link>
  )
}

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  return (
    <Badge tone={CONDITION_TONE[condition]} dot>
      {CONDITION_LABEL[condition]}
    </Badge>
  )
}

export function AssigneeChip({ tech, showName = true }: { tech: Technician | null | undefined; showName?: boolean }) {
  if (!tech) {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center gap-2 text-[13px] text-fg-3">
        <span className="size-6 shrink-0 rounded-full border border-dashed border-border-strong" />
        {showName && <span className="truncate">Unassigned</span>}
      </span>
    )
  }
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2 text-[13px] text-fg-2" title={tech.name}>
      <Avatar initials={tech.initials} size="sm" />
      {showName && <span className="truncate">{tech.name}</span>}
    </span>
  )
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dayOffset(ts: number, now: number): number {
  return Math.round((startOfDay(ts) - startOfDay(now)) / DAY_MS)
}

export function dayHeading(ts: number, now: number): { relative: string | null; date: string } {
  const diff = dayOffset(ts, now)
  const relative = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : null
  return { relative, date: formatWeekday(ts) }
}

export function daysFromNowAt(now: number, days: number, hour: number): number {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}

export function signedDbm(value: number, digits = 1): string {
  return `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`
}
