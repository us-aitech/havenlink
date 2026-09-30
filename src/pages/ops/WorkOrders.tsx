import { useMemo, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ClipboardList, Clock, OctagonAlert, Plus, Search, Siren, UserRound, CircleCheck, type LucideIcon } from 'lucide-react'
import { Button, Card, EmptyState, Input, PageHeader, ProgressBar, Segmented, TONE_SOFT, type SegmentOption, type Tone } from '@/components/ui'
import { WoCreateModal } from '@/components/ops/WoCreateModal'
import { AssigneeChip, PriorityBadge, SlaBadge, TypeBadge } from '@/components/ops/WoParts'
import { WO_TYPE_ICON, WO_TYPE_ORDER, WO_TYPE_SHORT, compareWorkOrders } from '@/components/ops/WoUtils'
import { WorkOrderDrawer } from '@/components/ops/WorkOrderDrawer'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { isOpen, slaState, stageLabel, stageProgress } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { Technician, WorkOrder, WorkOrderType } from '@/types'

type TypeFilter = 'all' | WorkOrderType
type StatusFilter = 'open' | 'closed' | 'all'

const DAY = 86_400_000

function Metric({ label, value, icon: Icon, tone, hint, className }: { label: string; value: number | string; icon: LucideIcon; tone: Tone; hint?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3', className)}>
      <div className={cn('hidden size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset sm:flex', TONE_SOFT[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium text-fg-3">{label}</div>
        <div className="text-lg leading-tight font-semibold text-fg tabular">{value}</div>
        {hint && <div className="truncate text-[11px] text-fg-3">{hint}</div>}
      </div>
    </div>
  )
}

function WorkOrderRow({ wo, now, propertyName, tech, selected, onOpen }: { wo: WorkOrder; now: number; propertyName: string; tech: Technician | undefined; selected: boolean; onOpen: (id: string) => void }) {
  const open = isOpen(wo)
  const onKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(wo.id)
    }
  }
  return (
    <tr
      tabIndex={0}
      onClick={() => onOpen(wo.id)}
      onKeyDown={onKey}
      className={cn('group cursor-pointer transition outline-none hover:bg-surface-3 focus-visible:bg-surface-2', selected && 'bg-accent-soft', !open && 'text-fg-3')}
    >
      <td className="relative py-3 pr-2.5 pl-4 whitespace-nowrap">
        {open && wo.priority === 'P1' && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-critical" />}
        {selected && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-accent" />}
        <div className="font-mono text-xs text-fg-2">{wo.number}</div>
        <div className="mt-0.5 text-[11px] text-fg-3 tabular 2xl:hidden">{timeAgo(wo.createdAt, now)}</div>
      </td>
      <td className="px-2.5 py-3">
        <PriorityBadge priority={wo.priority} />
      </td>
      <td className="px-2.5 py-3">
        <TypeBadge type={wo.type} short />
      </td>
      <td className="w-full max-w-0 px-2.5 py-3">
        <div className={cn('truncate', open ? 'text-fg' : 'text-fg-2')} title={wo.title}>
          {wo.title}
        </div>
        <div className="truncate text-xs text-fg-3">
          {propertyName}
          {wo.unit && ` · ${wo.unit}`}
        </div>
      </td>
      <td className="px-2.5 py-3">
        <div className="w-32 truncate text-xs text-fg-2">{stageLabel(wo)}</div>
        <ProgressBar value={stageProgress(wo)} tone={open ? 'accent' : 'good'} className="mt-1.5 w-32" />
      </td>
      <td className="px-2.5 py-3">
        <AssigneeChip tech={tech} className="max-w-[140px]" />
      </td>
      <td className="py-3 pr-4 pl-2.5 whitespace-nowrap 2xl:pr-2.5">
        <SlaBadge wo={wo} now={now} />
      </td>
      <td className="hidden py-3 pr-4 pl-2.5 text-right text-xs whitespace-nowrap text-fg-3 tabular 2xl:table-cell">{timeAgo(wo.createdAt, now)}</td>
    </tr>
  )
}

function WorkOrderCard({ wo, now, propertyName, tech, selected, onOpen }: { wo: WorkOrder; now: number; propertyName: string; tech: Technician | undefined; selected: boolean; onOpen: (id: string) => void }) {
  const open = isOpen(wo)
  return (
    <button
      type="button"
      onClick={() => onOpen(wo.id)}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border bg-surface p-4 text-left transition hover:border-border-strong',
        selected ? 'border-accent-line' : open && wo.priority === 'P1' ? 'border-critical-line' : 'border-border',
      )}
    >
      {open && wo.priority === 'P1' && <span className="absolute inset-y-0 left-0 w-1 bg-critical" />}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-fg-3">{wo.number}</span>
        <PriorityBadge priority={wo.priority} />
        <TypeBadge type={wo.type} short className="min-w-0" />
        <span className="ml-auto shrink-0 text-[11px] text-fg-3">{timeAgo(wo.createdAt, now)}</span>
      </div>
      <div className={cn('mt-2 text-sm font-medium', open ? 'text-fg' : 'text-fg-2')}>{wo.title}</div>
      <div className="mt-0.5 truncate text-xs text-fg-3">
        {propertyName}
        {wo.unit && ` · ${wo.unit}`}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-fg-3">{stageLabel(wo)}</div>
          <ProgressBar value={stageProgress(wo)} tone={open ? 'accent' : 'good'} className="mt-1" />
        </div>
        <SlaBadge wo={wo} now={now} />
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <AssigneeChip tech={tech} />
      </div>
    </button>
  )
}

export default function OpsWorkOrders() {
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id')
  const now = useNow()
  const partner = usePartner()
  const workOrders = useStore((s) => s.ops.workOrders)
  const properties = useStore((s) => s.ops.properties)
  const technicians = useStore((s) => s.ops.technicians)
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('open')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const openDrawer = (id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('id', id)
      return next
    })
  }

  const closeDrawer = () => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('id')
        return next
      },
      { replace: true },
    )
  }

  const propertyNames = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties])
  const techById = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians])

  const openByType = useMemo(() => {
    const counts: Record<TypeFilter, number> = { all: 0, emergency: 0, trouble: 0, support: 0, install: 0, maintenance: 0 }
    for (const w of workOrders) {
      if (!isOpen(w)) continue
      counts.all += 1
      counts[w.type] += 1
    }
    return counts
  }, [workOrders])

  const byStatus = useMemo(() => {
    const scoped = workOrders.filter((w) => type === 'all' || w.type === type)
    const open = scoped.filter(isOpen).length
    return { open, closed: scoped.length - open, all: scoped.length }
  }, [workOrders, type])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return workOrders
      .filter((w) => type === 'all' || w.type === type)
      .filter((w) => status === 'all' || (status === 'open' ? isOpen(w) : !isOpen(w)))
      .filter((w) => !q || [w.number, w.title, w.unit ?? '', propertyNames.get(w.propertyId) ?? ''].some((f) => f.toLowerCase().includes(q)))
      .sort(compareWorkOrders)
  }, [workOrders, type, status, query, propertyNames])

  const openOrders = workOrders.filter(isOpen)
  const p1 = openOrders.filter((w) => w.priority === 'P1').length
  const atRisk = openOrders.filter((w) => {
    const s = slaState(w, now)
    return s === 'at-risk' || s === 'breached'
  }).length
  const unassigned = openOrders.filter((w) => !w.assigneeId).length
  const closed24h = workOrders.filter((w) => w.closedAt && now - w.closedAt < DAY).length

  const typeOptions: SegmentOption<TypeFilter>[] = [
    { value: 'all', label: 'All', count: openByType.all },
    ...WO_TYPE_ORDER.map((t) => ({ value: t, label: WO_TYPE_SHORT[t], icon: WO_TYPE_ICON[t], count: openByType[t] })),
  ]
  const statusOptions: SegmentOption<StatusFilter>[] = [
    { value: 'open', label: 'Open', count: byStatus.open },
    { value: 'closed', label: 'Closed', count: byStatus.closed },
    { value: 'all', label: 'All', count: byStatus.all },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Dispatch"
        title="Work orders"
        subtitle={`Trouble calls, emergency repairs, installs, maintenance and resident support for ${partner.name}`}
        actions={
          <Button variant="primary" size="md" icon={Plus} onClick={() => setCreating(true)}>
            New work order
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Metric label="Open work orders" value={openOrders.length} icon={ClipboardList} tone="accent" hint={`${openByType.emergency + openByType.trouble} field repairs`} />
        <Metric label="P1 emergencies" value={p1} icon={Siren} tone={p1 ? 'critical' : 'neutral'} hint={p1 ? 'Crew dispatched' : 'None active'} />
        <Metric label="SLA at risk" value={atRisk} icon={atRisk ? OctagonAlert : Clock} tone={atRisk ? 'warning' : 'good'} hint="At risk or breached" />
        <Metric label="Unassigned" value={unassigned} icon={UserRound} tone={unassigned ? 'warning' : 'neutral'} hint="Awaiting dispatch" />
        <Metric label="Closed · 24h" value={closed24h} icon={CircleCheck} tone="good" hint="All work types" className="col-span-2 sm:col-span-1" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented size="sm" options={typeOptions} value={type} onChange={setType} />
        <Segmented size="sm" options={statusOptions} value={status} onChange={setStatus} />
        <div className="relative w-full sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number, title, unit, property" className="h-9 pl-9" aria-label="Search work orders" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No work orders match"
            message="Try a different type, status or search term."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setType('all')
                  setStatus('all')
                  setQuery('')
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card padded={false} className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border bg-black/10 text-[11px] tracking-wider text-fg-3 uppercase">
                  <tr>
                    <th className="py-2.5 pr-2.5 pl-4 font-medium">Number</th>
                    <th className="px-2.5 py-2.5 font-medium">Priority</th>
                    <th className="px-2.5 py-2.5 font-medium">Type</th>
                    <th className="px-2.5 py-2.5 font-medium">Work order</th>
                    <th className="px-2.5 py-2.5 font-medium">Stage</th>
                    <th className="px-2.5 py-2.5 font-medium">Assignee</th>
                    <th className="py-2.5 pr-4 pl-2.5 font-medium 2xl:pr-2.5">SLA</th>
                    <th className="hidden py-2.5 pr-4 pl-2.5 text-right font-medium 2xl:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((w) => (
                    <WorkOrderRow
                      key={w.id}
                      wo={w}
                      now={now}
                      propertyName={propertyNames.get(w.propertyId) ?? w.propertyId}
                      tech={w.assigneeId ? techById.get(w.assigneeId) : undefined}
                      selected={w.id === selectedId}
                      onOpen={openDrawer}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2.5 text-[11px] text-fg-3">
              {filtered.length} work order{filtered.length === 1 ? '' : 's'} · open first, P1 first, then by SLA due time
            </div>
          </Card>

          <div className="flex flex-col gap-2.5 md:hidden">
            {filtered.map((w) => (
              <WorkOrderCard
                key={w.id}
                wo={w}
                now={now}
                propertyName={propertyNames.get(w.propertyId) ?? w.propertyId}
                tech={w.assigneeId ? techById.get(w.assigneeId) : undefined}
                selected={w.id === selectedId}
                onOpen={openDrawer}
              />
            ))}
          </div>
        </>
      )}

      <WoCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false)
          setStatus('open')
          openDrawer(id)
        }}
      />

      <WorkOrderDrawer workOrderId={selectedId} onClose={closeDrawer} />
    </>
  )
}
