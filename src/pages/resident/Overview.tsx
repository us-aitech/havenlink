import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ChevronRight,
  Droplets,
  Gauge,
  LifeBuoy,
  Lightbulb,
  Lock,
  LockOpen,
  Minus,
  Moon,
  Plane,
  Plus,
  Power,
  ShieldCheck,
  ShieldOff,
  Sun,
  Thermometer,
  Warehouse,
  Wifi,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { EventFeed } from '@/components/EventFeed'
import { CameraTile } from '@/components/home/CameraTile'
import { ROOM_ICONS, SCENE_ICONS } from '@/components/home/icons'
import { DeviceTile, SceneTile } from '@/components/home/Tile'
import { Button, Card, CardHeader, PageHeader, SectionTitle, StatusDot, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { greeting } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { useStore } from '@/store/useStore'

function StatusSection({
  to,
  icon: Icon,
  title,
  value,
  detail,
  tone,
  tint,
  pulse,
  children,
  className,
}: {
  to: string
  icon: LucideIcon
  title: string
  value: string
  detail: string
  tone: Tone
  tint?: 'critical' | 'warning' | null
  pulse?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3 p-4 sm:p-5 md:gap-4', tint === 'critical' && 'bg-critical-soft', tint === 'warning' && 'bg-warning-soft', className)}>
      <Link to={to} className="group -m-1 flex items-center gap-2 rounded-md p-1 text-[13px] font-medium text-fg-3 hover:text-fg">
        <Icon className="size-4" />
        <span className="flex-1 truncate">{title}</span>
        <ChevronRight className="size-4 text-fg-4 transition-transform group-hover:translate-x-0.5 group-hover:text-fg-3" />
      </Link>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusDot tone={tone} pulse={pulse} />
          <span className={cn('truncate text-lg leading-6 font-semibold tracking-[-0.01em]', tone === 'critical' ? 'text-critical-fg' : 'text-fg')}>{value}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-fg-3 md:min-h-10">{detail}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

const DIVIDER = 'border-t border-border md:border-t-0 md:border-l'

function TileLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-[13px] font-medium text-accent-fg hover:underline">
      {children}
    </Link>
  )
}

export default function Overview() {
  const home = useStore((s) => s.home)
  const events = useStore((s) => s.events)
  const arm = useStore((s) => s.armSecurity)
  const runScene = useStore((s) => s.runScene)
  const setRoomLights = useStore((s) => s.setRoomLights)
  const setLock = useStore((s) => s.setLock)
  const setGarage = useStore((s) => s.setGarage)
  const toggleLight = useStore((s) => s.toggleLight)
  const setTarget = useStore((s) => s.setThermostatTarget)
  const setValve = useStore((s) => s.setValve)
  const startSpeedTest = useStore((s) => s.startSpeedTest)
  const partner = usePartner()
  const navigate = useNavigate()
  const now = useNow(1000)

  const { security, water, network, thermostat } = home
  const firstName = home.residentName.split(' ')[0]
  const lightsOn = home.lights.filter((l) => l.on).length
  const unlocked = home.doors.filter((d) => d.kind === 'lock' && !d.locked)
  const openWindows = home.windows.filter((w) => w.open)
  const camerasOnline = home.cameras.filter((c) => c.online).length
  const wetSensors = water.leakSensors.filter((s) => s.wet).length
  const remaining = security.deadline ? Math.max(0, Math.ceil((security.deadline - now) / 1000)) : 0

  const alarm = security.status === 'alarm'
  const entry = security.status === 'entry-delay'
  const arming = security.status === 'arming'
  const secTone: Tone = alarm ? 'critical' : entry ? 'warning' : arming ? 'info' : security.mode === 'disarmed' ? 'neutral' : 'good'
  const secValue = alarm
    ? 'Alarm'
    : entry
      ? `Entry delay · ${remaining}s`
      : arming
        ? `Arming · ${remaining}s`
        : security.mode === 'disarmed'
          ? 'Disarmed'
          : security.mode === 'away'
            ? 'Armed away'
            : 'Armed home'
  const secDetail = alarm
    ? `${security.triggeredBy} opened while armed. Monitoring center notified.`
    : entry
      ? `${security.triggeredBy} opened. Enter your PIN to disarm.`
      : openWindows.length
        ? `${openWindows.map((w) => w.name).join(', ')} open · ${camerasOnline} cameras online`
        : `All ${home.windows.length} windows closed · ${camerasOnline} cameras online`

  const leak = water.status === 'leak'
  const waterTone: Tone = leak ? 'critical' : water.status === 'warning' || water.valve !== 'open' ? 'warning' : 'good'
  const waterValue = leak
    ? water.valve === 'closed'
      ? 'Leak contained'
      : 'Leak detected'
    : water.status === 'warning'
      ? 'Unusual flow'
      : water.valve === 'closed'
        ? 'Valve closed'
        : water.valve === 'opening'
          ? 'Restoring water'
          : water.valve === 'closing'
            ? 'Valve closing'
            : 'Protected'
  const waterDetail = leak
    ? `${water.leakCause}. ${water.valve === 'closed' ? 'Main valve closed automatically.' : water.valve === 'closing' ? 'Closing the main valve.' : 'Main valve is still open.'}`
    : `${water.flowGpm > 0.02 ? `${water.flowGpm.toFixed(1)} GPM${water.activeFixture ? ` · ${water.activeFixture.name}` : ''}` : 'No water running'} · ${water.pressurePsi.toFixed(0)} psi · ${wetSensors ? `${wetSensors} sensor wet` : 'All sensors dry'}`

  const outage = network.status === 'los'
  const degraded = network.status === 'degraded'
  const netTone: Tone = outage ? 'critical' : degraded ? 'warning' : 'good'
  const netValue = outage ? (network.backupActive ? 'Outage · LTE backup' : 'Outage') : degraded ? 'Degraded' : 'Online'
  const netDetail = outage
    ? 'Fiber signal lost in your area. A technician is on the way.'
    : degraded
      ? 'Weak fiber signal detected. A repair is already scheduled.'
      : network.speedTest.result
        ? `${network.planName} · last test ${network.speedTest.result.down} Mbps · ${network.clients.length} devices`
        : `${network.planName} · ${network.latencyMs} ms · ${network.clients.length} devices`

  const frontDoor = home.doors.find((d) => d.id === 'd-front')
  const garage = home.doors.find((d) => d.id === 'd-garage')
  const porch = home.lights.find((l) => l.id === 'l-porch')
  const homeEvents = events.filter((e) => e.scope !== 'ops')
  const modeLabel = thermostat.mode === 'off' ? 'Off' : `${thermostat.mode[0].toUpperCase()}${thermostat.mode.slice(1)} to ${thermostat.target}°F`

  return (
    <>
      <PageHeader
        eyebrow={home.address}
        title={`${greeting()}, ${firstName}`}
        subtitle={`${lightsOn} lights on · ${unlocked.length ? `${unlocked.length} door${unlocked.length > 1 ? 's' : ''} unlocked` : 'All doors locked'} · ${thermostat.current.toFixed(0)}°F inside`}
        actions={
          <div className="flex items-center gap-2 text-[13px]">
            <Sun className="size-4 text-fg-3" />
            <span className="font-medium text-fg tabular">86°F</span>
            <span className="text-fg-3">Sunny · Humidity 71%</span>
          </div>
        }
      />

      <Card padded={false} className={cn('mb-8 grid grid-cols-1 overflow-hidden md:grid-cols-3', alarm || leak || outage ? 'border-critical-line!' : undefined)}>
        <StatusSection
          to="/home/security"
          icon={ShieldCheck}
          title="Security"
          value={secValue}
          detail={secDetail}
          tone={secTone}
          tint={alarm ? 'critical' : entry ? 'warning' : null}
          pulse={alarm || entry}
        >
          {alarm || entry ? (
            <Button size="sm" variant="danger" onClick={() => navigate('/home/security')}>
              Disarm now
            </Button>
          ) : security.mode === 'disarmed' ? (
            <>
              <Button size="sm" icon={Moon} onClick={() => arm('home')}>
                Arm home
              </Button>
              <Button size="sm" icon={Plane} onClick={() => arm('away')}>
                Arm away
              </Button>
            </>
          ) : (
            <Button size="sm" icon={ShieldOff} onClick={() => navigate('/home/security')}>
              Disarm with PIN
            </Button>
          )}
        </StatusSection>
        <StatusSection
          className={DIVIDER}
          to="/home/water"
          icon={Droplets}
          title="Water"
          value={waterValue}
          detail={waterDetail}
          tone={waterTone}
          tint={leak ? 'critical' : water.status === 'warning' ? 'warning' : null}
          pulse={leak}
        >
          {leak && water.valve === 'open' ? (
            <Button size="sm" variant="danger" icon={Power} onClick={() => setValve(false)}>
              Close main valve
            </Button>
          ) : leak ? (
            <Button size="sm" onClick={() => navigate('/home/water')}>
              Review leak
            </Button>
          ) : water.valve === 'open' ? (
            <Button size="sm" icon={Power} onClick={() => setValve(false)}>
              Close valve
            </Button>
          ) : (
            <Button size="sm" variant={water.valve === 'closed' ? 'primary' : 'secondary'} icon={Power} loading={water.valve === 'opening' || water.valve === 'closing'} onClick={() => setValve(true)}>
              {water.valve === 'opening' ? 'Opening' : water.valve === 'closing' ? 'Closing' : 'Open valve'}
            </Button>
          )}
          <span className="self-center text-xs text-fg-3">Auto shut-off {water.settings.autoShutoff ? 'on' : 'off'}</span>
        </StatusSection>
        <StatusSection
          className={DIVIDER}
          to="/home/network"
          icon={Wifi}
          title={`Internet · ${partner.short}`}
          value={netValue}
          detail={netDetail}
          tone={netTone}
          tint={outage ? 'critical' : degraded ? 'warning' : null}
          pulse={outage}
        >
          {outage || degraded ? (
            <Button size="sm" variant={outage ? 'primary' : 'secondary'} onClick={() => navigate('/home/network')}>
              Track repair
            </Button>
          ) : (
            <Button size="sm" icon={Gauge} loading={network.speedTest.running} onClick={startSpeedTest}>
              {network.speedTest.running ? 'Testing' : 'Run speed test'}
            </Button>
          )}
        </StatusSection>
      </Card>

      <SectionTitle>Scenes</SectionTitle>
      <div className="-mx-4 mb-8 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-5">
        {home.scenes.map((scene) => (
          <SceneTile
            key={scene.id}
            className="w-40 shrink-0 snap-start sm:w-auto"
            icon={SCENE_ICONS[scene.icon]}
            name={scene.name}
            description={scene.description}
            active={home.lastSceneId === scene.id}
            onClick={() => runScene(scene.id)}
          />
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-2">
          <section>
            <SectionTitle action={<TileLink to="/home/devices">All devices</TileLink>}>Quick controls</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {frontDoor && (
                <DeviceTile
                  icon={frontDoor.locked ? Lock : LockOpen}
                  name={frontDoor.name}
                  state={frontDoor.locked ? 'Locked' : 'Unlocked'}
                  attention={!frontDoor.locked}
                  pressed={frontDoor.locked}
                  onClick={() => setLock(frontDoor.id, !frontDoor.locked)}
                />
              )}
              {garage && (
                <DeviceTile
                  icon={Warehouse}
                  iconClassName={garage.moving ? 'animate-pulse' : undefined}
                  name={garage.name}
                  state={garage.moving ? (garage.moving === 'opening' ? 'Opening…' : 'Closing…') : garage.open ? 'Open' : 'Closed'}
                  attention={garage.open || !!garage.moving}
                  pressed={garage.open}
                  disabled={!!garage.moving}
                  onClick={() => setGarage(garage.id, !garage.open)}
                />
              )}
              <DeviceTile
                icon={Thermometer}
                name="Thermostat"
                state={modeLabel}
                trailing={
                  <span className="-mt-1 -mr-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => setTarget(thermostat.target - 1)}
                      className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-3 hover:text-fg"
                      aria-label="Lower temperature"
                    >
                      <Minus className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTarget(thermostat.target + 1)}
                      className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-surface-3 hover:text-fg"
                      aria-label="Raise temperature"
                    >
                      <Plus className="size-4" />
                    </button>
                  </span>
                }
              />
              {porch && (
                <DeviceTile icon={Lightbulb} name={porch.name} state={porch.on ? `On · ${porch.brightness}%` : 'Off'} active={porch.on} pressed={porch.on} onClick={() => toggleLight(porch.id)} />
              )}
            </div>
          </section>

          <section>
            <SectionTitle action={<TileLink to="/home/devices">Manage</TileLink>}>Rooms</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {home.rooms.map((room) => {
                const lights = home.lights.filter((l) => l.roomId === room.id)
                const on = lights.filter((l) => l.on).length
                return (
                  <DeviceTile
                    key={room.id}
                    icon={ROOM_ICONS[room.icon]}
                    name={room.name}
                    state={!lights.length ? 'No lights' : on === 0 ? 'Off' : on === lights.length ? (lights.length === 1 ? 'On' : 'All lights on') : `${on} of ${lights.length} lights on`}
                    active={on > 0}
                    pressed={on > 0}
                    disabled={!lights.length}
                    onClick={() => setRoomLights(room.id, on === 0)}
                  />
                )
              })}
            </div>
          </section>
        </div>

        <Card className="flex min-w-0 flex-col">
          <CardHeader title="Recent activity" subtitle="Latest events in your home" />
          <EventFeed events={homeEvents} limit={8} compact />
        </Card>
      </div>

      <SectionTitle action={<TileLink to="/home/security">Security</TileLink>}>Cameras</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {home.cameras.map((c) => (
          <CameraTile key={c.id} camera={c} alarm={alarm} />
        ))}
      </div>

      <Card padded={false} className="mt-8 divide-y divide-border lg:hidden">
        {[
          { to: '/home/automations', icon: Workflow, label: 'Automations', hint: `${home.automations.filter((a) => a.enabled).length} rules active` },
          { to: '/home/support', icon: LifeBuoy, label: 'Support and service requests', hint: 'One team for fiber, WiFi and smart home' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
            <item.icon className="size-4 text-fg-3" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-fg">{item.label}</span>
              <span className="block truncate text-xs text-fg-3">{item.hint}</span>
            </span>
            <ChevronRight className="size-4 text-fg-4" />
          </Link>
        ))}
      </Card>
    </>
  )
}
