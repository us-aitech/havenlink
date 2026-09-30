import { useMemo, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ClipboardList, Plus, Search } from 'lucide-react'
import { Button, Card, EmptyState, Input, PageHeader, Segmented, Select, Stat, type SegmentOption } from '@/components/ui'
import { WoCreateModal } from '@/components/ops/WoCreateModal'
import { AssigneeChip, PriorityBadge, SlaBadge, StageMeter, TypeLabel } from '@/components/ops/WoParts'
import { WO_TYPE_ORDER, WO_TYPE_SHORT, compareWorkOrders } from '@/components/ops/WoUtils'
import { WorkOrderDrawer } from '@/components/ops/WorkOrderDrawer'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { isOpen, slaState } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { Technician, WorkOrder, WorkOrderType } from '@/types'

type TypeFilter = 'all' | WorkOrderType
type StatusFilter = 'open' | 'closed' | 'all'

const DAY = 86_400_000

interface RowProps {
  wo: WorkOrder
  now: number
  propertyName: string
  tech: Technician | undefined
  selected: boolean
  onOpen: (id: string) => void
}

function WorkOrderRow({ wo, now, propertyName, tech, selected, onOpen }: RowProps) {
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
      aria-selected={selected}
      className={cn('cursor-pointer transition-colors outline-none hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:shadow-[inset_2px_0_0_var(--accent)]', selected && 'bg-accent-soft hover:bg-accent-soft')}
    >
      <td className="py-3 pr-2 pl-5 align-top">
        <PriorityBadge priority={wo.priority} className={cn('mt-px', !open && 'opacity-60')} />
      </td>
      <td className="px-3 py-3 align-top font-mono text-xs leading-5 whitespace-nowrap text-fg-3">{wo.number}</td>
      <td className="w-full max-w-0 px-3 py-3">
        <div className={cn('truncate text-[13px] leading-5 font-medium', open ? 'text-fg' : 'text-fg-2')} title={wo.title}>
          {wo.title}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fg-3">
          <TypeLabel type={wo.type} className="shrink-0 text-fg-3" />
          <span className="text-fg-4">·</span>
          <span className="truncate">
            {propertyName}
            {wo.unit && ` · ${wo.unit}`}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <StageMeter wo={wo} className="w-36" />
      </td>
      <td className="px-3 py-3 align-top whitespace-nowrap">
        <SlaBadge wo={wo} now={now} className="mt-px" />
      </td>
      <td className="px-3 py-3 align-top">
        <AssigneeChip tech={tech} className="max-w-40" />
      </td>
      <td className="hidden py-3 pr-5 pl-3 text-right align-top text-xs leading-5 whitespace-nowrap text-fg-3 tabular xl:table-cell">{timeAgo(wo.createdAt, now)}</td>
    </tr>
  )
}

function WorkOrderListItem({ wo, now, propertyName, tech, selected, onOpen }: RowProps) {
  const open = isOpen(wo)
  return (
    <li>
      <button type="button" onClick={() => onOpen(wo.id)} className={cn('flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-surface-2', selected && 'bg-accent-soft hover:bg-accent-soft')}>
        <div className="flex w-full items-center gap-2">
          <PriorityBadge priority={wo.priority} />
          <span className="font-mono text-xs text-fg-3">{wo.number}</span>
          <SlaBadge wo={wo} now={now} className="ml-auto" />
        </div>
        <div className="w-full min-w-0">
          <div className={cn('text-[13px] leading-5 font-medium', open ? 'text-fg' : 'text-fg-2')}>{wo.title}</div>
          <div className="mt-0.5 truncate text-xs text-fg-3">
            {WO_TYPE_SHORT[wo.type]} · {propertyName}
            {wo.unit && ` · ${wo.unit}`}
          </div>
        </div>
        <div className="flex w-full items-center gap-4">
          <StageMeter wo={wo} className="min-w-0 flex-1" />
          <AssigneeChip tech={tech} showName={false} />
        </div>
      </button>
    </li>
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
    ...WO_TYPE_ORDER.map((t) => ({ value: t, label: WO_TYPE_SHORT[t], count: openByType[t] })),
  ]

  const clearFilters = () => {
    setType('all')
    setStatus('all')
    setQuery('')
  }

  const rowProps = (w: WorkOrder): RowProps => ({
    wo: w,
    now,
    propertyName: propertyNames.get(w.propertyId) ?? w.propertyId,
    tech: w.assigneeId ? techById.get(w.assigneeId) : undefined,
    selected: w.id === selectedId,
    onOpen: openDrawer,
  })

  return (
    <>
      <PageHeader
        title="Work orders"
        subtitle={`Trouble calls, emergency repairs, installs, maintenance and resident support for ${partner.name}`}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            New work order
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Open work orders" value={openOrders.length} hint={`${openByType.emergency + openByType.trouble} field repairs`} />
        <Stat label="P1 emergencies" value={p1} tone={p1 ? 'critical' : 'neutral'} hint={p1 ? 'Crew dispatched' : 'None active'} />
        <Stat label="SLA at risk" value={atRisk} tone={atRisk ? 'warning' : 'neutral'} hint="At risk or breached" />
        <Stat label="Unassigned" value={unassigned} tone={unassigned ? 'warning' : 'neutral'} hint="Awaiting dispatch" />
        <Stat label="Closed in 24h" value={closed24h} hint="All work types" className="col-span-2 md:col-span-1" />
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
          <Segmented size="sm" options={typeOptions} value={type} onChange={setType} className="self-start" />
          <div className="flex gap-2 lg:ml-auto">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Status" className="h-8 w-36 shrink-0 text-[13px]">
              <option value="open">Open · {byStatus.open}</option>
              <option value="closed">Closed · {byStatus.closed}</option>
              <option value="all">All · {byStatus.all}</option>
            </Select>
            <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-4" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search number, title, unit" className="h-8 pl-8 text-[13px]" aria-label="Search work orders" />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState
              icon={ClipboardList}
              title="No work orders match"
              message="Try a different type, status or search term."
              action={
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-[13px]">
                <thead>
                  <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3">
                    <th className="py-2 pr-2 pl-5 font-medium">
                      <span className="sr-only">Priority</span>
                    </th>
                    <th className="px-3 py-2 font-medium">Number</th>
                    <th className="px-3 py-2 font-medium">Work order</th>
                    <th className="px-3 py-2 font-medium">Stage</th>
                    <th className="px-3 py-2 font-medium">SLA</th>
                    <th className="px-3 py-2 font-medium">Assignee</th>
                    <th className="hidden py-2 pr-5 pl-3 text-right font-medium xl:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((w) => (
                    <WorkOrderRow key={w.id} {...rowProps(w)} />
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border border-t border-border md:hidden">
              {filtered.map((w) => (
                <WorkOrderListItem key={w.id} {...rowProps(w)} />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-2.5 text-xs text-fg-3 sm:px-5">
              <span className="tabular">
                {filtered.length} work order{filtered.length === 1 ? '' : 's'}
              </span>
              <span className="hidden sm:inline">Sorted by status, priority and SLA due time</span>
            </div>
          </>
        )}
      </Card>

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
