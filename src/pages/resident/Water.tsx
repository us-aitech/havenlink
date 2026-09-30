import type { ReactNode } from 'react'
import { CheckCircle2, Droplets, Power } from 'lucide-react'
import { BarChart } from '@/components/charts/BarChart'
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart'
import { EventFeed } from '@/components/EventFeed'
import { ListRow } from '@/components/home/ListRow'
import { PipeDiagram } from '@/components/home/PipeDiagram'
import { HERO_CARD, HERO_TINT, StatusHero } from '@/components/home/StatusHero'
import { Badge, Button, Card, CardHeader, PageHeader, ProgressBar, Slider, Stat, Toggle, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatClock, num } from '@/lib/format'
import { useStore } from '@/store/useStore'

function RuleRow({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="text-[13px] leading-5 font-medium text-fg">{title}</div>
        {description && <div className="text-xs leading-4 text-fg-3">{description}</div>}
      </div>
      {children}
    </div>
  )
}

function SliderRow({ title, value, children }: { title: string; value: string; children: ReactNode }) {
  return (
    <div className="py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-4 text-[13px] leading-5">
        <span className="font-medium text-fg">{title}</span>
        <span className="text-fg-2 tabular">{value}</span>
      </div>
      {children}
    </div>
  )
}

export default function Water() {
  const water = useStore((s) => s.home.water)
  const events = useStore((s) => s.events)
  const setValve = useStore((s) => s.setValve)
  const resolveLeak = useStore((s) => s.resolveLeak)
  const updateSettings = useStore((s) => s.updateWaterSettings)
  const setSensorWet = useStore((s) => s.setLeakSensorWet)

  const leak = water.status === 'leak'
  const warning = water.status === 'warning'
  const closed = water.valve === 'closed'
  const tone: Tone = leak ? 'critical' : warning ? 'warning' : water.valve === 'open' ? 'good' : 'warning'
  const label = leak
    ? closed
      ? 'Leak contained'
      : 'Leak detected'
    : warning
      ? 'Watching continuous flow'
      : water.valve === 'open'
        ? 'Protected'
        : water.valve === 'closed'
          ? 'Valve closed'
          : water.valve === 'opening'
            ? 'Restoring water'
            : 'Closing valve'
  const headline = leak
    ? closed
      ? 'Leak contained. Water is off.'
      : water.valve === 'closing'
        ? 'Leak detected. Closing the main valve.'
        : 'Leak detected. The main valve is open.'
    : warning
      ? 'Water has been running unusually long'
      : water.valve === 'closed'
        ? 'Main valve is closed'
        : water.valve === 'opening'
          ? 'Restoring water to your home'
          : water.valve === 'closing'
            ? 'Closing the main valve'
            : 'Your home is protected'
  const description = leak
    ? `${water.leakCause}. Detected at ${water.leakDetectedAt ? formatClock(water.leakDetectedAt) : '—'}.${water.settings.notifyOps ? ' Your field-services team has been notified.' : ''}`
    : warning
      ? `Continuous flow for ${Math.round(water.continuousFlowMinutes)} min. The valve closes automatically at ${water.settings.maxContinuousMinutes} min.`
      : water.valve === 'closed'
        ? 'Water to the house is off. Open the valve to restore supply.'
        : water.activeFixture
          ? `${water.activeFixture.name} in use at ${water.flowGpm.toFixed(1)} GPM. Normal usage pattern.`
          : `No water running. Flow, pressure and ${water.leakSensors.length} leak sensors are monitored around the clock.`
  const continuousRatio = water.continuousFlowMinutes / water.settings.maxContinuousMinutes
  const wet = water.leakSensors.filter((s) => s.wet).length
  const waterEvents = events.filter((e) => e.scope !== 'ops' && (e.category === 'water' || (e.category === 'automation' && e.title.toLowerCase().includes('shut'))))
  const heroTint = leak ? 'critical' : warning ? 'warning' : null

  return (
    <>
      <PageHeader eyebrow="Water" title="Leak detection and automatic shut-off" subtitle="A flow sensor and motorized valve on the main line, plus leak sensors at every risk point." />

      <Card padded={false} className={cn('mb-6 overflow-hidden', heroTint && HERO_CARD[heroTint])}>
        <div className={cn('p-5 sm:p-6', heroTint && HERO_TINT[heroTint])}>
          <StatusHero
            tone={tone}
            pulse={leak}
            label={label}
            title={headline}
            description={description}
            actions={
              leak ? (
                <>
                  {water.valve === 'open' && (
                    <Button variant="danger" icon={Power} onClick={() => setValve(false)}>
                      Close valve now
                    </Button>
                  )}
                  <Button variant={water.valve === 'open' ? 'secondary' : 'primary'} icon={CheckCircle2} onClick={resolveLeak}>
                    Leak fixed, restore water
                  </Button>
                </>
              ) : water.valve === 'open' || water.valve === 'opening' ? (
                <Button icon={Power} onClick={() => setValve(false)} disabled={water.valve === 'opening'}>
                  Close main valve
                </Button>
              ) : (
                <Button variant="primary" icon={Power} onClick={() => setValve(true)} disabled={water.valve === 'closing'}>
                  Open main valve
                </Button>
              )
            }
          />
        </div>
        <div className="border-t border-border bg-surface-2 px-2 pt-6 pb-5 sm:px-8">
          <PipeDiagram flow={water.flowGpm} valve={water.valve} status={water.status} pressure={water.pressurePsi} />
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Flow now"
          value={water.flowGpm.toFixed(1)}
          unit="GPM"
          tone={water.flowGpm > water.settings.maxFlowGpm ? 'critical' : 'neutral'}
          hint={water.activeFixture ? water.activeFixture.name : water.flowGpm > 0.02 ? 'Unidentified flow' : 'No water running'}
        />
        <Stat
          label="Line pressure"
          value={water.pressurePsi.toFixed(0)}
          unit="psi"
          tone={water.pressurePsi < 40 && water.valve === 'open' ? 'warning' : 'neutral'}
          hint={water.valve === 'closed' ? 'Isolated, valve closed' : 'Normal range 50–70 psi'}
        />
        <Stat label="Used today" value={num(water.todayGallons)} unit="gal" hint={`${num(water.monthGallons)} gal this month`} />
        <Stat
          label="Continuous flow"
          value={Math.round(water.continuousFlowMinutes)}
          unit={`of ${water.settings.maxContinuousMinutes} min`}
          tone={continuousRatio > 0.7 ? 'warning' : 'neutral'}
          hint={<ProgressBar className="mt-2" value={continuousRatio} tone={continuousRatio > 0.7 ? 'warning' : 'accent'} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex min-w-0 flex-col lg:col-span-2">
          <CardHeader
            title="Live flow rate"
            subtitle={`Last 2 minutes · shut-off above ${water.settings.maxFlowGpm} GPM`}
            action={
              <Badge tone={water.flowGpm > 0.02 ? 'info' : 'neutral'} dot>
                {water.flowGpm > 0.02 ? 'Water running' : 'Idle'}
              </Badge>
            }
          />
          <div className="mt-auto">
            <TimeSeriesChart
              label="Water flow rate in gallons per minute over the last two minutes"
              data={water.history.map((h) => ({ t: h.t, v: h.gpm }))}
              unit="GPM"
              height={272}
              threshold={{ value: water.settings.maxFlowGpm, label: `Shut-off ${water.settings.maxFlowGpm} GPM` }}
              formatValue={(v) => v.toFixed(2)}
            />
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <CardHeader title="Protection rules" subtitle="Demo clock: 1 second = 1 minute" className="mb-1" />
          <div className="divide-y divide-border">
            <RuleRow title="Automatic shut-off" description="Close the main valve when a leak is detected">
              <Toggle checked={water.settings.autoShutoff} onChange={(v) => updateSettings({ autoShutoff: v })} tone="good" label="Automatic shut-off" />
            </RuleRow>
            <SliderRow title="Max flow rate" value={`${water.settings.maxFlowGpm} GPM`}>
              <Slider label="Max flow rate" value={water.settings.maxFlowGpm} min={3} max={12} step={0.5} onChange={(v) => updateSettings({ maxFlowGpm: v })} />
            </SliderRow>
            <SliderRow title="Max continuous flow" value={`${water.settings.maxContinuousMinutes} min`}>
              <Slider label="Max continuous flow" value={water.settings.maxContinuousMinutes} min={10} max={120} step={5} onChange={(v) => updateSettings({ maxContinuousMinutes: v })} />
            </SliderRow>
            <RuleRow title="Notify field-services team" description="Opens a follow-up ticket automatically">
              <Toggle checked={water.settings.notifyOps} onChange={(v) => updateSettings({ notifyOps: v })} label="Notify field-services team" />
            </RuleRow>
          </div>
          <div className="-mx-5 mt-auto -mb-5 grid grid-cols-2 divide-x divide-border border-t border-border bg-surface-2">
            <div className="px-5 py-3">
              <div className="text-xs text-fg-3">Automatic shut-offs</div>
              <div className="text-base leading-6 font-semibold text-fg tabular">{water.shutoffCount}</div>
            </div>
            <div className="px-5 py-3">
              <div className="text-xs text-fg-3">Damage avoided</div>
              <div className="text-base leading-6 font-semibold text-fg tabular">
                {num(water.gallonsSaved)} <span className="text-[13px] font-medium text-fg-3">gal</span>
              </div>
            </div>
          </div>
        </Card>

        <Card padded={false} className="min-w-0 lg:col-span-2">
          <div className="px-5 pt-5">
            <CardHeader
              title="Leak sensors"
              subtitle="Use Test to simulate water at a sensor"
              className="mb-2"
              action={
                <Badge tone={wet ? 'critical' : 'good'} dot>
                  {wet ? `${wet} wet` : 'All dry'}
                </Badge>
              }
            />
          </div>
          <div className="divide-y divide-border border-t border-border">
            {water.leakSensors.map((s) => (
              <ListRow
                key={s.id}
                className={cn('px-5', s.wet && 'bg-critical-soft')}
                icon={Droplets}
                iconClassName={s.wet ? 'text-critical-fg' : undefined}
                title={s.name}
                meta={`${s.location} · ${s.battery}% battery`}
                trailing={
                  s.wet ? (
                    <Badge tone="critical" dot>
                      Water detected
                    </Badge>
                  ) : (
                    <>
                      <Badge tone="good">Dry</Badge>
                      <Button size="xs" variant="ghost" onClick={() => setSensorWet(s.id, true)}>
                        Test
                      </Button>
                    </>
                  )
                }
              />
            ))}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Daily usage" subtitle="Gallons per day, last 7 days" />
          <div className="mt-auto">
            <BarChart
              label="Daily water usage in gallons for the last seven days"
              data={water.dailyUsage.map((d) => ({ label: d.day, value: d.gallons }))}
              unit="gal"
              height={232}
              formatValue={(v) => num(v)}
            />
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Water activity" subtitle="Leaks, shut-offs and valve changes" />
          <EventFeed events={waterEvents} limit={8} emptyText="No water events yet" />
        </Card>
      </div>
    </>
  )
}
