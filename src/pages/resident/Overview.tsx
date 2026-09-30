import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  ChevronRight,
  Droplets,
  LifeBuoy,
  Lightbulb,
  Lock,
  LockOpen,
  Minus,
  Moon,
  Plane,
  Plus,
  ShieldCheck,
  Sun,
  Thermometer,
  Wifi,
  WifiOff,
  Workflow,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { EventFeed } from '@/components/EventFeed'
import { CameraTile } from '@/components/home/CameraTile'
import { Badge, Button, Card, CardHeader, SectionTitle, StatusDot, Toggle, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { greeting } from '@/lib/format'
import { usePartner } from '@/lib/hooks'
import { useStore } from '@/store/useStore'
import { ROOM_ICONS, SCENE_ICONS } from '@/components/home/icons'

function StatusCard({ to, icon: Icon, title, value, detail, tone, pulse, children }: { to: string; icon: LucideIcon; title: string; value: string; detail: string; tone: Tone; pulse?: boolean; children?: ReactNode }) {
  return (
    <Card className={cn('flex flex-col gap-3', tone === 'critical' && 'border-critical-line bg-critical-soft', tone === 'warning' && 'border-warning-line')}>
      <Link to={to} className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-fg-2 ring-1 ring-border">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-xs text-fg-3">{title}</div>
            <div className="flex items-center gap-2 text-base font-semibold text-fg">
              <StatusDot tone={tone} pulse={pulse} />
              {value}
            </div>
          </div>
        </div>
        <ChevronRight className="size-4 text-fg-4" />
      </Link>
      <p className="text-xs leading-relaxed text-fg-3">{detail}</p>
      {children}
    </Card>
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
  const partner = usePartner()

  const { security, water, network, thermostat } = home
  const firstName = home.residentName.split(' ')[0]
  const lightsOn = home.lights.filter((l) => l.on).length
  const unlocked = home.doors.filter((d) => d.kind === 'lock' && !d.locked)
  const openWindows = home.windows.filter((w) => w.open)

  const secTone: Tone = security.status === 'alarm' ? 'critical' : security.status === 'entry-delay' ? 'warning' : security.mode === 'disarmed' ? 'neutral' : 'good'
  const secValue = security.status === 'alarm' ? 'ALARM' : security.status === 'entry-delay' ? 'Entry delay' : security.status === 'arming' ? 'Arming…' : security.mode === 'disarmed' ? 'Disarmed' : security.mode === 'away' ? 'Armed · Away' : 'Armed · Home'
  const waterTone: Tone = water.status === 'leak' ? 'critical' : water.status === 'warning' || water.valve !== 'open' ? 'warning' : 'good'
  const netTone: Tone = network.status === 'online' ? 'good' : network.status === 'degraded' ? 'warning' : 'critical'

  const frontDoor = home.doors.find((d) => d.id === 'd-front')
  const garage = home.doors.find((d) => d.id === 'd-garage')
  const porch = home.lights.find((l) => l.id === 'l-porch')
  const homeEvents = events.filter((e) => e.scope !== 'ops')

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-fg-3">{home.address}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-fg-3">
            {lightsOn} lights on · {unlocked.length ? `${unlocked.length} door${unlocked.length > 1 ? 's' : ''} unlocked` : 'All doors locked'} · {thermostat.current.toFixed(0)}°F inside
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2.5">
          <Sun className="size-6 text-warning-fg" />
          <div>
            <div className="text-sm font-semibold text-fg">86°F · Sunny</div>
            <div className="text-xs text-fg-3">Harbour Heights, FL · Humidity 71%</div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <StatusCard
          to="/home/security"
          icon={ShieldCheck}
          title="Security"
          value={secValue}
          tone={secTone}
          pulse={secTone === 'critical' || secTone === 'warning'}
          detail={
            security.status === 'alarm'
              ? `${security.triggeredBy} triggered the alarm. Monitoring center notified.`
              : openWindows.length
                ? `${openWindows.map((w) => w.name).join(', ')} open.`
                : `All ${home.windows.length} windows closed · ${home.cameras.filter((c) => c.online).length} cameras online.`
          }
        >
          {security.mode === 'disarmed' ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={Moon} onClick={() => arm('home')} className="flex-1">
                Arm Home
              </Button>
              <Button size="sm" variant="secondary" icon={Plane} onClick={() => arm('away')} className="flex-1">
                Arm Away
              </Button>
            </div>
          ) : (
            <Link to="/home/security">
              <Button size="sm" variant={security.status === 'alarm' || security.status === 'entry-delay' ? 'danger' : 'secondary'} className="w-full" iconRight={ArrowRight}>
                Disarm with PIN
              </Button>
            </Link>
          )}
        </StatusCard>
        <StatusCard
          to="/home/water"
          icon={Droplets}
          title="Water protection"
          value={water.status === 'leak' ? 'Leak detected' : water.valve !== 'open' ? `Valve ${water.valve}` : water.status === 'warning' ? 'Unusual flow' : 'Protected'}
          tone={waterTone}
          pulse={water.status === 'leak'}
          detail={
            water.status === 'leak'
              ? `${water.leakCause}. ${water.valve === 'closed' ? 'Main valve closed automatically.' : 'Closing main valve…'}`
              : `${water.flowGpm > 0 ? `${water.flowGpm.toFixed(1)} GPM flowing${water.activeFixture ? ` · ${water.activeFixture.name}` : ''}` : 'No flow'} · ${water.pressurePsi.toFixed(0)} psi · ${water.leakSensors.length} leak sensors dry`
          }
        >
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-xs">
            <span className="text-fg-3">Auto shut-off</span>
            <Badge tone={water.settings.autoShutoff ? 'good' : 'warning'}>{water.settings.autoShutoff ? 'Armed' : 'Off'}</Badge>
          </div>
        </StatusCard>
        <StatusCard
          to="/home/network"
          icon={network.status === 'los' ? WifiOff : Wifi}
          title={`Internet · ${partner.short}`}
          value={network.status === 'online' ? 'Online' : network.status === 'degraded' ? 'Degraded' : 'Outage'}
          tone={netTone}
          pulse={network.status === 'los'}
          detail={
            network.status === 'los'
              ? `Fiber signal lost in your area. ${network.backupActive ? 'Hub is on LTE backup — alarm and leak protection stay online.' : ''} Technician dispatched.`
              : `${network.planName} · ${network.downMbps} Mbps in use · ${network.latencyMs} ms · ${network.clients.length} devices`
          }
        >
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-xs">
            <span className="text-fg-3">Fiber signal</span>
            <span className="font-mono text-fg">{network.rxPowerDbm === null ? 'No light' : `${network.rxPowerDbm.toFixed(1)} dBm`}</span>
          </div>
        </StatusCard>
      </div>

      <SectionTitle>Scenes</SectionTitle>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {home.scenes.map((scene) => {
          const Icon = SCENE_ICONS[scene.icon]
          const active = home.lastSceneId === scene.id
          return (
            <button
              key={scene.id}
              onClick={() => runScene(scene.id)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition',
                active ? 'border-accent-line bg-accent-soft' : 'border-border bg-surface-2 hover:border-border-strong hover:bg-surface-3',
              )}
            >
              <Icon className={cn('size-5', active ? 'text-accent-fg' : 'text-fg-3')} />
              <span className="text-sm font-medium text-fg">{scene.name}</span>
              <span className="line-clamp-2 text-[11px] leading-snug text-fg-3">{scene.description}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Quick controls" icon={Lightbulb} action={<Link to="/home/devices" className="text-xs text-accent-fg hover:underline">All devices</Link>} />
          <div className="grid gap-2 sm:grid-cols-2">
            {frontDoor && (
              <button onClick={() => setLock(frontDoor.id, !frontDoor.locked)} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left hover:bg-surface-3">
                <div className={cn('flex size-10 items-center justify-center rounded-xl', frontDoor.locked ? 'bg-good-soft text-good-fg' : 'bg-warning-soft text-warning-fg')}>
                  {frontDoor.locked ? <Lock className="size-5" /> : <LockOpen className="size-5" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-fg">{frontDoor.name}</div>
                  <div className="text-xs text-fg-3">{frontDoor.locked ? 'Locked' : 'Unlocked'} · tap to {frontDoor.locked ? 'unlock' : 'lock'}</div>
                </div>
              </button>
            )}
            {garage && (
              <button onClick={() => setGarage(garage.id, !garage.open)} disabled={!!garage.moving} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left hover:bg-surface-3">
                <div className={cn('flex size-10 items-center justify-center rounded-xl', garage.open ? 'bg-warning-soft text-warning-fg' : 'bg-good-soft text-good-fg')}>
                  <Warehouse className={cn('size-5', garage.moving && 'animate-pulse')} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-fg">{garage.name}</div>
                  <div className="text-xs text-fg-3">{garage.moving ? `${garage.moving === 'opening' ? 'Opening' : 'Closing'}…` : garage.open ? 'Open · tap to close' : 'Closed · tap to open'}</div>
                </div>
              </button>
            )}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-info-soft text-info-fg">
                <Thermometer className="size-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-fg">{thermostat.current.toFixed(0)}°F inside</div>
                <div className="text-xs text-fg-3 capitalize">
                  {thermostat.mode} to {thermostat.target}°F
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setTarget(thermostat.target - 1)} className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-fg-2 hover:bg-surface-3" aria-label="Lower temperature">
                  <Minus className="size-4" />
                </button>
                <button onClick={() => setTarget(thermostat.target + 1)} className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-fg-2 hover:bg-surface-3" aria-label="Raise temperature">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            {porch && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                <div className={cn('flex size-10 items-center justify-center rounded-xl', porch.on ? 'bg-warning-soft text-warning-fg' : 'bg-surface-2 text-fg-3')}>
                  <Lightbulb className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-fg">{porch.name}</div>
                  <div className="text-xs text-fg-3">{porch.on ? `On · ${porch.brightness}%` : 'Off'}</div>
                </div>
                <Toggle checked={porch.on} onChange={() => toggleLight(porch.id)} label={porch.name} />
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent activity" icon={Workflow} />
          <EventFeed events={homeEvents} limit={6} compact />
        </Card>
      </div>

      <SectionTitle action={<Link to="/home/devices" className="text-xs text-accent-fg hover:underline">Manage</Link>}>Rooms</SectionTitle>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {home.rooms.map((room) => {
          const Icon = ROOM_ICONS[room.icon]
          const lights = home.lights.filter((l) => l.roomId === room.id)
          const on = lights.filter((l) => l.on).length
          return (
            <div key={room.id} className={cn('flex flex-col gap-3 rounded-xl border p-3.5 transition', on ? 'border-warning-line bg-warning-soft' : 'border-border bg-surface-2')}>
              <div className="flex items-center justify-between">
                <Icon className={cn('size-5', on ? 'text-warning-fg' : 'text-fg-3')} />
                {lights.length > 0 && <Toggle size="sm" checked={on > 0} onChange={(v) => setRoomLights(room.id, v)} label={`${room.name} lights`} />}
              </div>
              <div>
                <div className="text-sm font-medium text-fg">{room.name}</div>
                <div className="text-[11px] text-fg-3">{lights.length ? `${on}/${lights.length} lights on` : 'No lights'}</div>
              </div>
            </div>
          )
        })}
      </div>

      <SectionTitle action={<Link to="/home/security" className="text-xs text-accent-fg hover:underline">Security</Link>}>Cameras</SectionTitle>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {home.cameras.map((c) => (
          <CameraTile key={c.id} camera={c} alarm={security.status === 'alarm'} />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        <Link to="/home/automations">
          <Card className="flex items-center gap-3" padded>
            <Workflow className="size-5 text-accent-fg" />
            <span className="flex-1 text-sm font-medium">Automations</span>
            <ChevronRight className="size-4 text-fg-4" />
          </Card>
        </Link>
        <Link to="/home/support">
          <Card className="flex items-center gap-3" padded>
            <LifeBuoy className="size-5 text-accent-fg" />
            <span className="flex-1 text-sm font-medium">Support & service requests</span>
            <ChevronRight className="size-4 text-fg-4" />
          </Card>
        </Link>
      </div>
    </>
  )
}
