import { CircleCheck, CircleX, Clock, OctagonAlert, TriangleAlert, UserRound, type LucideIcon } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { PRIORITY_TONE, SLA_TONE, TECH_STATUS_TONE, WORK_ORDER_TYPE_LABEL, WORK_ORDER_TYPE_TONE, slaState, type SlaState } from '@/lib/workflows'
import type { Priority, Technician, WorkOrder, WorkOrderType } from '@/types'
import { WO_TYPE_ICON, WO_TYPE_SHORT, slaText } from './WoUtils'

const SLA_ICON: Record<SlaState, LucideIcon> = {
  met: CircleCheck,
  missed: CircleX,
  'on-track': Clock,
  'at-risk': TriangleAlert,
  breached: OctagonAlert,
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} className={cn('font-mono font-semibold', className)}>
      {priority}
    </Badge>
  )
}

export function TypeBadge({ type, short, className }: { type: WorkOrderType; short?: boolean; className?: string }) {
  return (
    <Badge tone={WORK_ORDER_TYPE_TONE[type]} icon={WO_TYPE_ICON[type]} className={className}>
      {short ? WO_TYPE_SHORT[type] : WORK_ORDER_TYPE_LABEL[type]}
    </Badge>
  )
}

export function SlaBadge({ wo, now, className }: { wo: WorkOrder; now: number; className?: string }) {
  const state = slaState(wo, now)
  return (
    <Badge tone={SLA_TONE[state]} icon={SLA_ICON[state]} className={cn('tabular', className)}>
      {slaText(wo, now)}
    </Badge>
  )
}

export function SlaIcon({ state, className }: { state: SlaState; className?: string }) {
  const Icon = SLA_ICON[state]
  return <Icon className={className} />
}

export function AssigneeChip({ tech, showName = true, className }: { tech: Technician | undefined | null; showName?: boolean; className?: string }) {
  if (!tech) {
    return (
      <span className={cn('inline-flex min-w-0 items-center gap-2 text-xs text-fg-3', className)} title="Unassigned">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-fg-3">
          <UserRound className="size-3" />
        </span>
        {showName && <span className="truncate">Unassigned</span>}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 text-xs text-fg-2', className)} title={tech.name}>
      <Avatar initials={tech.initials} size="sm" tone={TECH_STATUS_TONE[tech.status]} />
      {showName && <span className="truncate">{tech.name}</span>}
    </span>
  )
}
