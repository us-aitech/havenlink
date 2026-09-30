import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, ChevronRight, Crosshair, Network, Siren } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Select, Stat, StatusDot, type Tone } from '@/components/ui'
import { NetOntDrawer } from '@/components/ops/NetOntDrawer'
import { OntStatusBadge } from '@/components/ops/NetParts'
import { NetTopology, NetTopologyLegend } from '@/components/ops/NetTopology'
import { ONT_ALARM_RANK, detectFiberCuts, type CutDetection } from '@/components/ops/NetUtils'
import { AssigneeChip, SlaBadge } from '@/components/ops/WoParts'
import { DEMO_PROPERTY_ID } from '@/data/seed'
import { cn } from '@/lib/cn'
import { dbm, num, pct, timeAgo } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { isOpen } from '@/lib/workflows'
import { bestTechnicianFor } from '@/sim/engine'
import { useStore } from '@/store/useStore'
import type { OntStatus } from '@/types'

function FiberCutCallout({ cut, onLocate }: { cut: CutDetection; onLocate: (propertyId: string) => void }) {
  const now = useNow()
  const navigate = useNavigate()
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
    <Card className="border-critical-line bg-critical-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <StatusDot tone="critical" pulse className="mt-1.5" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-critical-fg">
              Possible fiber cut upstream of {cut.splitter.name} · {cut.ontCount} ONTs in LOS
            </div>
            <p className="mt-1 max-w-3xl text-[13px] text-fg-2">
              {property?.name} · {cut.splitter.cabinet}. Every ONT on this {cut.splitter.ratio} splitter lost light at the same time, which points to a distribution cable cut rather than individual drops.
            </p>
            {wo ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
                <span className="font-mono text-xs text-fg-2">{wo.number}</span>
                <SlaBadge wo={wo} now={now} />
                <AssigneeChip tech={tech} />
              </div>
            ) : (
              <div className="mt-3 text-[13px] font-medium text-critical-fg">No crew dispatched yet</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 pl-5 lg:pl-0">
          <Button variant="secondary" size="sm" icon={Crosshair} onClick={() => onLocate(cut.splitter.propertyId)}>
            Show in topology
          </Button>
          {wo ? (
            <Button variant="danger" size="sm" iconRight={ArrowRight} onClick={() => navigate(`/ops/work-orders?id=${wo.id}`)}>
              Open {wo.number}
            </Button>
          ) : (
            <Button variant="danger" size="sm" icon={Siren} onClick={dispatch}>
              Dispatch emergency crew
            </Button>
          )}
        </div>
      </div>
    </Card>
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

  const topoOnts = onts.filter((o) => o.propertyId === propertyId)
  const topoOnline = topoOnts.filter((o) => o.status === 'online').length
  const topoProperty = properties.find((p) => p.id === propertyId)
  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? id
  const splitterName = (id: string) => splitters.find((s) => s.id === id)?.name ?? id
  const ontById = (id: string) => onts.find((o) => o.id === id)
  const onlineShare = counts.total ? counts.online / counts.total : 0

  const headerStatus: { tone: Tone; text: string } = cuts.length
    ? { tone: 'critical', text: `${cuts.length} critical PON alarm${cuts.length > 1 ? 's' : ''}` }
    : alarms.length
      ? { tone: 'warning', text: `${alarms.length} ONT alarm${alarms.length > 1 ? 's' : ''}` }
      : { tone: 'good', text: 'No active alarms' }

  return (
    <>
      <PageHeader
        title="GPON network"
        subtitle={`${olts.length} OLTs · ${splitters.length} splitters · ${num(onts.length)} ONTs on ${partner.name} fiber`}
        actions={
          <span className="inline-flex items-center gap-2 text-[13px] text-fg-2">
            <StatusDot tone={headerStatus.tone} pulse={headerStatus.tone === 'critical'} />
            {headerStatus.text}
          </span>
        }
      />

      {cuts.length > 0 && (
        <div className="mb-6 flex flex-col gap-4">
          {cuts.map((cut) => (
            <FiberCutCallout key={cut.splitter.id} cut={cut} onLocate={locate} />
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="ONTs online" value={pct(onlineShare, 1)} tone={onlineShare < 0.95 ? 'critical' : onlineShare < 0.98 ? 'warning' : 'neutral'} hint={`${num(counts.online)} of ${num(counts.total)}`} />
        <Stat label="Low light" value={counts.degraded} tone={counts.degraded ? 'warning' : 'neutral'} hint="Rx below −27 dBm" />
        <Stat label="Loss of signal" value={counts.los} tone={counts.los ? 'critical' : 'neutral'} hint={counts.los ? 'No light at the ONT' : 'No LOS alarms'} />
        <Stat label="Offline" value={counts.offline} hint="Not responding" />
        <Stat label="Average Rx power" value={counts.avgRx === null ? '—' : counts.avgRx.toFixed(1)} unit={counts.avgRx === null ? undefined : 'dBm'} hint="Across reachable ONTs" className="col-span-2 md:col-span-1" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {oltStats.map(({ olt, served, total, online, alarmCount, los }) => {
          const utilization = olt.usedPorts / olt.ponPorts
          const share = online / Math.max(1, total)
          return (
            <Card key={olt.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[13px] font-semibold text-fg">{olt.name}</div>
                  <div className="truncate text-xs text-fg-3">{olt.location}</div>
                </div>
                {los ? (
                  <Badge tone="critical" dot>
                    {los} LOS
                  </Badge>
                ) : alarmCount ? (
                  <Badge tone="warning" dot>
                    {alarmCount} alarm{alarmCount === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge tone="good" dot>
                    Healthy
                  </Badge>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-xs text-fg-3">ONTs</dt>
                  <dd className="text-sm font-semibold text-fg tabular">{num(total)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-3">Online</dt>
                  <dd className={cn('text-sm font-semibold tabular', share < 0.95 ? 'text-critical-fg' : share < 0.98 ? 'text-warning-fg' : 'text-fg')}>{pct(share, 1)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-3">Properties</dt>
                  <dd className="text-sm font-semibold text-fg tabular">{served.length}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="text-fg-3">PON ports in use</span>
                  <span className="text-fg-2 tabular">
                    {olt.usedPorts} of {olt.ponPorts} · {pct(utilization)}
                  </span>
                </div>
                <ProgressBar value={utilization} tone={utilization > 0.8 ? 'warning' : 'accent'} />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                {served.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => locate(p.id)}
                    aria-pressed={p.id === propertyId}
                    className={cn(
                      'inline-flex h-6 items-center rounded-md border px-2 text-xs transition-colors',
                      p.id === propertyId ? 'border-accent-line bg-accent-soft text-accent-fg' : 'border-border text-fg-2 hover:border-border-strong hover:text-fg',
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

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card padded={false} className="min-w-0 xl:col-span-7">
          <div className="px-5 pt-5">
            <CardHeader
              title="Active alarms"
              subtitle={`${alarms.length} ONTs not fully online`}
              action={
                <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                  <Badge tone={counts.los ? 'critical' : 'neutral'}>{counts.los} LOS</Badge>
                  <Badge tone={counts.degraded ? 'warning' : 'neutral'}>{counts.degraded} low light</Badge>
                  <Badge tone="neutral">{counts.offline} offline</Badge>
                </div>
              }
            />
          </div>
          {alarms.length ? (
            <div className="max-h-[440px] overflow-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead className="sticky top-0 z-[1]">
                  <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3 shadow-[0_1px_0_var(--border)]">
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Splitter</th>
                    <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Rx power</th>
                    <th className="px-3 py-2 text-right font-medium whitespace-nowrap">Last test</th>
                    <th className="w-10 py-2 pr-5">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {alarms.map((o) => (
                    <tr
                      key={o.id}
                      tabIndex={0}
                      onClick={() => setParam('ont', o.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setParam('ont', o.id)
                        }
                      }}
                      className={cn(
                        'cursor-pointer transition-colors outline-none hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:shadow-[inset_2px_0_0_var(--accent)]',
                        o.id === ontId && 'bg-accent-soft hover:bg-accent-soft',
                      )}
                    >
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <OntStatusBadge status={o.status} />
                      </td>
                      <td className="w-full max-w-0 px-3 py-2.5">
                        <div className="truncate font-medium text-fg">{o.unit}</div>
                        <div className="truncate text-xs text-fg-3">
                          {propertyName(o.propertyId)}
                          {o.isDemoHome && <span className="text-accent-fg"> · Demo home</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-fg-2">{splitterName(o.splitterId)}</td>
                      <td className={cn('px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap tabular', o.rxPowerDbm === null ? 'text-critical-fg' : o.status === 'degraded' ? 'text-warning-fg' : 'text-fg-2')}>{dbm(o.rxPowerDbm)}</td>
                      <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap text-fg-3">{timeAgo(o.lastTestAt, now)}</td>
                      <td className="py-2.5 pr-5 text-right">
                        <ChevronRight className="ml-auto size-4 text-fg-4" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-t border-border">
              <EmptyState icon={Network} title="All ONTs online" message="No LOS, low-light or offline alarms across the network." />
            </div>
          )}
        </Card>

        <Card padded={false} className="min-w-0 xl:col-span-5">
          <div className="px-5 pt-5">
            <CardHeader title="Light-level tests" subtitle="Remote polls and field meter readings" />
          </div>
          <ul className="max-h-[440px] divide-y divide-border overflow-y-auto border-t border-border">
            {lightLevels.slice(0, 12).map((r) => {
              const ont = ontById(r.ontId)
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setParam('ont', r.ontId)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-fg">{ont?.unit ?? r.ontId}</div>
                      <div className="truncate text-xs text-fg-3">
                        {ont ? propertyName(ont.propertyId) : '—'} · {r.by}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-xs text-fg tabular">{r.dbm.toFixed(1)} dBm</div>
                      <div className="text-xs text-fg-3">{timeAgo(r.at, now)}</div>
                    </div>
                    <Badge tone={r.pass ? 'good' : 'critical'} className="w-10 justify-center">
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
          <div className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm leading-5 font-semibold text-fg">Topology explorer</h3>
              <p className="mt-0.5 text-[13px] leading-5 text-fg-3">OLT, 1:4 feeder splitters, 1:8 distribution splitters and ONTs</p>
            </div>
            <Select value={propertyId} onChange={(e) => setParam('property', e.target.value)} className="w-full sm:w-72" aria-label="Property">
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.type}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2 border-y border-border bg-surface-2 px-5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs text-fg-2 tabular">
              <span className="font-medium text-fg">{topoProperty?.name}</span>
              <span className="text-fg-4"> · </span>
              {topoOnts.length} ONTs
              <span className="text-fg-4"> · </span>
              {pct(topoOnts.length ? topoOnline / topoOnts.length : 0, 1)} online
              {topoOnts.length - topoOnline > 0 && (
                <>
                  <span className="text-fg-4"> · </span>
                  <span className="font-medium text-warning-fg">
                    {topoOnts.length - topoOnline} alarm{topoOnts.length - topoOnline > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
            <NetTopologyLegend />
          </div>
          <div className="overflow-x-auto p-5">
            {topoProperty ? <NetTopology propertyId={propertyId} selectedOntId={ontId} onSelectOnt={(id) => setParam('ont', id)} /> : <EmptyState icon={Network} title="Property not found" />}
          </div>
        </Card>
      </div>

      <NetOntDrawer key={ontId ?? 'none'} ontId={ontId} onClose={() => setParam('ont', null)} />
    </>
  )
}
