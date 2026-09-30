import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Check, ChevronRight, ClipboardList, House, MapPin, Network, Search, Server, UserRound } from 'lucide-react'
import { Badge, Drawer, EmptyState, Input, ProgressBar, SectionTitle, StatusDot, TONE_DOT } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency, num, pct, timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { ONT_STATUS_LABEL, ONT_STATUS_TONE, PRIORITY_TONE, WORK_ORDER_TYPE_LABEL, WORK_ORDER_TYPE_TONE, isOpen, stageLabel } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { OntStatus, Property } from '@/types'
import { PACKAGE_TONE } from './InstPackages'
import { ASSET_KIND_ICON, ASSET_KIND_LABEL, AssigneeChip, ConditionBadge, workOrderHref } from './MntShared'
import { DEMO_PROPERTY, PROPERTY_TYPE_TONE } from './PropCard'

const STATUS_ORDER: OntStatus[] = ['online', 'degraded', 'los', 'offline']
const MAX_ROWS = 150

function signedDbm(value: number | null): string {
  if (value === null) return 'No light'
  return `${value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`
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
    <div className="flex flex-col gap-7">
      <section>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={PROPERTY_TYPE_TONE[property.type]}>{property.type}</Badge>
          <Badge tone={property.contract === 'Bulk' ? 'good' : 'neutral'}>{property.contract} contract</Badge>
          <Badge tone={PACKAGE_TONE[property.package]}>{property.package} package</Badge>
          {property.id === DEMO_PROPERTY && (
            <Badge tone="accent" icon={House}>
              Demo home inside
            </Badge>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Units', value: num(property.units) },
            { label: 'Smart-home', value: `${property.smartHomeUnits}` },
            { label: 'Contract', value: `${currency(property.monthlyContract)}/mo` },
            { label: 'Open WOs', value: `${openOrders.length}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-border">
              <div className="text-[11px] text-fg-3">{s.label}</div>
              <div className="mt-0.5 text-base font-semibold text-fg">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-fg-3">Smart-home adoption</span>
            <span className="text-fg-2 tabular">
              <span className="font-semibold text-fg">{pct(adoption)}</span> · {property.smartHomeUnits}/{property.units} units
            </span>
          </div>
          <ProgressBar value={adoption} />
        </div>
        <div className="mt-4 flex flex-col gap-1.5 text-xs text-fg-3">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5 text-fg-3" />
            {property.manager}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-fg-3" />
            {property.address}, {property.city}
          </span>
        </div>
      </section>

      <section>
        <SectionTitle>GPON network</SectionTitle>
        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-2 ring-1 ring-border">
                <Network className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="font-mono text-sm text-fg">{olt?.name ?? property.oltId}</div>
                <div className="truncate text-xs text-fg-3">{olt?.location ?? '—'}</div>
              </div>
            </div>
            {olt && (
              <span className="shrink-0 text-xs text-fg-3 tabular">
                {olt.usedPorts}/{olt.ponPorts} PON ports
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-fg-3">Primary splitters</div>
              <div className="mt-0.5 text-fg">
                <span className="font-semibold tabular">{primary.length}</span> × 1:4
              </div>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-fg-3">Secondary splitters</div>
              <div className="mt-0.5 text-fg">
                <span className="font-semibold tabular">{secondary.length}</span> × 1:8
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between text-xs">
              <span className="text-fg-3">ONT status · {onts.length} ONTs</span>
              <span className="text-fg-3 tabular">Avg Rx {avgRx === null ? '—' : `${signedDbm(avgRx)} dBm`}</span>
            </div>
            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              {STATUS_ORDER.map((status) =>
                statusCounts[status] > 0 ? (
                  <span key={status} className={cn('h-full', TONE_DOT[ONT_STATUS_TONE[status]])} style={{ width: `${(statusCounts[status] / Math.max(1, onts.length)) * 100}%` }} />
                ) : null,
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                  <StatusDot tone={ONT_STATUS_TONE[status]} pulse={status === 'los' && statusCounts.los > 0} />
                  <div className="min-w-0">
                    <div className="text-[11px] text-fg-3">{ONT_STATUS_LABEL[status]}</div>
                    <div className="text-sm font-semibold text-fg tabular">{statusCounts[status]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle action={<span className="text-[11px] text-fg-3 tabular">{openOrders.length} open</span>}>Open work orders</SectionTitle>
        {openOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={ClipboardList} title="No open work orders" message="Everything at this property is closed out." />
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {openOrders.map((wo) => (
              <li key={wo.id}>
                <Link to={workOrderHref(wo.id)} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-fg-3">{wo.number}</span>
                      <Badge tone={PRIORITY_TONE[wo.priority]}>{wo.priority}</Badge>
                      <Badge tone={WORK_ORDER_TYPE_TONE[wo.type]}>{WORK_ORDER_TYPE_LABEL[wo.type]}</Badge>
                    </div>
                    <div className="mt-1 truncate text-sm text-fg">{wo.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-3">
                      <span>{stageLabel(wo)}</span>
                      <AssigneeChip tech={wo.assigneeId ? techById.get(wo.assigneeId) : undefined} />
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-fg-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle action={<span className="text-[11px] text-fg-3 tabular">{assets.length} assets</span>}>Plant assets</SectionTitle>
        {assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border">
            <EmptyState icon={Server} title="No assets registered" />
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {assets.map((a) => {
              const Icon = ASSET_KIND_ICON[a.kind]
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className="size-4 shrink-0 text-fg-3" />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-fg">{a.name}</div>
                    <div className="text-[11px] text-fg-3">
                      {ASSET_KIND_LABEL[a.kind]} · inspected {timeAgo(a.lastInspectedAt, now)}
                    </div>
                  </div>
                  <ConditionBadge condition={a.condition} />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle action={<span className="text-[11px] text-fg-3 tabular">{filtered.length === onts.length ? `${onts.length} units` : `${filtered.length} of ${onts.length}`}</span>}>
          Units
        </SectionTitle>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search unit, resident or ONT serial" className="pl-9!" aria-label="Search units" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="relative max-h-[420px] overflow-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="sticky top-0 z-10 bg-surface-2">
                <tr className="text-left text-[11px] tracking-wider text-fg-3 uppercase">
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Resident</th>
                  <th className="px-3 py-2 font-medium">ONT</th>
                  <th className="px-3 py-2 text-right font-medium">Rx dBm</th>
                  <th className="px-4 py-2 text-center font-medium">Smart home</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((o) => (
                  <tr key={o.id} className={cn('transition hover:bg-surface-3', o.isDemoHome && 'bg-accent-soft')}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-fg">
                        {o.unit}
                        {o.isDemoHome && (
                          <Badge tone="accent" icon={House}>
                            Demo
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-fg-4">{o.serial}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-fg-2">{o.resident}</td>
                    <td className="px-3 py-2">
                      <Badge tone={ONT_STATUS_TONE[o.status]} dot>
                        {ONT_STATUS_LABEL[o.status]}
                      </Badge>
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono text-xs tabular', o.rxPowerDbm !== null && o.rxPowerDbm <= -27 ? 'text-warning-fg' : 'text-fg-2')}>{signedDbm(o.rxPowerDbm)}</td>
                    <td className="px-4 py-2 text-center">
                      {o.smartHome ? (
                        <span className="inline-flex items-center justify-center text-good-fg" title="Smart-home installed">
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
          {filtered.length > rows.length && <div className="border-t border-border px-4 py-2 text-[11px] text-fg-3">Showing first {rows.length} of {filtered.length} — refine the search to narrow down.</div>}
        </div>
      </section>
    </div>
  )
}

export function PropDrawer({ property, onClose }: { property: Property | undefined; onClose: () => void }) {
  if (!property) return null
  return (
    <Drawer open onClose={onClose} title={property.name} subtitle={`${property.address} · ${property.city}`} width="max-w-2xl">
      <PropDrawerBody key={property.id} property={property} />
    </Drawer>
  )
}
