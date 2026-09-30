import { AlertTriangle, BatteryMedium, CheckCircle2, Droplets, Gauge, History, Power, ShieldCheck, Timer, Waves, Wrench } from 'lucide-react'
import { BarChart } from '@/components/charts/BarChart'
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart'
import { EventFeed } from '@/components/EventFeed'
import { PipeDiagram } from '@/components/home/PipeDiagram'
import { Badge, Button, Card, CardHeader, PageHeader, ProgressBar, Slider, Stat, Toggle, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatClock, num } from '@/lib/format'
import { useStore } from '@/store/useStore'

export default function Water() {
  const water = useStore((s) => s.home.water)
  const events = useStore((s) => s.events)
  const setValve = useStore((s) => s.setValve)
  const resolveLeak = useStore((s) => s.resolveLeak)
  const updateSettings = useStore((s) => s.updateWaterSettings)
  const setSensorWet = useStore((s) => s.setLeakSensorWet)

  const leak = water.status === 'leak'
  const warning = water.status === 'warning'
  const tone: Tone = leak ? 'critical' : warning ? 'warning' : water.valve === 'open' ? 'good' : 'warning'
  const headline = leak
    ? water.valve === 'closed'
      ? 'Leak contained — water is off'
      : water.valve === 'closing'
        ? 'Leak detected — closing main valve…'
        : 'Leak detected — valve is OPEN'
    : warning
      ? 'Unusual continuous flow'
      : water.valve === 'closed'
        ? 'Main valve closed'
        : water.valve === 'opening'
          ? 'Restoring water…'
          : 'Your home is protected'
  const continuousRatio = water.continuousFlowMinutes / water.settings.maxContinuousMinutes
  const waterEvents = events.filter((e) => e.scope !== 'ops' && (e.category === 'water' || (e.category === 'automation' && e.title.toLowerCase().includes('shut'))))

  return (
    <>
      <PageHeader
        eyebrow="Water protection"
        title="Leak detection & automatic shut-off"
        subtitle="Flow sensor and motorized valve on the main line, plus leak sensors at every risk point."
      />

      <Card className={cn('mb-4 overflow-hidden', leak && 'border-critical-line bg-critical-soft', warning && 'border-warning-line')} padded={false}>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                leak ? 'bg-critical-soft text-critical-fg ring-critical-line' : warning ? 'bg-warning-soft text-warning-fg ring-warning-line' : 'bg-good-soft text-good-fg ring-good-line',
              )}
            >
              {leak ? <AlertTriangle className="size-6" /> : warning ? <Timer className="size-6" /> : <ShieldCheck className="size-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-fg">{headline}</h2>
                <Badge tone={tone} dot>
                  {leak ? 'Leak' : warning ? 'Watching' : 'Normal'}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-fg-3">
                {leak
                  ? `${water.leakCause}. Detected at ${water.leakDetectedAt ? formatClock(water.leakDetectedAt) : '—'}. Your field-services team has been notified.`
                  : warning
                    ? `Water has been running for ${Math.round(water.continuousFlowMinutes)} min. If it reaches ${water.settings.maxContinuousMinutes} min the valve closes automatically.`
                    : water.activeFixture
                      ? `${water.activeFixture.name} in use · ${water.flowGpm.toFixed(1)} GPM — normal usage pattern.`
                      : 'No water running right now. Flow, pressure and 5 leak sensors are monitored 24/7.'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {leak ? (
              <>
                <Button variant="success" icon={CheckCircle2} onClick={resolveLeak}>
                  Fixed — restore water
                </Button>
                {water.valve === 'open' && (
                  <Button variant="danger" icon={Power} onClick={() => setValve(false)}>
                    Close valve now
                  </Button>
                )}
              </>
            ) : water.valve === 'open' || water.valve === 'opening' ? (
              <Button variant="secondary" icon={Power} onClick={() => setValve(false)} disabled={water.valve === 'opening'}>
                Close main valve
              </Button>
            ) : (
              <Button variant="primary" icon={Power} onClick={() => setValve(true)} disabled={water.valve === 'closing'}>
                Open main valve
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-border bg-surface-2 px-3 py-2 sm:px-6">
          <PipeDiagram flow={water.flowGpm} valve={water.valve} status={water.status} pressure={water.pressurePsi} />
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Flow right now" value={water.flowGpm.toFixed(1)} unit="GPM" icon={Waves} tone={water.flowGpm > water.settings.maxFlowGpm ? 'critical' : 'info'} hint={water.activeFixture ? water.activeFixture.name : water.flowGpm > 0 ? 'Unidentified flow' : 'Idle'} />
        <Stat label="Line pressure" value={water.pressurePsi.toFixed(0)} unit="psi" icon={Gauge} tone={water.pressurePsi < 40 && water.valve === 'open' ? 'warning' : 'good'} hint={water.valve === 'closed' ? 'Isolated — valve closed' : 'Normal range 50–70 psi'} />
        <Stat label="Used today" value={num(water.todayGallons)} unit="gal" icon={Droplets} tone="info" hint={`${num(water.monthGallons)} gal this month`} />
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg-3">Continuous flow</span>
            <Timer className={cn('size-4', continuousRatio > 0.7 ? 'text-warning-fg' : 'text-fg-3')} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-fg tabular">{Math.round(water.continuousFlowMinutes)}</span>
            <span className="text-sm text-fg-3">/ {water.settings.maxContinuousMinutes} min</span>
          </div>
          <ProgressBar value={continuousRatio} tone={continuousRatio > 0.7 ? 'warning' : 'accent'} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Live flow rate"
            subtitle="Last 2 minutes · dashed line is the burst-pipe limit"
            icon={Waves}
            action={<Badge tone={water.flowGpm > 0 ? 'info' : 'neutral'} dot>{water.flowGpm > 0 ? 'Water running' : 'Idle'}</Badge>}
          />
          <TimeSeriesChart
            label="Water flow rate in gallons per minute over the last two minutes"
            data={water.history.map((h) => ({ t: h.t, v: h.gpm }))}
            unit="GPM"
            height={210}
            threshold={{ value: water.settings.maxFlowGpm, label: `Shut-off above ${water.settings.maxFlowGpm} GPM` }}
            formatValue={(v) => v.toFixed(2)}
          />
        </Card>

        <Card>
          <CardHeader title="Protection rules" subtitle="Demo clock: 1 second = 1 minute" icon={ShieldCheck} />
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-fg">Automatic shut-off</div>
                <div className="text-xs text-fg-3">Close the main valve when a leak is detected</div>
              </div>
              <Toggle checked={water.settings.autoShutoff} onChange={(v) => updateSettings({ autoShutoff: v })} tone="good" label="Automatic shut-off" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-fg-2">Max flow rate</span>
                <span className="font-medium text-fg tabular">{water.settings.maxFlowGpm} GPM</span>
              </div>
              <Slider label="Max flow rate" value={water.settings.maxFlowGpm} min={3} max={12} step={0.5} onChange={(v) => updateSettings({ maxFlowGpm: v })} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-fg-2">Max continuous flow</span>
                <span className="font-medium text-fg tabular">{water.settings.maxContinuousMinutes} min</span>
              </div>
              <Slider label="Max continuous flow" value={water.settings.maxContinuousMinutes} min={10} max={120} step={5} onChange={(v) => updateSettings({ maxContinuousMinutes: v })} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-fg">Notify field-services team</div>
                <div className="text-xs text-fg-3">Opens a follow-up ticket automatically</div>
              </div>
              <Toggle checked={water.settings.notifyOps} onChange={(v) => updateSettings({ notifyOps: v })} label="Notify field-services team" />
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center">
              <div>
                <div className="text-lg font-semibold text-fg tabular">{water.shutoffCount}</div>
                <div className="text-[11px] text-fg-3">Auto shut-offs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-good-fg tabular">{num(water.gallonsSaved)}</div>
                <div className="text-[11px] text-fg-3">Gallons of damage avoided</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Leak sensors" subtitle="Tap “Test” to simulate water at a sensor" icon={Droplets} />
          <div className="grid gap-2 sm:grid-cols-2">
            {water.leakSensors.map((s) => (
              <div key={s.id} className={cn('flex items-center gap-3 rounded-xl border p-3', s.wet ? 'border-critical-line bg-critical-soft' : 'border-border bg-surface-2')}>
                <div className={cn('flex size-9 items-center justify-center rounded-lg', s.wet ? 'bg-critical-soft text-critical-fg' : 'bg-surface-2 text-fg-3')}>
                  <Droplets className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-fg">{s.name}</div>
                  <div className="flex items-center gap-2 text-xs text-fg-3">
                    {s.location}
                    <span className="inline-flex items-center gap-0.5">
                      <BatteryMedium className="size-3" />
                      {s.battery}%
                    </span>
                  </div>
                </div>
                {s.wet ? (
                  <Badge tone="critical" icon={AlertTriangle}>
                    WET
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge tone="good">Dry</Badge>
                    <Button size="xs" variant="ghost" onClick={() => setSensorWet(s.id, true)}>
                      Test
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Daily usage" subtitle="Gallons per day, last 7 days" icon={History} />
          <BarChart label="Daily water usage in gallons for the last seven days" data={water.dailyUsage.map((d) => ({ label: d.day, value: d.gallons }))} unit="gal" height={170} formatValue={(v) => num(v)} />
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Water activity" icon={Wrench} />
          <EventFeed events={waterEvents} limit={8} emptyText="No water events yet" />
        </Card>
      </div>
    </>
  )
}
