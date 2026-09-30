import type { KeyboardEvent } from 'react'
import { ArrowRight, CalendarClock, CircleCheck, TriangleAlert } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency, formatTime, formatWeekday, timeAgo } from '@/lib/format'
import { WORKFLOWS, nextStage } from '@/lib/workflows'
import type { Property, Technician, WorkOrder } from '@/types'
import { PACKAGE_TONE } from './InstPackages'
import { AssigneeChip, DAY_MS, dayOffset } from './MntShared'

const CLOSED_WINDOW_DAYS = 14
const CLOSED_LIMIT = 8

interface Props {
  installs: WorkOrder[]
  properties: Property[]
  technicians: Technician[]
  now: number
  onAdvance: (id: string) => void
  onOpen: (id: string) => void
}

function slotOf(wo: WorkOrder): number {
  return wo.scheduledFor ?? wo.createdAt
}

function whenLabel(ts: number, now: number): string {
  const diff = dayOffset(ts, now)
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : formatWeekday(ts)
  return `${day} · ${formatTime(ts)}`
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
        'group cursor-pointer rounded-xl border bg-surface-2 p-3 transition outline-none hover:border-border-strong hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-accent-line',
        late ? 'border-critical-line' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-fg-3 group-hover:text-fg-2">{wo.number}</span>
        {wo.package && <Badge tone={PACKAGE_TONE[wo.package]}>{wo.package}</Badge>}
      </div>
      <div className="mt-2 truncate text-sm font-medium text-fg">{property?.name ?? wo.propertyId}</div>
      <div className="truncate text-xs text-fg-3">{wo.unit ?? 'Unit not set'}</div>
      {closed ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-good-fg">
          <CircleCheck className="size-3.5" />
          Closed {timeAgo(wo.closedAt, now)}
          <span className="ml-auto text-fg-2 tabular">{currency(wo.billable)}</span>
        </div>
      ) : (
        <div className={cn('mt-2 flex items-center gap-1.5 text-xs', late ? 'text-critical-fg' : 'text-fg-3')}>
          {late ? <TriangleAlert className="size-3.5 shrink-0" /> : <CalendarClock className="size-3.5 shrink-0" />}
          <span className="truncate">
            {late ? 'Past window · ' : ''}
            {whenLabel(slotOf(wo), now)}
          </span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <div className="min-w-0 flex-1">
          <AssigneeChip tech={tech} />
        </div>
        {next && (
          <Button
            size="xs"
            variant="secondary"
            iconRight={ArrowRight}
            title={`Move to “${next.label}”`}
            onClick={(e) => {
              e.stopPropagation()
              onAdvance(wo.id)
            }}
          >
            Advance
          </Button>
        )}
      </div>
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
      return { stage, title: 'Closed', note: `Last ${CLOSED_WINDOW_DAYS} days`, items }
    }
    const items = installs.filter((w) => w.stage === stage.key).sort((a, b) => slotOf(a) - slotOf(b))
    return { stage, title: stage.label, note: null, items }
  })

  return (
    <div className="relative -mx-5 snap-x snap-mandatory scroll-px-5 overflow-x-auto px-5 pb-1 sm:snap-none">
      <div className="grid auto-cols-[minmax(212px,1fr)] grid-flow-col gap-3">
        {columns.map((col, i) => {
          const shown = col.stage.key === 'closed' ? col.items.slice(0, CLOSED_LIMIT) : col.items
          const hidden = col.items.length - shown.length
          return (
            <section key={col.stage.key} className="flex min-h-[220px] snap-start flex-col rounded-xl border border-border bg-surface-2" aria-label={col.title}>
              <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular',
                      col.stage.key === 'closed' ? 'bg-good-soft text-good-fg' : 'bg-surface-2 text-fg-3',
                    )}
                  >
                    {col.stage.key === 'closed' ? <CircleCheck className="size-3" /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-fg">{col.title}</div>
                    {col.note && <div className="text-[10px] text-fg-3">{col.note}</div>}
                  </div>
                </div>
                <span className="rounded-md bg-surface-2 px-1.5 text-[10px] text-fg-3 tabular">{col.items.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {shown.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-fg-4">No installs here</div>
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
                {hidden > 0 && <div className="px-1 pt-1 text-center text-[11px] text-fg-3">+{hidden} more closed</div>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
