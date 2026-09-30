import type { KeyboardEvent } from 'react'
import { CircleCheck } from 'lucide-react'
import { Avatar, Badge, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency, formatTime, formatWeekday, timeAgo } from '@/lib/format'
import { WORKFLOWS, nextStage } from '@/lib/workflows'
import type { Property, Technician, WorkOrder } from '@/types'
import { DAY_MS, dayOffset } from './MntShared'

const CLOSED_WINDOW_DAYS = 14
const CLOSED_LIMIT = 4

interface Props {
  installs: WorkOrder[]
  properties: Property[]
  technicians: Technician[]
  now: number
  onAdvance: (id: string) => void
  onOpen: (id: string) => void
}

function shortName(name: string): string {
  const [firstName, ...rest] = name.split(' ')
  const last = rest[rest.length - 1]
  return last ? `${firstName} ${last[0]}.` : firstName
}

function slotOf(wo: WorkOrder): number {
  return wo.scheduledFor ?? wo.createdAt
}

function whenLabel(ts: number, now: number): string {
  const diff = dayOffset(ts, now)
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : formatWeekday(ts)
  return `${day}, ${formatTime(ts)}`
}

function PipelineCard({ wo, property, tech, now, onAdvance, onOpen }: { wo: WorkOrder; property?: Property; tech?: Technician; now: number; onAdvance: (id: string) => void; onOpen: (id: string) => void }) {
  const closed = wo.stage === 'closed'
  const next = nextStage(wo)
  const late = !closed && wo.dueAt < now
  const open = () => onOpen(wo.id)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Open ${wo.number}`}
      onClick={open}
      onKeyDown={onKeyDown}
      className={cn(
        'group cursor-pointer rounded-lg border bg-surface p-3 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm',
        late ? 'border-critical-line' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-fg-3">{wo.number}</span>
        {wo.package && <Badge>{wo.package}</Badge>}
      </div>
      <div className="mt-1.5 truncate text-[13px] leading-5 font-medium text-fg">{property?.name ?? wo.propertyId}</div>
      <div className="truncate text-xs text-fg-3">{wo.unit ?? 'Unit not set'}</div>
      {closed ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-fg-3">
          <CircleCheck className="size-3.5 shrink-0 text-good-fg" />
          <span className="truncate">Closed {timeAgo(wo.closedAt, now)}</span>
          <span className="ml-auto font-medium text-fg-2 tabular">{currency(wo.billable)}</span>
        </div>
      ) : (
        <div className={cn('mt-2 flex min-w-0 items-center gap-1.5 text-xs tabular', late ? 'text-critical-fg' : 'text-fg-2')}>
          {late && <Badge tone="critical">Late</Badge>}
          <span className="truncate">{whenLabel(slotOf(wo), now)}</span>
        </div>
      )}
      {!closed && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <div className="min-w-0 flex-1">
            {tech ? (
              <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs text-fg-2" title={tech.name}>
                <Avatar initials={tech.initials} size="sm" />
                <span className="truncate">{shortName(tech.name)}</span>
              </span>
            ) : (
              <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs text-fg-3">
                <span className="size-6 shrink-0 rounded-full border border-dashed border-border-strong" />
                <span className="truncate">Unassigned</span>
              </span>
            )}
          </div>
          {next && (
            <Button
              size="xs"
              title={`Advance to “${next.label}”`}
              onClick={(e) => {
                e.stopPropagation()
                onAdvance(wo.id)
              }}
            >
              Advance
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function InstPipeline({ installs, properties, technicians, now, onAdvance, onOpen }: Props) {
  const propertyById = new Map(properties.map((p) => [p.id, p]))
  const techById = new Map(technicians.map((t) => [t.id, t]))

  const columns = WORKFLOWS.install.map((stage) => {
    if (stage.key === 'closed') {
      const items = installs
        .filter((w) => w.stage === 'closed' && (w.closedAt ?? 0) >= now - CLOSED_WINDOW_DAYS * DAY_MS)
        .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
      return { stage, note: `Last ${CLOSED_WINDOW_DAYS} days`, items }
    }
    const items = installs.filter((w) => w.stage === stage.key).sort((a, b) => slotOf(a) - slotOf(b))
    return { stage, note: null, items }
  })

  return (
    <div className="relative overflow-x-auto overscroll-x-contain">
      <div className="grid min-w-max auto-cols-[minmax(216px,1fr)] grid-flow-col divide-x divide-border border-t border-border sm:min-w-full">
        {columns.map((col, i) => {
          const shown = col.stage.key === 'closed' ? col.items.slice(0, CLOSED_LIMIT) : col.items
          const hidden = col.items.length - shown.length
          return (
            <section key={col.stage.key} className="flex min-h-[240px] flex-col" aria-label={col.stage.label}>
              <header className="flex h-11 items-center gap-2 border-b border-border bg-surface-2 px-3">
                <span className="w-3.5 shrink-0 text-xs text-fg-3 tabular">{i + 1}</span>
                <h3 className="min-w-0 truncate text-[13px] font-medium text-fg">{col.stage.label}</h3>
                <span className="ml-auto shrink-0 rounded-md bg-surface-3 px-1.5 text-xs leading-5 font-medium text-fg-2 tabular">{col.items.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2.5">
                {col.note && <div className="px-0.5 text-xs text-fg-3">{col.note}</div>}
                {shown.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border-strong px-3 py-6 text-center text-xs text-fg-3">No installs</div>
                ) : (
                  shown.map((wo) => (
                    <PipelineCard
                      key={wo.id}
                      wo={wo}
                      property={propertyById.get(wo.propertyId)}
                      tech={wo.assigneeId ? techById.get(wo.assigneeId) : undefined}
                      now={now}
                      onAdvance={onAdvance}
                      onOpen={onOpen}
                    />
                  ))
                )}
                {hidden > 0 && <div className="px-1 pt-1 text-center text-xs text-fg-3">+{hidden} more closed</div>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
