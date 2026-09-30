import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, ClipboardList, Smartphone, Wifi } from 'lucide-react'
import { EventFeed } from '@/components/EventFeed'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, Stat, StatusDot, TONE_DOT, TONE_TEXT, type Tone } from '@/components/ui'
import { ONT_STATUSES } from '@/components/ops/NetUtils'
import { AssigneeChip, PriorityBadge, SlaBadge } from '@/components/ops/WoParts'
import { compareWorkOrders } from '@/components/ops/WoUtils'
import { DEMO_ONT_ID } from '@/data/seed'
import { cn } from '@/lib/cn'
import { currency, dbm, formatDuration, num, pct } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { ONT_STATUS_LABEL, ONT_STATUS_TONE, TECH_STATUS_LABEL, TECH_STATUS_TONE, isOpen, slaState } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { OntStatus, SecurityMode, SecurityStatus, WaterStatus } from '@/types'

const DAY = 86_400_000
const QUEUE_LIMIT = 7

const WATER_TONE: Record<WaterStatus, Tone> = { normal: 'good', warning: 'warning', leak: 'critical' }
const WATER_LABEL: Record<WaterStatus, string> = { normal: 'Normal', warning: 'Unusual flow', leak: 'Leak detected' }
const SECURITY_MODE_LABEL: Record<SecurityMode, string> = { disarmed: 'Disarmed', home: 'Armed home', away: 'Armed away' }
const SECURITY_STATUS_LABEL: Record<SecurityStatus, string> = { ready: 'Ready', arming: 'Exit delay', armed: 'Armed', 'entry-delay': 'Entry delay', alarm: 'Alarm' }
const SECURITY_TONE: Record<SecurityStatus, Tone> = { ready: 'neutral', arming: 'info', armed: 'good', 'entry-delay': 'warning', alarm: 'critical' }

const QUEUE_GRID = 'grid grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-start gap-x-3 sm:grid-cols-[2rem_4.5rem_minmax(0,1fr)_8rem_1.5rem] sm:items-center'

function ViewAll({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 rounded-md text-[13px] font-medium text-fg-2 hover:text-fg">
      {children}
      <ArrowRight className="size-3.5 text-fg-3" />
    </Link>
  )
}

function SpotlightRow({ label, detail, tone, status, note }: { label: string; detail: string; tone: Tone; status: string; note?: string }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-fg">{label}</div>
        <div className="mt-0.5 truncate text-xs text-fg-3 tabular">{detail}</div>
        {note && <div className="mt-1 text-xs text-fg-2">{note}</div>}
      </div>
      <Badge tone={tone} dot className="mt-0.5 shrink-0">
        {status}
      </Badge>
    </li>
  )
}

export default function OpsOverview() {
  const now = useNow()
  const navigate = useNavigate()
  const partner = usePartner()
  const onts = useStore((s) => s.ops.onts)
  const workOrders = useStore((s) => s.ops.workOrders)
  const properties = useStore((s) => s.ops.properties)
  const technicians = useStore((s) => s.ops.technicians)
  const revenue = useStore((s) => s.ops.revenue)
  const events = useStore((s) => s.events)
  const home = useStore((s) => s.home)

  const ontCounts = useMemo(() => {
    const c: Record<OntStatus, number> = { online: 0, degraded: 0, los: 0, offline: 0 }
    for (const o of onts) c[o.status] += 1
    return c
  }, [onts])

  const opsEvents = useMemo(() => events.filter((e) => e.scope === 'ops' || e.scope === 'both'), [events])

  const queue = useMemo(() => workOrders.filter(isOpen).sort(compareWorkOrders), [workOrders])

  const repairStats = useMemo(() => {
    const closed = workOrders.filter((w) => w.closedAt !== undefined)
    const recent = closed.filter((w) => (w.closedAt ?? 0) >= Date.now() - 30 * DAY)
    const met = recent.filter((w) => (w.closedAt ?? 0) <= w.dueAt).length
    const repairs = closed.filter((w) => w.type === 'trouble' || w.type === 'emergency')
    const mttr = repairs.length ? repairs.reduce((sum, w) => sum + ((w.closedAt ?? w.createdAt) - w.createdAt), 0) / repairs.length : 0
    return { recent: recent.length, met, repairs: repairs.length, mttr }
  }, [workOrders])

  const propertyHealth = useMemo(
    () =>
      properties.map((p) => {
        const counts: Record<OntStatus, number> = { online: 0, degraded: 0, los: 0, offline: 0 }
        let total = 0
        for (const o of onts) {
          if (o.propertyId !== p.id) continue
          counts[o.status] += 1
          total += 1
        }
        return { property: p, counts, total }
      }),
    [properties, onts],
  )

  const totalOnts = onts.length
  const onlineShare = totalOnts ? ontCounts.online / totalOnts : 0
  const p1Open = queue.filter((w) => w.priority === 'P1').length
  const slaWatch = queue.filter((w) => {
    const s = slaState(w, now)
    return s === 'at-risk' || s === 'breached'
  }).length
  const slaCompliance = repairStats.recent ? repairStats.met / repairStats.recent : 1
  const units = properties.reduce((sum, p) => sum + p.units, 0)
  const smartUnits = properties.reduce((sum, p) => sum + p.smartHomeUnits, 0)
  const lastMonth = revenue[revenue.length - 1]
  const prevMonth = revenue[revenue.length - 2]
  const monthTotal = lastMonth ? lastMonth.retainer + lastMonth.troubleCalls + lastMonth.emergency + lastMonth.smartHome + lastMonth.bulk : 0
  const smartGrowth = lastMonth && prevMonth && prevMonth.smartHome ? lastMonth.smartHome / prevMonth.smartHome - 1 : 0
  const onDuty = technicians.filter((t) => t.status !== 'off-duty').length
  const available = technicians.filter((t) => t.status === 'available').length
  const networkAlarms = ontCounts.degraded + ontCounts.los

  const net = home.network
  const water = home.water
  const security = home.security
  const securityTone = security.mode === 'disarmed' && security.status === 'ready' ? 'neutral' : SECURITY_TONE[security.status]
  const recording = home.cameras.filter((c) => c.recording).length

  const systemStatus: { tone: Tone; text: string } = p1Open
    ? { tone: 'critical', text: `${p1Open} P1 incident${p1Open > 1 ? 's' : ''} in progress` }
    : networkAlarms
      ? { tone: 'warning', text: `${networkAlarms} ONT alarm${networkAlarms > 1 ? 's' : ''} · no P1 incidents` }
      : { tone: 'good', text: 'All systems operational' }

  return (
    <>
      <PageHeader
        title="Operations overview"
        subtitle={`Fiber maintenance, emergency repair and smart-home services on the ${partner.name} network in Southwest Florida`}
        actions={
          <span className="inline-flex items-center gap-2 text-[13px] text-fg-2">
            <StatusDot tone={systemStatus.tone} pulse={systemStatus.tone === 'critical'} />
            {systemStatus.text}
          </span>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="ONTs online" value={pct(onlineShare, 1)} tone={onlineShare < 0.95 ? 'critical' : onlineShare < 0.98 ? 'warning' : 'neutral'} hint={`${ontCounts.degraded} low light · ${ontCounts.los} LOS`} />
        <Stat label="Open work orders" value={queue.length} tone={p1Open ? 'critical' : 'neutral'} hint={`${p1Open} P1 · ${slaWatch} SLA at risk`} />
        <Stat label="SLA met · 30 days" value={pct(slaCompliance, 1)} tone={slaCompliance < 0.9 ? 'critical' : slaCompliance < 0.95 ? 'warning' : 'neutral'} hint={`${repairStats.met} of ${repairStats.recent} closed on time`} />
        <Stat label="Mean time to repair" value={repairStats.mttr ? formatDuration(repairStats.mttr) : '—'} hint={`${repairStats.repairs} repair jobs closed`} />
        <Stat label="Smart-home adoption" value={pct(units ? smartUnits / units : 0, 1)} hint={`${num(smartUnits)} of ${num(units)} units`} />
        <Stat label={lastMonth ? `Revenue · ${lastMonth.month}` : 'Revenue'} value={currency(monthTotal, true)} hint={`Smart-home ${smartGrowth >= 0 ? '+' : ''}${pct(smartGrowth)} MoM`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card padded={false} className="xl:col-span-8">
          <div className="px-5 pt-5">
            <CardHeader title="Priority queue" subtitle={`${queue.length} open · P1 first, then by SLA due time`} action={<ViewAll to="/ops/work-orders">All work orders</ViewAll>} />
          </div>
          {queue.length ? (
            <div>
              <div className={cn(QUEUE_GRID, 'border-y border-border bg-surface-2 px-5 py-2 text-xs font-medium text-fg-3')}>
                <span>
                  <span className="sr-only">Priority</span>
                </span>
                <span className="hidden sm:block">Number</span>
                <span>Work order</span>
                <span className="hidden sm:block">SLA</span>
                <span>
                  <span className="sr-only">Assignee</span>
                </span>
              </div>
              <ul className="divide-y divide-border">
                {queue.slice(0, QUEUE_LIMIT).map((w) => {
                  const property = properties.find((p) => p.id === w.propertyId)
                  const tech = technicians.find((t) => t.id === w.assigneeId)
                  return (
                    <li key={w.id}>
                      <Link to={`/ops/work-orders?id=${w.id}`} className={cn(QUEUE_GRID, 'px-5 py-3 transition-colors hover:bg-surface-2')}>
                        <PriorityBadge priority={w.priority} />
                        <span className="hidden font-mono text-xs text-fg-3 sm:block">{w.number}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-fg" title={w.title}>
                            {w.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-fg-3">
                            <span className="font-mono sm:hidden">{w.number} · </span>
                            {property?.name}
                            {w.unit && ` · ${w.unit}`}
                          </span>
                          <SlaBadge wo={w} now={now} className="mt-1.5 sm:hidden" />
                        </span>
                        <span className="hidden sm:block">
                          <SlaBadge wo={w} now={now} />
                        </span>
                        <AssigneeChip tech={tech} showName={false} className="justify-self-end" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {queue.length > QUEUE_LIMIT && (
                <div className="border-t border-border px-5 py-2.5 text-xs text-fg-3">
                  {queue.length - QUEUE_LIMIT} more open work order{queue.length - QUEUE_LIMIT > 1 ? 's' : ''} in the queue
                </div>
              )}
            </div>
          ) : (
            <div className="border-t border-border">
              <EmptyState icon={ClipboardList} title="Queue is clear" message="No open work orders right now." />
            </div>
          )}
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader
            title="Live alerts"
            subtitle="Network, work-order and smart-home events"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-fg-3">
                <StatusDot tone="good" pulse />
                Live
              </span>
            }
          />
          <EventFeed events={opsEvents} limit={8} showProperty compact emptyText="No alerts yet" />
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader
            title="Network health by property"
            subtitle={`${num(totalOnts)} ONTs across ${properties.length} properties · ${pct(onlineShare, 1)} online`}
            action={<ViewAll to="/ops/network">Topology</ViewAll>}
          />
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-3">
            {ONT_STATUSES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn('size-2 rounded-[2px]', TONE_DOT[ONT_STATUS_TONE[s]])} />
                {ONT_STATUS_LABEL[s]}
                <span className="text-fg-2 tabular">{num(ontCounts[s])}</span>
              </span>
            ))}
          </div>
          <ul className="-mx-2">
            {propertyHealth.map(({ property, counts, total }) => {
              const share = total ? counts.online / total : 0
              const issues = ONT_STATUSES.filter((s) => s !== 'online' && counts[s] > 0)
              return (
                <li key={property.id}>
                  <Link
                    to={`/ops/network?property=${property.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2 sm:grid-cols-[13rem_minmax(0,1fr)_3.5rem_7.5rem]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-fg">{property.name}</span>
                      <span className="block truncate text-xs text-fg-3">
                        {property.type} · {num(total)} ONTs
                      </span>
                    </span>
                    <span className={cn('text-right text-[13px] font-medium tabular sm:hidden', share < 0.9 ? 'text-critical-fg' : share < 0.98 ? 'text-warning-fg' : 'text-fg')}>{pct(share, 1)}</span>
                    <span className="col-span-2 flex h-2 gap-px overflow-hidden rounded-full bg-surface-3 sm:col-span-1" title={ONT_STATUSES.map((s) => `${counts[s]} ${ONT_STATUS_LABEL[s].toLowerCase()}`).join(' · ')}>
                      {ONT_STATUSES.map((s) =>
                        counts[s] > 0 ? <span key={s} className={cn('h-full min-w-[3px] transition-[width] duration-500', TONE_DOT[ONT_STATUS_TONE[s]])} style={{ width: `${(counts[s] / total) * 100}%` }} /> : null,
                      )}
                    </span>
                    <span className={cn('hidden text-right text-[13px] font-medium tabular sm:block', share < 0.9 ? 'text-critical-fg' : share < 0.98 ? 'text-warning-fg' : 'text-fg')}>{pct(share, 1)}</span>
                    <span className="hidden truncate text-right text-xs sm:block">
                      {issues.length ? (
                        issues.map((s, i) => (
                          <span key={s} className={TONE_TEXT[ONT_STATUS_TONE[s]]}>
                            {i > 0 && <span className="text-fg-4"> · </span>}
                            {counts[s]} {ONT_STATUS_LABEL[s].toLowerCase()}
                          </span>
                        ))
                      ) : (
                        <span className="text-fg-3">No alarms</span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="flex flex-col xl:col-span-4">
          <CardHeader
            title="Connected-home spotlight"
            subtitle={`${home.unit} · ${home.residentName}`}
            action={
              <Badge tone="accent" icon={Wifi}>
                Demo home
              </Badge>
            }
            className="mb-1"
          />
          <ul className="divide-y divide-border">
            <SpotlightRow
              label="Water"
              tone={WATER_TONE[water.status]}
              status={WATER_LABEL[water.status]}
              detail={`Valve ${water.valve} · ${water.flowGpm.toFixed(1)} GPM · ${water.pressurePsi.toFixed(0)} psi`}
              note={water.leakCause ?? undefined}
            />
            <SpotlightRow
              label="Security"
              tone={securityTone}
              status={security.status === 'ready' ? SECURITY_MODE_LABEL[security.mode] : SECURITY_STATUS_LABEL[security.status]}
              detail={security.triggeredBy ? `Triggered by ${security.triggeredBy}` : `${SECURITY_MODE_LABEL[security.mode]} · ${recording} camera${recording === 1 ? '' : 's'} recording`}
            />
            <SpotlightRow
              label="Fiber ONT"
              tone={ONT_STATUS_TONE[net.status]}
              status={ONT_STATUS_LABEL[net.status]}
              detail={`Rx ${dbm(net.rxPowerDbm)} · ${net.downMbps} Mbps down · ${net.latencyMs} ms`}
              note={net.backupActive ? 'Hub on LTE backup. Protection stays online.' : undefined}
            />
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-fg-3">Leaks, alarms and outages at this home open work orders in the ops console automatically.</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button variant="secondary" size="sm" icon={Smartphone} onClick={() => navigate('/home')}>
              Open resident app
            </Button>
            <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate(`/ops/network?property=${home.propertyId}&ont=${DEMO_ONT_ID}`)}>
              View ONT
            </Button>
          </div>
        </Card>

        <Card padded={false} className="xl:col-span-12">
          <div className="px-5 pt-5">
            <CardHeader title="Field technicians" subtitle={`${onDuty} on duty · ${available} available for dispatch`} action={<ViewAll to="/ops/work-orders">Dispatch board</ViewAll>} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3">
                  <th className="px-5 py-2 font-medium">Technician</th>
                  <th className="px-3 py-2 font-medium">Zone</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 pr-5 font-medium">Current work order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {technicians.map((t) => {
                  const active = workOrders.find((w) => w.id === t.activeWorkOrderId)
                  const offDuty = t.status === 'off-duty'
                  return (
                    <tr key={t.id} className="hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={t.initials} />
                          <div className="min-w-0">
                            <div className={cn('truncate font-medium', offDuty ? 'text-fg-3' : 'text-fg')}>{t.name}</div>
                            <div className="truncate text-xs text-fg-3">{t.skills.slice(0, 3).join(', ')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-fg-2">{t.zone}</td>
                      <td className="px-3 py-3">
                        <Badge tone={TECH_STATUS_TONE[t.status]} dot>
                          {TECH_STATUS_LABEL[t.status]}
                        </Badge>
                      </td>
                      <td className="w-full max-w-0 px-3 py-3 pr-5">
                        {active ? (
                          <Link to={`/ops/work-orders?id=${active.id}`} className="group flex min-w-0 items-center gap-2">
                            <span className="shrink-0 font-mono text-xs text-fg-3 group-hover:text-fg">{active.number}</span>
                            <span className="truncate text-fg-2 group-hover:text-fg">{active.title}</span>
                          </Link>
                        ) : (
                          <span className="text-fg-3">{offDuty ? 'Back on shift tomorrow' : 'Ready for dispatch'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
