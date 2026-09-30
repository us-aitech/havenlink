import { useNavigate } from 'react-router'
import { Cpu, Gamepad2, Gauge, Laptop, LifeBuoy, Radio, Router, Smartphone, Tablet, Tv, type LucideIcon } from 'lucide-react'
import { ListRow } from '@/components/home/ListRow'
import { HERO_CARD, HERO_TINT, StatusHero } from '@/components/home/StatusHero'
import { Stepper } from '@/components/home/Stepper'
import { Avatar, Button, Card, CardHeader, KeyValue, PageHeader, ProgressBar, Stat, type Tone } from '@/components/ui'
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
  return { label: 'Below spec', tone: 'critical', ratio }
}

function SignalBars({ signal, online }: { signal: number; online: boolean }) {
  return (
    <span className="flex items-end gap-0.5" role="img" aria-label={`Signal ${signal}%`}>
      {[25, 50, 75, 90].map((threshold, i) => (
        <span key={threshold} className={cn('w-1 rounded-sm', online && signal >= threshold ? 'bg-fg-2' : 'bg-control-off')} style={{ height: 5 + i * 3 }} />
      ))}
    </span>
  )
}

export default function Network() {
  const network = useStore((s) => s.home.network)
  const workOrders = useStore((s) => s.ops.workOrders)
  const technicians = useStore((s) => s.ops.technicians)
  const onts = useStore((s) => s.ops.onts)
  const startSpeedTest = useStore((s) => s.startSpeedTest)
  const partner = usePartner()
  const navigate = useNavigate()
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
  const heroTint = outage ? 'critical' : degraded ? 'warning' : null
  const tone: Tone = outage ? 'critical' : degraded ? 'warning' : 'good'
  const activeClients = network.clients.filter((c) => c.mbps > 0).length

  return (
    <>
      <PageHeader
        eyebrow="Internet"
        title={`${partner.name} · ${network.planName}`}
        subtitle={`${network.planDownMbps} / ${network.planUpMbps} Mbps fiber, installed and maintained by your local field-services team.`}
      />

      <Card padded={false} className={cn('mb-6 overflow-hidden', heroTint && HERO_CARD[heroTint])}>
        <div className={cn('p-5 sm:p-6', heroTint && HERO_TINT[heroTint])}>
          <StatusHero
            tone={tone}
            pulse={outage}
            label={outage ? 'Outage · no fiber signal' : degraded ? 'Degraded · low light' : 'Online'}
            title={outage ? 'Fiber outage in your area' : degraded ? 'Your connection is degraded' : 'Connected at full speed'}
            description={
              outage
                ? 'The fiber signal to your home was lost. A repair crew was dispatched automatically, no need to call.'
                : degraded
                  ? 'Your fiber signal is weaker than it should be. We detected it before you did and scheduled a fix.'
                  : `Online for ${formatDuration(now - network.onlineSince)} · ${network.latencyMs} ms latency · ${network.packetLoss}% packet loss`
            }
            aside={
              network.backupActive ? (
                <div className="mt-3 flex items-start gap-2 text-[13px] text-good-fg">
                  <Radio className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="font-medium">LTE backup active.</span> Alarm, cameras and leak protection stay online.
                  </span>
                </div>
              ) : null
            }
            actions={
              outage ? undefined : (
                <Button icon={Gauge} loading={st.running} onClick={startSpeedTest}>
                  {st.running ? 'Testing' : 'Run speed test'}
                </Button>
              )
            }
          />
        </div>

        {repair && (
          <div className="border-t border-border p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar initials={tech?.initials ?? '?'} size="lg" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-fg">{tech ? `${tech.name} is handling your repair` : 'Assigning a technician'}</div>
                  <div className="truncate text-xs text-fg-3">
                    <span className="font-mono">{repair.number}</span> · {repair.title}
                  </div>
                </div>
              </div>
              <div className="shrink-0 sm:text-right">
                <div className="text-xs text-fg-3">Estimated restore by</div>
                <div className="text-sm font-semibold text-fg tabular">{formatTime(repair.dueAt)}</div>
              </div>
            </div>
            <Stepper
              current={stageIdx}
              steps={stages.map((s) => {
                const entry = repair.history.find((h) => h.stage === s.key)
                return { key: s.key, label: s.label, meta: entry ? formatTime(entry.at) : undefined }
              })}
            />
          </div>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Download in use" value={outage ? '—' : network.downMbps} unit="Mbps" hint={`Plan ${network.planDownMbps} Mbps`} />
        <Stat label="Upload in use" value={outage ? '—' : network.upMbps} unit="Mbps" hint={`Plan ${network.planUpMbps} Mbps`} />
        <Stat label="Latency" value={outage ? '—' : network.latencyMs} unit="ms" tone={!outage && network.latencyMs > 15 ? 'warning' : 'neutral'} hint={`${network.packetLoss}% packet loss`} />
        <Stat
          label="Fiber signal"
          value={network.rxPowerDbm === null ? '—' : network.rxPowerDbm.toFixed(1)}
          unit="dBm"
          tone={q.tone === 'critical' ? 'critical' : q.tone === 'warning' ? 'warning' : 'neutral'}
          hint={
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={q.ratio} tone={q.tone} />
              <span className="shrink-0">{q.label}</span>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader title="Speed test" subtitle={st.running ? 'Measuring download speed' : st.result ? `Last run ${timeAgo(st.result.at, now)}` : 'Not run yet'} />
          <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
            <div className="text-5xl leading-none font-semibold tracking-[-0.03em] text-fg tabular">{st.running ? liveDown : (st.result?.down ?? '—')}</div>
            <div className="mt-2 text-[13px] text-fg-3">Mbps download</div>
          </div>
          {st.running ? (
            <ProgressBar value={progress} className="mb-5" />
          ) : (
            st.result && (
              <div className="-mx-5 mb-5 grid grid-cols-2 divide-x divide-border border-y border-border">
                <div className="px-5 py-3 text-center">
                  <div className="text-base font-semibold text-fg tabular">{st.result.up}</div>
                  <div className="text-xs text-fg-3">Mbps upload</div>
                </div>
                <div className="px-5 py-3 text-center">
                  <div className="text-base font-semibold text-fg tabular">{st.result.latency}</div>
                  <div className="text-xs text-fg-3">ms latency</div>
                </div>
              </div>
            )
          )}
          <Button variant="primary" className="w-full" icon={Gauge} onClick={startSpeedTest} loading={st.running} disabled={outage}>
            {st.running ? 'Testing' : outage ? 'Unavailable during outage' : 'Run speed test'}
          </Button>
        </Card>

        <Card padded={false} className="flex min-w-0 flex-col">
          <div className="px-5 pt-5">
            <CardHeader title="Mesh WiFi" subtitle={`${network.meshNodes.length} nodes · WiFi 7`} className="mb-2" />
          </div>
          <div className="divide-y divide-border border-t border-border">
            {network.meshNodes.map((n) => (
              <ListRow
                key={n.id}
                className="px-5"
                icon={Router}
                title={n.name}
                meta={n.online ? `${n.clients} devices · ${n.signal}% signal` : 'Offline'}
                trailing={<SignalBars signal={n.signal} online={n.online} />}
              />
            ))}
          </div>
          <div className="mt-auto border-t border-border bg-surface-2 px-5 py-1.5">
            <KeyValue label="ONT serial" value={ont?.serial ?? '—'} mono />
            <KeyValue label="ONT transmit power" value={`${network.txPowerDbm.toFixed(1)} dBm`} mono />
            <KeyValue label="Hub backup" value={network.backupActive ? 'LTE active' : 'LTE standby'} />
          </div>
        </Card>

        <Card padded={false} className="flex min-w-0 flex-col">
          <div className="px-5 pt-5">
            <CardHeader title="Connected devices" subtitle={outage ? `${network.clients.length} devices · offline` : `${network.clients.length} devices · ${activeClients} active`} className="mb-2" />
          </div>
          <div className="max-h-[26rem] flex-1 divide-y divide-border overflow-y-auto border-t border-border">
            {network.clients.map((c) => {
              const Icon = CLIENT_ICON[c.kind]
              const active = c.mbps > 0 && !outage
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Icon className="size-4 shrink-0 text-fg-3" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{c.name}</span>
                  <span className={cn('text-xs tabular', active ? 'font-medium text-fg-2' : 'text-fg-3')}>{outage ? 'Offline' : c.mbps > 0 ? `${c.mbps} Mbps` : 'Idle'}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <LifeBuoy className="size-5 shrink-0 text-fg-3" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-fg">Something not right?</div>
          <div className="text-[13px] text-fg-3">One team handles your fiber, WiFi and smart-home devices. No finger-pointing between vendors.</div>
        </div>
        <Button onClick={() => navigate('/home/support')}>Get help</Button>
      </Card>
    </>
  )
}
