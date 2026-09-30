import { Link } from 'react-router'
import { Activity, ArrowDown, ArrowUp, Cable, CheckCircle2, Gamepad2, Gauge, Laptop, LifeBuoy, Radio, Router, Smartphone, Tablet, Timer, Tv, Wifi, WifiOff, Cpu, type LucideIcon } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, KeyValue, PageHeader, ProgressBar, Stat, type Tone } from '@/components/ui'
import { DEMO } from '@/config'
import { DEMO_ONT_ID } from '@/data/seed'
import { cn } from '@/lib/cn'
import { formatDuration, formatTime, timeAgo } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { WORKFLOWS, isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { ClientKind } from '@/types'

const CLIENT_ICON: Record<ClientKind, LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  tv: Tv,
  iot: Cpu,
  console: Gamepad2,
  tablet: Tablet,
}

function signalQuality(dbm: number | null): { label: string; tone: Tone; ratio: number } {
  if (dbm === null) return { label: 'No light', tone: 'critical', ratio: 0 }
  const ratio = Math.max(0, Math.min(1, (dbm + 30) / 22))
  if (dbm > -24) return { label: 'Excellent', tone: 'good', ratio }
  if (dbm > -27) return { label: 'Fair', tone: 'warning', ratio }
  return { label: 'Weak — below spec', tone: 'critical', ratio }
}

export default function Network() {
  const network = useStore((s) => s.home.network)
  const workOrders = useStore((s) => s.ops.workOrders)
  const technicians = useStore((s) => s.ops.technicians)
  const onts = useStore((s) => s.ops.onts)
  const startSpeedTest = useStore((s) => s.startSpeedTest)
  const partner = usePartner()
  const now = useNow(500)

  const ont = onts.find((o) => o.id === DEMO_ONT_ID)
  const repair = workOrders.find((w) => isOpen(w) && (w.incident === 'fiber-cut' || (w.incident === 'signal-degradation' && w.ontId === DEMO_ONT_ID)))
  const tech = repair ? technicians.find((t) => t.id === repair.assigneeId) : null
  const stages = repair ? WORKFLOWS[repair.type] : []
  const stageIdx = repair ? stages.findIndex((s) => s.key === repair.stage) : -1
  const q = signalQuality(network.rxPowerDbm)
  const outage = network.status === 'los'
  const degraded = network.status === 'degraded'
  const st = network.speedTest
  const progress = st.running && st.startedAt ? Math.min(1, (now - st.startedAt) / (DEMO.speedTestSeconds * 1000)) : 0
  const liveDown = st.running ? Math.round(network.planDownMbps * 0.94 * Math.min(1, progress * 1.6) * (degraded ? 0.25 : 1)) : 0

  return (
    <>
      <PageHeader eyebrow="Internet" title={`${partner.name} · ${network.planName}`} subtitle={`${network.planDownMbps} / ${network.planUpMbps} Mbps symmetrical fiber, installed and maintained by your local field-services team`} />

      <Card className={cn('mb-4', outage && 'border-critical-line bg-critical-soft', degraded && 'border-warning-line')} padded={false}>
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
          <div className="flex flex-1 items-start gap-4">
            <div className={cn('flex size-14 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', outage ? 'bg-critical-soft text-critical-fg ring-critical-line' : degraded ? 'bg-warning-soft text-warning-fg ring-warning-line' : 'bg-good-soft text-good-fg ring-good-line')}>
              {outage ? <WifiOff className="size-7" /> : <Wifi className="size-7" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-fg">{outage ? 'Fiber outage in your area' : degraded ? 'Connection degraded' : 'Connected'}</h2>
                <Badge tone={outage ? 'critical' : degraded ? 'warning' : 'good'} dot>
                  {outage ? 'LOS' : degraded ? 'Low light' : 'Online'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-fg-3">
                {outage
                  ? 'The fiber signal to your home was lost. A repair crew has been dispatched automatically — no need to call.'
                  : degraded
                    ? 'Your fiber signal is weaker than it should be. We detected it before you did and scheduled a fix.'
                    : `Online for ${formatDuration(now - network.onlineSince)} · ${network.latencyMs} ms latency · ${network.packetLoss}% packet loss`}
              </p>
            </div>
          </div>
          {network.backupActive && (
            <div className="flex items-center gap-3 rounded-xl border border-good-line bg-good-soft px-4 py-3 text-sm text-good-fg md:max-w-xs">
              <Radio className="size-5 shrink-0 text-good-fg" />
              <span>
                <b className="font-semibold">LTE backup active.</b> Alarm, cameras and leak protection stay online.
              </span>
            </div>
          )}
        </div>
        {repair && (
          <div className="border-t border-border bg-surface-2 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {tech ? <Avatar initials={tech.initials} size="lg" /> : <Avatar initials="?" tone="neutral" size="lg" />}
                <div>
                  <div className="text-sm font-semibold text-fg">{tech ? `${tech.name} is handling your repair` : 'Assigning a technician…'}</div>
                  <div className="text-xs text-fg-3">
                    {repair.number} · {repair.title}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-fg-3">Estimated restore by</div>
                <div className="text-sm font-semibold text-fg">{formatTime(repair.dueAt)}</div>
              </div>
            </div>
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {stages.map((s, i) => (
                <li key={s.key} className={cn('rounded-xl border px-3 py-2 text-xs', i < stageIdx ? 'border-good-line bg-good-soft text-good-fg' : i === stageIdx ? 'border-accent-line bg-accent-soft text-accent-fg' : 'border-border text-fg-3')}>
                  <div className="mb-0.5 flex items-center gap-1 font-medium">
                    {i < stageIdx ? <CheckCircle2 className="size-3" /> : i === stageIdx ? <Activity className="size-3 animate-pulse" /> : <Timer className="size-3" />}
                    Step {i + 1}
                  </div>
                  {s.label}
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Download in use" value={network.downMbps} unit="Mbps" icon={ArrowDown} tone="info" hint={`Plan ${network.planDownMbps} Mbps`} />
        <Stat label="Upload in use" value={network.upMbps} unit="Mbps" icon={ArrowUp} tone="info" hint={`Plan ${network.planUpMbps} Mbps`} />
        <Stat label="Latency" value={outage ? '—' : network.latencyMs} unit="ms" icon={Timer} tone={network.latencyMs > 15 ? 'warning' : 'good'} hint={`${network.packetLoss}% packet loss`} />
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg-3">Fiber signal (ONT Rx)</span>
            <Cable className={cn('size-4', q.tone === 'good' ? 'text-good-fg' : q.tone === 'warning' ? 'text-warning-fg' : 'text-critical-fg')} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-fg tabular">{network.rxPowerDbm === null ? '—' : network.rxPowerDbm.toFixed(1)}</span>
            <span className="text-sm text-fg-3">dBm</span>
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar value={q.ratio} tone={q.tone} />
            <span className="shrink-0 text-[11px] text-fg-3">{q.label}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Speed test" subtitle={st.result ? `Last run ${timeAgo(st.result.at, now)}` : 'Never run'} icon={Gauge} />
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="text-center">
              <div className="text-5xl font-semibold tracking-tight text-fg tabular">{st.running ? liveDown : (st.result?.down ?? '—')}</div>
              <div className="text-sm text-fg-3">Mbps download</div>
            </div>
            {st.running ? (
              <ProgressBar value={progress} className="w-full" />
            ) : st.result ? (
              <div className="grid w-full grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-surface-2 p-2">
                  <div className="text-base font-semibold text-fg tabular">{st.result.up}</div>
                  <div className="text-[11px] text-fg-3">Mbps upload</div>
                </div>
                <div className="rounded-xl bg-surface-2 p-2">
                  <div className="text-base font-semibold text-fg tabular">{st.result.latency}</div>
                  <div className="text-[11px] text-fg-3">ms latency</div>
                </div>
              </div>
            ) : null}
            <Button variant="primary" className="w-full" onClick={startSpeedTest} loading={st.running} disabled={outage}>
              {st.running ? 'Testing…' : 'Run speed test'}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Mesh WiFi" subtitle={`${network.meshNodes.length} nodes · WiFi 7`} icon={Router} />
          <div className="flex flex-col gap-2">
            {network.meshNodes.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                <Router className={cn('size-5', n.online ? 'text-accent-fg' : 'text-fg-4')} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-fg">{n.name}</div>
                  <div className="text-xs text-fg-3">{n.clients} devices</div>
                </div>
                <div className="flex items-end gap-0.5" aria-label={`Signal ${n.signal}%`}>
                  {[25, 50, 75, 90].map((th, i) => (
                    <span key={th} className={cn('w-1 rounded-sm', n.signal >= th ? 'bg-accent' : 'bg-control-off')} style={{ height: 6 + i * 4 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-2">
            <KeyValue label="ONT serial" value={ont?.serial ?? '—'} mono />
            <KeyValue label="ONT Tx power" value={`${network.txPowerDbm.toFixed(1)} dBm`} mono />
            <KeyValue label="Hub backup" value={network.backupActive ? 'LTE active' : 'LTE standby'} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Connected devices" subtitle={`${network.clients.length} devices`} icon={Wifi} />
          <div className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
            {network.clients.map((c) => {
              const Icon = CLIENT_ICON[c.kind]
              return (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <Icon className="size-4 text-fg-3" />
                  <span className="flex-1 truncate text-sm text-fg">{c.name}</span>
                  <span className={cn('text-xs tabular', c.mbps > 0 && !outage ? 'text-accent-fg' : 'text-fg-4')}>{outage ? 'offline' : c.mbps > 0 ? `${c.mbps} Mbps` : 'idle'}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <LifeBuoy className="size-5 text-accent-fg" />
        <div className="flex-1">
          <div className="text-sm font-medium text-fg">Something not right?</div>
          <div className="text-xs text-fg-3">One team handles your fiber, WiFi and smart-home devices — no finger-pointing between vendors.</div>
        </div>
        <Link to="/home/support">
          <Button variant="secondary" size="sm">
            Get help
          </Button>
        </Link>
      </Card>
    </>
  )
}
