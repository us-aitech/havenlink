import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Check, ChevronRight, ClipboardList, Search, Server } from 'lucide-react'
import { Badge, Drawer, EmptyState, Input, KeyValue, ProgressBar, StatusDot, TONE_DOT } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency, num, pct, timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { ONT_STATUS_LABEL, ONT_STATUS_TONE, PRIORITY_TONE, WORK_ORDER_TYPE_LABEL, isOpen, stageLabel } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { OntStatus, Property } from '@/types'
import { ASSET_KIND_ICON, ASSET_KIND_LABEL, AssigneeChip, ConditionBadge, workOrderHref } from './MntShared'
import { DEMO_PROPERTY } from './PropCard'

const STATUS_ORDER: OntStatus[] = ['online', 'degraded', 'los', 'offline']
const MAX_ROWS = 150

function signedDbm(value: number | null): string {
  if (value === null) return 'No light'
  return `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`
}

function Section({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {meta && <span className="text-xs text-fg-3 tabular">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

function PropDrawerBody({ property }: { property: Property }) {
  const now = useNow(30_000)
  const olts = useStore((s) => s.ops.olts)
  const splitters = useStore((s) => s.ops.splitters)
  const allOnts = useStore((s) => s.ops.onts)
  const workOrders = useStore((s) => s.ops.workOrders)
  const allAssets = useStore((s) => s.ops.assets)
  const technicians = useStore((s) => s.ops.technicians)
  const [query, setQuery] = useState('')

  const olt = olts.find((o) => o.id === property.oltId)
  const propertySplitters = splitters.filter((s) => s.propertyId === property.id)
  const primary = propertySplitters.filter((s) => s.parentId === null)
  const secondary = propertySplitters.filter((s) => s.parentId !== null)
  const onts = useMemo(() => allOnts.filter((o) => o.propertyId === property.id), [allOnts, property.id])
  const statusCounts = useMemo(() => {
    const counts: Record<OntStatus, number> = { online: 0, degraded: 0, los: 0, offline: 0 }
    for (const o of onts) counts[o.status] += 1
    return counts
  }, [onts])
  const withLight = onts.filter((o) => o.rxPowerDbm !== null)
  const avgRx = withLight.length ? withLight.reduce((sum, o) => sum + (o.rxPowerDbm ?? 0), 0) / withLight.length : null
  const openOrders = workOrders
    .filter((w) => w.propertyId === property.id && isOpen(w))
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.dueAt - b.dueAt)
  const assets = allAssets.filter((a) => a.propertyId === property.id)
  const techById = new Map(technicians.map((t) => [t.id, t]))
  const adoption = property.units ? property.smartHomeUnits / property.units : 0

  const q = query.trim().toLowerCase()
  const filtered = q ? onts.filter((o) => o.unit.toLowerCase().includes(q) || o.resident.toLowerCase().includes(q) || o.serial.toLowerCase().includes(q)) : onts
  const rows = filtered.slice(0, MAX_ROWS)

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{property.contract} contract</Badge>
          <Badge>{property.package} package</Badge>
          {property.id === DEMO_PROPERTY && <Badge tone="accent">Demo home inside</Badge>}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          {[
            { label: 'Units', value: num(property.units) },
            { label: 'Smart-home units', value: num(property.smartHomeUnits) },
            { label: 'Contract value', value: `${currency(property.monthlyContract)}/mo` },
            { label: 'Open work orders', value: num(openOrders.length) },
          ].map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-xs text-fg-3">{s.label}</dt>
              <dd className="mt-0.5 text-base font-semibold text-fg tabular">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-fg-3">Smart-home adoption</span>
            <span className="text-fg-3 tabular">
              <span className="font-medium text-fg">{pct(adoption)}</span> · {property.smartHomeUnits} of {property.units} units
            </span>
          </div>
          <ProgressBar value={adoption} />
        </div>
        <div className="mt-4 divide-y divide-border border-y border-border">
          <KeyValue label="Property manager" value={property.manager} />
          <KeyValue label="Address" value={`${property.address}, ${property.city}`} />
        </div>
      </section>

      <Section title="GPON network" meta={`${onts.length} ONTs`}>
        <div className="divide-y divide-border border-y border-border">
          <KeyValue
            label="OLT"
            value={
              <span className="flex flex-col items-end">
                <span className="font-mono text-xs font-normal">{olt?.name ?? property.oltId}</span>
                {olt && <span className="text-xs font-normal text-fg-3">{olt.location}</span>}
              </span>
            }
          />
          {olt && <KeyValue label="PON ports in use" value={<span className="tabular">{`${olt.usedPorts} of ${olt.ponPorts}`}</span>} />}
          <KeyValue label="Splitters" value={<span className="tabular">{`${primary.length} × 1:4 primary · ${secondary.length} × 1:8 secondary`}</span>} />
          <KeyValue label="Average Rx power" value={<span className="font-mono text-xs font-normal tabular">{avgRx === null ? '—' : `${signedDbm(avgRx)} dBm`}</span>} />
        </div>
        <div className="mt-4">
          <div className="mb-2 text-xs text-fg-3">ONT status</div>
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            {STATUS_ORDER.map((status) =>
              statusCounts[status] > 0 ? (
                <span key={status} className={cn('h-full', TONE_DOT[ONT_STATUS_TONE[status]])} style={{ width: `${(statusCounts[status] / Math.max(1, onts.length)) * 100}%` }} />
              ) : null,
            )}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
            {STATUS_ORDER.map((status) => (
              <li key={status} className="inline-flex items-center gap-2">
                <StatusDot tone={ONT_STATUS_TONE[status]} pulse={status === 'los' && statusCounts.los > 0} />
                <span className="text-fg-3">{ONT_STATUS_LABEL[status]}</span>
                <span className="font-medium text-fg tabular">{statusCounts[status]}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Open work orders" meta={`${openOrders.length} open`}>
        {openOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong">
            <EmptyState icon={ClipboardList} title="No open work orders" message="Everything at this property is closed out." />
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {openOrders.map((wo) => (
              <li key={wo.id}>
                <Link to={workOrderHref(wo.id)} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[13px] leading-5 font-medium text-fg">{wo.title}</span>
                      {wo.priority !== 'P3' && <Badge tone={PRIORITY_TONE[wo.priority]}>{wo.priority}</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-3">
                      <span className="font-mono">{wo.number}</span>
                      <span aria-hidden className="text-fg-4">
                        ·
                      </span>
                      <span>{WORK_ORDER_TYPE_LABEL[wo.type]}</span>
                      <span aria-hidden className="text-fg-4">
                        ·
                      </span>
                      <span>{stageLabel(wo)}</span>
                    </div>
                  </div>
                  <div className="hidden w-36 sm:block">
                    <AssigneeChip tech={wo.assigneeId ? techById.get(wo.assigneeId) : undefined} />
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-fg-4 transition-colors group-hover:text-fg-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Plant assets" meta={`${assets.length} assets`}>
        {assets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong">
            <EmptyState icon={Server} title="No assets registered" message="Cabinets and pedestals appear here once surveyed." />
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {assets.map((a) => {
              const Icon = ASSET_KIND_ICON[a.kind]
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className="size-4 shrink-0 text-fg-3" />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs leading-5 text-fg">{a.name}</div>
                    <div className="text-xs text-fg-3">
                      {ASSET_KIND_LABEL[a.kind]} · inspected {timeAgo(a.lastInspectedAt, now)}
                    </div>
                  </div>
                  <ConditionBadge condition={a.condition} />
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="Units" meta={filtered.length === onts.length ? `${onts.length} units` : `${filtered.length} of ${onts.length}`}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search unit, resident or ONT serial" className="pl-9" aria-label="Search units" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="relative max-h-[420px] overflow-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-surface-2 text-left text-xs text-fg-3">
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Resident</th>
                  <th className="px-3 py-2 font-medium">ONT status</th>
                  <th className="px-3 py-2 text-right font-medium">Rx power</th>
                  <th className="px-4 py-2 text-center font-medium">Smart home</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((o) => (
                  <tr key={o.id} className={cn('transition-colors', o.isDemoHome ? 'bg-accent-soft' : 'hover:bg-surface-2')}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-fg">
                        {o.unit}
                        {o.isDemoHome && <Badge tone="accent">Demo</Badge>}
                      </div>
                      <div className="font-mono text-[11px] text-fg-3">{o.serial}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-fg-2">{o.resident}</td>
                    <td className="px-3 py-2">
                      <Badge tone={ONT_STATUS_TONE[o.status]} dot>
                        {ONT_STATUS_LABEL[o.status]}
                      </Badge>
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono text-xs whitespace-nowrap tabular', o.rxPowerDbm !== null && o.rxPowerDbm <= -27 ? 'text-warning-fg' : 'text-fg-2')}>
                      {o.rxPowerDbm === null ? 'No light' : `${signedDbm(o.rxPowerDbm)} dBm`}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {o.smartHome ? (
                        <span className="inline-flex items-center justify-center text-fg-2" title="Smart home installed">
                          <Check className="size-4" />
                          <span className="sr-only">Yes</span>
                        </span>
                      ) : (
                        <span className="text-fg-4">
                          —<span className="sr-only">No</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <EmptyState icon={Search} title="No units match" message={`Nothing matches “${query.trim()}”.`} />}
          </div>
          {filtered.length > rows.length && <div className="border-t border-border bg-surface-2 px-4 py-2 text-xs text-fg-3">Showing the first {rows.length} of {filtered.length}. Refine the search to narrow down.</div>}
        </div>
      </Section>
    </div>
  )
}

export function PropDrawer({ property, onClose }: { property: Property | undefined; onClose: () => void }) {
  if (!property) return null
  return (
    <Drawer open onClose={onClose} title={property.name} subtitle={`${property.type} · ${property.city}`} width="max-w-2xl">
      <PropDrawerBody key={property.id} property={property} />
    </Drawer>
  )
}
