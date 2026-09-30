import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Activity, ArrowRight, Bell, ChevronRight, Crosshair, Gauge, Network, Server, Siren, type LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Select, TONE_SOFT, type Tone } from '@/components/ui'
import { NetOntDrawer } from '@/components/ops/NetOntDrawer'
import { OntStatusBadge } from '@/components/ops/NetParts'
import { NetTopology, NetTopologyLegend } from '@/components/ops/NetTopology'
import { ONT_ALARM_RANK, ONT_STATUS_ICON, detectFiberCuts, type CutDetection } from '@/components/ops/NetUtils'
import { AssigneeChip, SlaBadge } from '@/components/ops/WoParts'
import { DEMO_PROPERTY_ID } from '@/data/seed'
import { cn } from '@/lib/cn'
import { dbm, num, pct, timeAgo } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { ONT_STATUS_LABEL, ONT_STATUS_TONE, isOpen } from '@/lib/workflows'
import { bestTechnicianFor } from '@/sim/engine'
import { useStore } from '@/store/useStore'
import type { OntStatus } from '@/types'

function SummaryTile({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: LucideIcon; tone: Tone }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', TONE_SOFT[tone])}>
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

function FiberCutCallout({ cut, onLocate }: { cut: CutDetection; onLocate: (propertyId: string) => void }) {
  const now = useNow()
  const workOrders = useStore((s) => s.ops.workOrders)
  const technicians = useStore((s) => s.ops.technicians)
  const properties = useStore((s) => s.ops.properties)
  const createWorkOrder = useStore((s) => s.createWorkOrder)
  const wo =
    workOrders.find((w) => isOpen(w) && w.splitterId === cut.splitter.id) ??
    workOrders.find((w) => isOpen(w) && w.incident === 'fiber-cut' && w.propertyId === cut.splitter.propertyId)
  const tech = technicians.find((t) => t.id === wo?.assigneeId)
  const property = properties.find((p) => p.id === cut.splitter.propertyId)

  const dispatch = () => {
    const best = bestTechnicianFor(useStore.getState(), 'emergency')
    createWorkOrder({
      type: 'emergency',
      priority: 'P1',
      title: `Fiber cut — ${cut.splitter.name} · ${cut.ontCount} homes down`,
      description: `PON alarm: loss of signal on ${cut.ontCount} ONTs downstream of ${cut.splitter.name} (${cut.splitter.cabinet}). Locate with OTDR, splice, test and document.`,
      propertyId: cut.splitter.propertyId,
      splitterId: cut.splitter.id,
      source: 'Auto-detect',
      incident: 'fiber-cut',
      assigneeId: best?.id ?? null,
    })
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-critical-line bg-critical-soft p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 animate-siren opacity-60" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-critical-soft text-critical-fg ring-1 ring-critical-line ring-inset">
            <Siren className="size-5" />
            <span className="absolute -top-1 -right-1 size-3 animate-ping rounded-full bg-critical" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-wider text-critical-fg uppercase">Critical · PON alarm</div>
            <div className="mt-0.5 text-base font-semibold text-critical-fg">
              Possible fiber cut upstream of {cut.splitter.name} ({cut.ontCount} ONTs LOS)
            </div>
            <div className="mt-1 text-xs text-critical-fg">
              {property?.name} · {cut.splitter.cabinet} · every ONT on this {cut.splitter.ratio} splitter lost light at the same time, which points to a distribution cable cut rather than individual drops.
            </div>
            {wo && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Badge tone="critical" className="font-mono">
                  {wo.number}
                </Badge>
                <SlaBadge wo={wo} now={now} />
                <AssigneeChip tech={tech} className="text-critical-fg" />
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={Crosshair} onClick={() => onLocate(cut.splitter.propertyId)}>
            Show in topology
          </Button>
          {wo ? (
            <Link
              to={`/ops/work-orders?id=${wo.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-critical px-3 text-xs font-medium text-white transition hover:bg-critical"
            >
              Open {wo.number}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <Button variant="danger" size="sm" icon={Siren} onClick={dispatch}>
              Dispatch emergency crew
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OpsNetwork() {
  const [params, setParams] = useSearchParams()
  const propertyParam = params.get('property')
  const ontId = params.get('ont')
  const now = useNow(5000)
  const partner = usePartner()
  const olts = useStore((s) => s.ops.olts)
  const properties = useStore((s) => s.ops.properties)
  const splitters = useStore((s) => s.ops.splitters)
  const onts = useStore((s) => s.ops.onts)
  const lightLevels = useStore((s) => s.ops.lightLevels)

  const propertyId = properties.some((p) => p.id === propertyParam) ? (propertyParam as string) : DEMO_PROPERTY_ID

  const setParam = (key: string, value: string | null) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: key !== 'ont' || !value },
    )
  }

  const locate = (pid: string) => {
    setParam('property', pid)
    window.requestAnimationFrame(() => document.getElementById('topology')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const cuts = useMemo(() => detectFiberCuts(splitters, onts), [splitters, onts])

  const counts = useMemo(() => {
    const c: Record<OntStatus, number> = { online: 0, degraded: 0, los: 0, offline: 0 }
    let rxSum = 0
    let rxCount = 0
    for (const o of onts) {
      c[o.status] += 1
      if (o.rxPowerDbm !== null && o.status !== 'los' && o.status !== 'offline') {
        rxSum += o.rxPowerDbm
        rxCount += 1
      }
    }
    return { ...c, total: onts.length, avgRx: rxCount ? rxSum / rxCount : null }
  }, [onts])

  const alarms = useMemo(
    () =>
      onts
        .filter((o) => o.status !== 'online')
        .sort((a, b) => ONT_ALARM_RANK[a.status] - ONT_ALARM_RANK[b.status] || a.propertyId.localeCompare(b.propertyId) || a.unit.localeCompare(b.unit, 'en', { numeric: true })),
    [onts],
  )

  const oltStats = useMemo(
    () =>
      olts.map((olt) => {
        const served = properties.filter((p) => p.oltId === olt.id)
        const ids = new Set(served.map((p) => p.id))
        const behind = onts.filter((o) => ids.has(o.propertyId))
        const online = behind.filter((o) => o.status === 'online').length
        const alarmCount = behind.length - online
        const los = behind.filter((o) => o.status === 'los').length
        return { olt, served, total: behind.length, online, alarmCount, los }
      }),
    [olts, properties, onts],
  )

  const topoProperty = properties.find((p) => p.id === propertyId)
  const topoOnts = onts.filter((o) => o.propertyId === propertyId)
  const topoOnline = topoOnts.filter((o) => o.status === 'online').length
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? id
  const ontById = (id: string) => onts.find((o) => o.id === id)

  return (
    <>
      <PageHeader
        eyebrow="Network operations"
        title="GPON network"
        subtitle={`${olts.length} OLTs · ${splitters.length} splitters · ${num(onts.length)} ONTs on ${partner.name} fiber`}
        actions={
          <Badge tone={cuts.length ? 'critical' : alarms.length ? 'warning' : 'good'} dot>
            {cuts.length ? `${cuts.length} critical PON alarm${cuts.length > 1 ? 's' : ''}` : `${alarms.length} ONT alarms`}
          </Badge>
        }
      />

      {cuts.length > 0 && (
        <div className="mb-5 flex flex-col gap-3">
          {cuts.map((cut) => (
            <FiberCutCallout key={cut.splitter.id} cut={cut} onLocate={locate} />
          ))}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <SummaryTile label="ONTs online" value={pct(counts.total ? counts.online / counts.total : 0, 1)} hint={`${num(counts.online)} of ${num(counts.total)}`} icon={ONT_STATUS_ICON.online} tone="good" />
        <SummaryTile label={ONT_STATUS_LABEL.degraded} value={String(counts.degraded)} hint="Below −27 dBm" icon={ONT_STATUS_ICON.degraded} tone={counts.degraded ? 'warning' : 'neutral'} />
        <SummaryTile label="Loss of signal" value={String(counts.los)} hint={counts.los ? 'No light at ONT' : 'No LOS alarms'} icon={ONT_STATUS_ICON.los} tone={counts.los ? 'critical' : 'neutral'} />
        <SummaryTile label={ONT_STATUS_LABEL.offline} value={String(counts.offline)} hint="Powered down / unreachable" icon={ONT_STATUS_ICON.offline} tone="neutral" />
        <SummaryTile label="Avg Rx power" value={counts.avgRx === null ? '—' : `${counts.avgRx.toFixed(1)} dBm`} hint="Online & low-light ONTs" icon={Gauge} tone="accent" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {oltStats.map(({ olt, served, total, online, alarmCount, los }) => {
          const utilization = olt.usedPorts / olt.ponPorts
          return (
            <Card key={olt.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-fg ring-1 ring-accent-line ring-inset">
                    <Server className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-fg">{olt.name}</div>
                    <div className="truncate text-xs text-fg-3">{olt.location}</div>
                  </div>
                </div>
                {los ? (
                  <Badge tone="critical" icon={ONT_STATUS_ICON.los}>
                    {los} LOS
                  </Badge>
                ) : alarmCount ? (
                  <Badge tone="warning" icon={Bell}>
                    {alarmCount} alarm{alarmCount === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge tone="good" dot>
                    No alarms
                  </Badge>
                )}
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-fg-3">PON ports</span>
                  <span className="text-fg tabular">
                    {olt.usedPorts}/{olt.ponPorts} <span className="text-fg-3">({pct(utilization)})</span>
                  </span>
                </div>
                <ProgressBar value={utilization} tone={utilization > 0.8 ? 'warning' : 'accent'} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-surface-2 px-2 py-2 ring-1 ring-border ring-inset">
                  <div className="text-sm font-semibold text-fg tabular">{total}</div>
                  <div className="text-[10px] text-fg-3 uppercase">ONTs</div>
                </div>
                <div className="rounded-lg bg-surface-2 px-2 py-2 ring-1 ring-border ring-inset">
                  <div className={cn('text-sm font-semibold tabular', online / Math.max(1, total) >= 0.98 ? 'text-good-fg' : 'text-warning-fg')}>{pct(online / Math.max(1, total), 1)}</div>
                  <div className="text-[10px] text-fg-3 uppercase">Online</div>
                </div>
                <div className="rounded-lg bg-surface-2 px-2 py-2 ring-1 ring-border ring-inset">
                  <div className="text-sm font-semibold text-fg tabular">{served.length}</div>
                  <div className="text-[10px] text-fg-3 uppercase">Sites</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {served.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => locate(p.id)}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] ring-1 transition ring-inset',
                      p.id === propertyId ? 'bg-accent-soft text-accent-fg ring-accent-line' : 'bg-surface-2 text-fg-3 ring-border hover:text-fg',
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" padded={false}>
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardHeader
              title="Active alarms"
              subtitle={`${alarms.length} ONTs not fully online · live`}
              icon={Bell}
              className="mb-3"
              action={
                <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                  {(['los', 'degraded', 'offline'] as const).map((s) => (
                    <Badge key={s} tone={ONT_STATUS_TONE[s]}>
                      {counts[s]} {ONT_STATUS_LABEL[s]}
                    </Badge>
                  ))}
                </div>
              }
            />
          </div>
          {alarms.length ? (
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto border-t border-border">
              {alarms.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setParam('ont', o.id)}
                    className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-3 sm:px-5', o.id === ontId && 'bg-surface-2')}
                  >
                    <OntStatusBadge status={o.status} className="w-[88px] justify-center" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-fg">{o.unit}</span>
                        {o.isDemoHome && (
                          <Badge tone="accent" className="hidden sm:inline-flex">
                            Demo home
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-fg-3">
                        {propertyName(o.propertyId)} · <span className="font-mono">{splitters.find((s) => s.id === o.splitterId)?.name}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={cn('font-mono text-xs', o.rxPowerDbm === null ? 'text-critical-fg' : 'text-warning-fg')}>{dbm(o.rxPowerDbm)}</div>
                      <div className="hidden text-[11px] text-fg-3 sm:block">tested {timeAgo(o.lastTestAt, now)}</div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-fg-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Network} title="All ONTs online" message="No LOS, low-light or offline alarms across the network." />
          )}
        </Card>

        <Card className="lg:col-span-2" padded={false}>
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardHeader title="Light-level tests" subtitle="Remote polls & field meter readings" icon={Activity} className="mb-3" />
          </div>
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto border-t border-border">
            {lightLevels.slice(0, 12).map((r) => {
              const ont = ontById(r.ontId)
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setParam('ont', r.ontId)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-fg">{ont?.unit ?? r.ontId}</div>
                      <div className="truncate text-xs text-fg-3">
                        {ont ? propertyName(ont.propertyId) : '—'} · {r.by}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-xs text-fg">{r.dbm.toFixed(1)} dBm</span>
                      <span className="text-[11px] text-fg-3">{timeAgo(r.at, now)}</span>
                    </div>
                    <Badge tone={r.pass ? 'good' : 'critical'} className="w-12 justify-center">
                      {r.pass ? 'Pass' : 'Fail'}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div id="topology" className="scroll-mt-20">
        <Card padded={false}>
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-2 ring-1 ring-border">
                <Network className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-fg">Topology explorer</h3>
                <p className="mt-0.5 text-xs text-fg-3">
                  OLT → 1:4 feeder splitters → 1:8 distribution splitters → ONTs · {topoOnts.length} ONTs · {pct(topoOnts.length ? topoOnline / topoOnts.length : 0, 1)} online
                </p>
              </div>
            </div>
            <Select value={propertyId} onChange={(e) => setParam('property', e.target.value)} className="md:w-72" aria-label="Property">
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.type}
                </option>
              ))}
            </Select>
          </div>
          <div className="p-4 sm:p-5">
            <NetTopologyLegend className="mb-5" />
            {topoProperty ? (
              <NetTopology propertyId={propertyId} selectedOntId={ontId} onSelectOnt={(id) => setParam('ont', id)} />
            ) : (
              <EmptyState icon={Network} title="Property not found" />
            )}
          </div>
        </Card>
      </div>

      <NetOntDrawer key={ontId ?? 'none'} ontId={ontId} onClose={() => setParam('ont', null)} />
    </>
  )
}
