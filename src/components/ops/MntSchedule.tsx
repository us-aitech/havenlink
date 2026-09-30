import { Link } from 'react-router'
import { CalendarClock, ChevronsRight, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui'
import { formatDate, formatDuration, formatTime } from '@/lib/format'
import { PRIORITY_TONE, nextStage, stageLabel } from '@/lib/workflows'
import type { Asset, Property, Technician, WorkOrder } from '@/types'
import { ASSET_KIND_LABEL, AssigneeChip, MNT_STAGE_TONE, OpenWorkOrderLink, dayHeading, workOrderHref } from './MntShared'

export function slotOf(wo: WorkOrder): number {
  return wo.scheduledFor ?? wo.dueAt
}

export interface ScheduleContext {
  propertyById: Map<string, Property>
  assetById: Map<string, Asset>
  techById: Map<string, Technician>
  now: number
  onAdvance: (id: string) => void
}

function AdvanceButton({ wo, onAdvance }: { wo: WorkOrder; onAdvance: (id: string) => void }) {
  const next = nextStage(wo)
  if (!next) return null
  return (
    <Button size="xs" icon={ChevronsRight} onClick={() => onAdvance(wo.id)} title={`Advance to “${next.label}”`}>
      Advance
    </Button>
  )
}

function Meta({ wo, ctx }: { wo: WorkOrder; ctx: ScheduleContext }) {
  const asset = wo.assetId ? ctx.assetById.get(wo.assetId) : undefined
  const property = ctx.propertyById.get(wo.propertyId)
  return (
    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-fg-3">
      <span className="font-mono">{wo.number}</span>
      <span aria-hidden className="text-fg-4">
        ·
      </span>
      <span className="truncate">{property?.name ?? wo.propertyId}</span>
      {asset && (
        <>
          <span aria-hidden className="text-fg-4">
            ·
          </span>
          <span className="truncate">
            {ASSET_KIND_LABEL[asset.kind]} <span className="font-mono">{asset.name}</span>
          </span>
        </>
      )}
    </div>
  )
}

function ScheduleRow({ wo, ctx }: { wo: WorkOrder; ctx: ScheduleContext }) {
  const tech = wo.assigneeId ? ctx.techById.get(wo.assigneeId) : undefined
  const overdue = wo.dueAt < ctx.now

  return (
    <li className="flex flex-col gap-2.5 px-5 py-3 transition-colors hover:bg-surface-2 xl:flex-row xl:items-center xl:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-4">
        <time dateTime={new Date(slotOf(wo)).toISOString()} className="shrink-0 font-mono text-xs leading-5 text-fg-2 tabular sm:w-16">
          {formatTime(slotOf(wo))}
        </time>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Link to={workOrderHref(wo.id)} className="min-w-0 truncate text-[13px] leading-5 font-medium text-fg underline-offset-2 hover:underline">
              {wo.title}
            </Link>
            {wo.priority !== 'P3' && <Badge tone={PRIORITY_TONE[wo.priority]}>{wo.priority}</Badge>}
            {overdue && <Badge tone="critical">Overdue</Badge>}
          </div>
          <Meta wo={wo} ctx={ctx} />
          <div className="mt-2 xl:hidden">
            <Badge tone={MNT_STAGE_TONE[wo.stage] ?? 'info'} dot>
              {stageLabel(wo)}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:pl-20 xl:pl-0">
        <div className="min-w-0 flex-1 xl:w-36 xl:flex-none">
          <AssigneeChip tech={tech} />
        </div>
        <div className="hidden w-48 xl:block">
          <Badge tone={MNT_STAGE_TONE[wo.stage] ?? 'info'} dot>
            {stageLabel(wo)}
          </Badge>
        </div>
        <div className="ml-auto flex items-center justify-end gap-1 xl:w-28">
          <AdvanceButton wo={wo} onAdvance={ctx.onAdvance} />
          <OpenWorkOrderLink id={wo.id} number={wo.number} />
        </div>
      </div>
    </li>
  )
}

export function MntOverdueCallout({ overdue, ctx }: { overdue: WorkOrder[]; ctx: ScheduleContext }) {
  if (!overdue.length) return null
  return (
    <section aria-label="Overdue inspections" className="rounded-xl border border-critical-line bg-critical-soft">
      <div className="flex items-start gap-3 px-5 py-3.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-critical-fg" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-critical-fg">
            {overdue.length} {overdue.length === 1 ? 'inspection is' : 'inspections are'} overdue
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-2">Past the 4-hour arrival window. Advance, reassign or reschedule from the work order.</p>
        </div>
      </div>
      <ul className="divide-y divide-critical-line border-t border-critical-line">
        {overdue.map((wo) => {
          const tech = wo.assigneeId ? ctx.techById.get(wo.assigneeId) : undefined
          return (
            <li key={wo.id} className="flex flex-col gap-2 px-5 py-2.5 lg:flex-row lg:items-center lg:gap-4">
              <div className="min-w-0 flex-1">
                <Link to={workOrderHref(wo.id)} className="block truncate text-[13px] leading-5 font-medium text-fg underline-offset-2 hover:underline">
                  {wo.title}
                </Link>
                <Meta wo={wo} ctx={ctx} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-xs text-fg-2 tabular">
                  Due {formatDate(wo.dueAt)} {formatTime(wo.dueAt)} · <span className="font-medium text-critical-fg">{formatDuration(ctx.now - wo.dueAt)} late</span>
                </span>
                <div className="min-w-0 lg:w-36">
                  <AssigneeChip tech={tech} />
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <AdvanceButton wo={wo} onAdvance={ctx.onAdvance} />
                  <OpenWorkOrderLink id={wo.id} number={wo.number} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function MntScheduleList({ groups, total, ctx }: { groups: [number, WorkOrder[]][]; total: number; ctx: ScheduleContext }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader title="Schedule" subtitle={`${total} open maintenance ${total === 1 ? 'work order' : 'work orders'}, grouped by day`} />
      </div>
      {groups.length === 0 ? (
        <div className="border-t border-border">
          <EmptyState icon={CalendarClock} title="No open maintenance" message="Schedule an inspection from the asset register below." />
        </div>
      ) : (
        groups.map(([day, list]) => {
          const heading = dayHeading(day, ctx.now)
          return (
            <section key={day} aria-label={heading.date}>
              <div className="flex items-center justify-between gap-3 border-y border-border bg-surface-2 px-5 py-1.5 text-xs">
                <h3 className="font-medium text-fg-2">
                  {heading.relative && <span className="text-fg">{heading.relative}</span>}
                  {heading.relative && <span className="text-fg-4"> · </span>}
                  {heading.date}
                </h3>
                <span className="text-fg-3 tabular">
                  {list.length} {list.length === 1 ? 'job' : 'jobs'}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {list.map((wo) => (
                  <ScheduleRow key={wo.id} wo={wo} ctx={ctx} />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </Card>
  )
}
