import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Bell,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Droplets,
  HardHat,
  House,
  Network,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Timer,
  Wifi,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { EventFeed } from '@/components/EventFeed'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, Stat, TONE_DOT, TONE_SOFT, TONE_TEXT, type Tone } from '@/components/ui'
import { ONT_STATUSES, ONT_STATUS_ICON } from '@/components/ops/NetUtils'
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
const KPI_CLASS = 'gap-2! p-4! [&_.text-2xl]:text-xl sm:[&_.text-2xl]:text-2xl'

const WATER_TONE: Record<WaterStatus, Tone> = { normal: 'good', warning: 'warning', leak: 'critical' }
const WATER_LABEL: Record<WaterStatus, string> = { normal: 'Normal', warning: 'Unusual flow', leak: 'Leak detected' }
const SECURITY_MODE_LABEL: Record<SecurityMode, string> = { disarmed: 'Disarmed', home: 'Armed · Home', away: 'Armed · Away' }
const SECURITY_STATUS_LABEL: Record<SecurityStatus, string> = { ready: 'Ready', arming: 'Exit delay', armed: 'Armed', 'entry-delay': 'Entry delay', alarm: 'ALARM' }
const SECURITY_TONE: Record<SecurityStatus, Tone> = { ready: 'neutral', arming: 'info', armed: 'good', 'entry-delay': 'warning', alarm: 'critical' }

function SpotlightRow({ icon: Icon, label, tone, status, detail, extra }: { icon: LucideIcon; label: string; tone: Tone; status: string; detail: string; extra?: ReactNode }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-3 py-2.5', tone === 'critical' ? 'border-critical-line bg-critical-soft' : tone === 'warning' ? 'border-warning-line bg-warning-soft' : 'border-border bg-surface-2')}>
      <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', TONE_SOFT[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-fg-3 uppercase">{label}</span>
          <Badge tone={tone} dot>
            {status}
          </Badge>
        </div>
        <div className="mt-1 truncate text-xs text-fg-2 tabular">{detail}</div>
        {extra}
      </div>
    </div>
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

  const net = home.network
  const water = home.water
  const security = home.security
  const securityTone = security.mode === 'disarmed' && security.status === 'ready' ? 'neutral' : SECURITY_TONE[security.status]

  return (
    <>
      <PageHeader
        eyebrow="Network operations center"
        title="Operations overview"
        subtitle={`Fiber maintenance, emergency repair and smart-home services on the ${partner.name} network · Southwest Florida`}
        actions={
          <Badge tone={p1Open ? 'critical' : 'good'} dot>
            {p1Open ? `${p1Open} P1 incident${p1Open > 1 ? 's' : ''} active` : 'All systems nominal'}
          </Badge>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="ONTs online"
          value={pct(onlineShare, 1)}
          icon={Wifi}
          tone={onlineShare >= 0.98 ? 'good' : onlineShare >= 0.95 ? 'warning' : 'critical'}
          hint={`${ontCounts.degraded} low light · ${ontCounts.los} LOS`}
          className={KPI_CLASS}
        />
        <Stat label="Open orders" value={queue.length} icon={ClipboardList} tone={p1Open ? 'critical' : 'accent'} hint={`${p1Open} P1 · ${slaWatch} SLA at risk`} className={KPI_CLASS} />
        <Stat
          label="SLA · 30 days"
          value={pct(slaCompliance, 1)}
          icon={ShieldCheck}
          tone={slaCompliance >= 0.95 ? 'good' : slaCompliance >= 0.9 ? 'warning' : 'critical'}
          hint={`${repairStats.met}/${repairStats.recent} closed on time`}
          className={KPI_CLASS}
        />
        <Stat label="MTTR · repairs" value={repairStats.mttr ? formatDuration(repairStats.mttr) : '—'} icon={Timer} tone="info" hint={`${repairStats.repairs} trouble + emergency`} className={KPI_CLASS} />
        <Stat label="Smart-home" value={pct(units ? smartUnits / units : 0, 1)} icon={House} tone="accent" hint={`${num(smartUnits)} of ${num(units)} units`} className={KPI_CLASS} />
        <Stat
          label={lastMonth ? `Revenue · ${lastMonth.month}` : 'Revenue'}
          value={currency(monthTotal, true)}
          icon={DollarSign}
          tone="good"
          hint={`Smart-home ${smartGrowth >= 0 ? '+' : ''}${pct(smartGrowth)} MoM`}
          className={KPI_CLASS}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Live alerts"
            subtitle="Network, work-order and smart-home events"
            icon={Bell}
            action={
              <span className="flex items-center gap-1.5 text-[11px] text-good-fg">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-good-soft" />
                  <span className="relative size-2 rounded-full bg-good" />
                </span>
                Live
              </span>
            }
          />
          <EventFeed events={opsEvents} limit={9} showProperty compact emptyText="No alerts yet" />
        </Card>

        <Card>
          <CardHeader
            title="Priority queue"
            subtitle={`${queue.length} open · P1 first, then SLA due time`}
            icon={ClipboardList}
            action={
              <Link to="/ops/work-orders" className="inline-flex items-center gap-0.5 text-xs text-accent-fg hover:text-accent-fg">
                View all
                <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          {queue.length ? (
            <ul className="-mx-2 flex flex-col">
              {queue.slice(0, 6).map((w) => {
                const property = properties.find((p) => p.id === w.propertyId)
                const tech = technicians.find((t) => t.id === w.assigneeId)
                return (
                  <li key={w.id}>
                    <Link
                      to={`/ops/work-orders?id=${w.id}`}
                      className={cn('flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-3', w.priority === 'P1' && 'bg-critical-soft hover:bg-critical-soft')}
                    >
                      <PriorityBadge priority={w.priority} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-fg" title={w.title}>
                          {w.title}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-fg-3">
                          <span className="font-mono text-fg-3">{w.number}</span> · {property?.name}
                          {w.unit && ` · ${w.unit}`}
                        </div>
                        <SlaBadge wo={w} now={now} className="mt-1.5" />
                      </div>
                      <AssigneeChip tech={tech} showName={false} className="mt-0.5" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon={ClipboardList} title="Queue is clear" message="No open work orders right now." />
          )}
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Field technicians" subtitle={`${onDuty} on duty · ${available} available`} icon={HardHat} />
          <ul className="grid grid-cols-1 gap-1 lg:grid-cols-2 xl:grid-cols-1">
            {technicians.map((t) => {
              const active = workOrders.find((w) => w.id === t.activeWorkOrderId)
              return (
                <li key={t.id} className={cn('flex items-start gap-3 rounded-xl px-2 py-2', t.status === 'off-duty' && 'opacity-55')}>
                  <Avatar initials={t.initials} tone={TECH_STATUS_TONE[t.status]} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-fg">{t.name}</span>
                      <Badge tone={TECH_STATUS_TONE[t.status]} dot>
                        {TECH_STATUS_LABEL[t.status]}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-fg-3">
                      {t.zone} · {t.skills.slice(0, 2).join(', ')}
                    </div>
                    {active ? (
                      <Link to={`/ops/work-orders?id=${active.id}`} className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-accent-fg hover:text-accent-fg">
                        <Wrench className="size-3 shrink-0" />
                        <span className="shrink-0 font-mono">{active.number}</span>
                        <span className="truncate text-fg-3">{active.title}</span>
                      </Link>
                    ) : (
                      <div className="mt-1 text-xs text-fg-4">{t.status === 'off-duty' ? 'Back on shift tomorrow' : 'Ready for dispatch'}</div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Network health by property"
            subtitle={`${num(totalOnts)} ONTs across ${properties.length} properties`}
            icon={Network}
            action={
              <Link to="/ops/network" className="inline-flex items-center gap-0.5 text-xs text-accent-fg hover:text-accent-fg">
                Topology
                <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-fg-3">
            {ONT_STATUSES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={cn('size-2 rounded-sm', TONE_DOT[ONT_STATUS_TONE[s]])} />
                {ONT_STATUS_LABEL[s]}
                <span className="text-fg-3 tabular">{ontCounts[s]}</span>
              </span>
            ))}
          </div>
          <div className="-mx-2 grid grid-cols-1 gap-x-4 md:grid-cols-2">
            {propertyHealth.map(({ property, counts, total }) => {
              const share = total ? counts.online / total : 0
              const issues = ONT_STATUSES.filter((s) => s !== 'online' && counts[s] > 0)
              return (
                <Link key={property.id} to={`/ops/network?property=${property.id}`} className="block rounded-xl px-2 py-2.5 transition hover:bg-surface-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 truncate">
                      <span className="text-sm text-fg">{property.name}</span>
                      <span className="ml-2 text-[11px] text-fg-3">
                        {property.type} · {total} ONTs
                      </span>
                    </div>
                    <span className={cn('shrink-0 text-sm font-semibold tabular', share >= 0.98 ? 'text-good-fg' : share >= 0.9 ? 'text-warning-fg' : 'text-critical-fg')}>{pct(share, 1)}</span>
                  </div>
                  <div className="mt-2 flex h-2 gap-px overflow-hidden rounded-full bg-surface-2">
                    {ONT_STATUSES.map((s) =>
                      counts[s] > 0 ? (
                        <div key={s} className={cn('h-full min-w-[3px] transition-all duration-500', TONE_DOT[ONT_STATUS_TONE[s]])} style={{ width: `${(counts[s] / total) * 100}%` }} title={`${counts[s]} ${ONT_STATUS_LABEL[s]}`} />
                      ) : null,
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-3">
                    <span>{counts.online} online</span>
                    {issues.length ? (
                      issues.map((s) => {
                        const Icon = ONT_STATUS_ICON[s]
                        return (
                          <span key={s} className={cn('inline-flex items-center gap-1', TONE_TEXT[ONT_STATUS_TONE[s]])}>
                            <Icon className="size-3" />
                            {counts[s]} {ONT_STATUS_LABEL[s]}
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-good-fg">No alarms</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Connected-home spotlight"
            subtitle={`${home.unit} · ${home.residentName}`}
            icon={House}
            action={
              <Badge tone="accent" dot>
                Live
              </Badge>
            }
          />
          <div className="flex flex-col gap-2">
            <SpotlightRow
              icon={Droplets}
              label="Water"
              tone={WATER_TONE[water.status]}
              status={WATER_LABEL[water.status]}
              detail={`Valve ${water.valve} · ${water.flowGpm.toFixed(1)} GPM · ${water.pressurePsi.toFixed(0)} psi`}
              extra={water.leakCause ? <div className="mt-1 line-clamp-2 text-[11px] text-critical-fg">{water.leakCause}</div> : undefined}
            />
            <SpotlightRow
              icon={security.status === 'alarm' ? ShieldAlert : ShieldCheck}
              label="Security"
              tone={securityTone}
              status={security.status === 'ready' ? SECURITY_MODE_LABEL[security.mode] : SECURITY_STATUS_LABEL[security.status]}
              detail={security.triggeredBy ? `Triggered by ${security.triggeredBy}` : `${SECURITY_MODE_LABEL[security.mode]} · ${home.cameras.filter((c) => c.recording).length} cameras recording`}
            />
            <SpotlightRow
              icon={ONT_STATUS_ICON[net.status]}
              label="Fiber ONT"
              tone={ONT_STATUS_TONE[net.status]}
              status={ONT_STATUS_LABEL[net.status]}
              detail={`Rx ${dbm(net.rxPowerDbm)} · ${net.downMbps} Mbps down · ${net.latencyMs} ms`}
              extra={
                net.backupActive ? (
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-warning-fg">
                    <RadioTower className="size-3" />
                    Hub on LTE backup — protection stays online
                  </div>
                ) : undefined
              }
            />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-fg-3">
            Smart-home telemetry streams into the ops console: leaks, alarms and outages at this home open work orders automatically.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button variant="primary" size="sm" icon={Smartphone} onClick={() => navigate('/home')}>
              Open resident app
            </Button>
            <Button variant="secondary" size="sm" icon={Wifi} onClick={() => navigate(`/ops/network?property=${home.propertyId}&ont=${DEMO_ONT_ID}`)}>
              View ONT
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
