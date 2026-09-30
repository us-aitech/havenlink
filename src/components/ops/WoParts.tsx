import { CircleCheck, CircleX, Clock, OctagonAlert, TriangleAlert, UserRound, type LucideIcon } from 'lucide-react'
import { Avatar, Badge, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { PRIORITY_TONE, SLA_TONE, WORKFLOWS, WORK_ORDER_TYPE_LABEL, isOpen, slaState, stageIndex, stageLabel, type SlaState } from '@/lib/workflows'
import type { Priority, Technician, WorkOrder, WorkOrderType } from '@/types'
import { WO_TYPE_ICON, WO_TYPE_SHORT, slaText } from './WoUtils'

const SLA_ICON: Record<SlaState, LucideIcon> = {
  met: CircleCheck,
  missed: CircleX,
  'on-track': Clock,
  'at-risk': TriangleAlert,
  breached: OctagonAlert,
}

export const SLA_BADGE_TONE: Record<SlaState, Tone> = {
  ...SLA_TONE,
  'on-track': 'neutral',
  met: 'neutral',
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} className={cn('w-7 justify-center font-mono font-semibold', className)}>
      {priority}
    </Badge>
  )
}

export function TypeBadge({ type, short, className }: { type: WorkOrderType; short?: boolean; className?: string }) {
  return (
    <Badge tone="neutral" icon={WO_TYPE_ICON[type]} className={className}>
      {short ? WO_TYPE_SHORT[type] : WORK_ORDER_TYPE_LABEL[type]}
    </Badge>
  )
}

export function TypeLabel({ type, short = true, className }: { type: WorkOrderType; short?: boolean; className?: string }) {
  const Icon = WO_TYPE_ICON[type]
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-fg-2', className)}>
      <Icon className="size-3.5 shrink-0 text-fg-3" />
      <span className="truncate">{short ? WO_TYPE_SHORT[type] : WORK_ORDER_TYPE_LABEL[type]}</span>
    </span>
  )
}

export function SlaBadge({ wo, now, className }: { wo: WorkOrder; now: number; className?: string }) {
  const state = slaState(wo, now)
  return (
    <Badge tone={SLA_BADGE_TONE[state]} icon={SLA_ICON[state]} className={cn('tabular', className)}>
      {slaText(wo, now)}
    </Badge>
  )
}

export function SlaIcon({ state, className }: { state: SlaState; className?: string }) {
  const Icon = SLA_ICON[state]
  return <Icon className={className} />
}

export function StageMeter({ wo, className, showLabel = true }: { wo: WorkOrder; className?: string; showLabel?: boolean }) {
  const stages = WORKFLOWS[wo.type]
  const current = Math.max(0, stageIndex(wo))
  const closed = !isOpen(wo)
  return (
    <div className={cn('min-w-0', className)}>
      {showLabel && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className={cn('truncate', closed ? 'text-fg-3' : 'text-fg-2')}>{stageLabel(wo)}</span>
          <span className="shrink-0 text-fg-3 tabular">
            {current + 1}/{stages.length}
          </span>
        </div>
      )}
      <div className={cn('flex gap-0.5', showLabel && 'mt-1.5')} aria-label={`Stage ${current + 1} of ${stages.length}`}>
        {stages.map((s, i) => (
          <span key={s.key} className={cn('h-1 flex-1 rounded-full', closed ? 'bg-good' : i < current ? 'bg-accent' : i === current ? 'bg-accent-line' : 'bg-surface-3')} />
        ))}
      </div>
    </div>
  )
}

export function AssigneeChip({ tech, showName = true, className }: { tech: Technician | undefined | null; showName?: boolean; className?: string }) {
  if (!tech) {
    return (
      <span className={cn('inline-flex min-w-0 items-center gap-2 text-[13px] text-fg-3', className)} title="Unassigned">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-fg-3">
          <UserRound className="size-3" />
        </span>
        {showName && <span className="truncate">Unassigned</span>}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 text-[13px] text-fg-2', className)} title={tech.name}>
      <Avatar initials={tech.initials} size="sm" />
      {showName && <span className="truncate">{tech.name}</span>}
    </span>
  )
}
