import { useState } from 'react'
import { AppWindow, Droplets, Fan, Flame, Lightbulb, LightbulbOff, Lock, LockOpen, Minus, Plus, Power, Snowflake, Warehouse, type LucideIcon } from 'lucide-react'
import { ROOM_ICONS } from '@/components/home/icons'
import { ListRow } from '@/components/home/ListRow'
import { DeviceTile } from '@/components/home/Tile'
import { Badge, Button, Card, CardHeader, PageHeader, SectionTitle, Segmented, Slider, Toggle, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'
import type { ThermostatMode } from '@/types'

const MODE_META: Record<ThermostatMode, { label: string; icon: LucideIcon; stroke: string; tone: Tone; working: string }> = {
  cool: { label: 'Cool', icon: Snowflake, stroke: 'stroke-info', tone: 'info', working: 'Cooling' },
  heat: { label: 'Heat', icon: Flame, stroke: 'stroke-serious', tone: 'serious', working: 'Heating' },
  auto: { label: 'Auto', icon: Fan, stroke: 'stroke-accent', tone: 'accent', working: 'Adjusting' },
  off: { label: 'Off', icon: Power, stroke: 'stroke-border-strong', tone: 'neutral', working: 'Off' },
}

const MIN_TEMP = 60
const MAX_TEMP = 86

function angle(v: number) {
  return -135 + ((v - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * 270
}

function polar(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) }
}

function arc(from: number, to: number, r: number) {
  const a = polar(from, r)
  const b = polar(to, r)
  const large = to - from > 180 ? 1 : 0
  return `M${a.x},${a.y} A${r},${r} 0 ${large} 1 ${b.x},${b.y}`
}

function ThermostatCard() {
  const t = useStore((s) => s.home.thermostat)
  const setTarget = useStore((s) => s.setThermostatTarget)
  const setMode = useStore((s) => s.setThermostatMode)
  const meta = MODE_META[t.mode]
  const knob = polar(angle(t.target), 80)
  const cur = polar(angle(Math.max(MIN_TEMP, Math.min(MAX_TEMP, t.current))), 80)
  const working = t.mode !== 'off' && Math.abs(t.current - t.target) > 0.3
  const off = t.mode === 'off'

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Thermostat"
        subtitle={`Whole home · ${t.humidity}% humidity`}
        action={
          <Badge tone={off ? 'neutral' : meta.tone} dot>
            {off ? 'Off' : working ? `${meta.working} to ${t.target}°` : 'Holding'}
          </Badge>
        }
      />
      <div className="flex flex-1 flex-col justify-center">
        <div className="relative mx-auto w-full max-w-[232px]">
          <svg viewBox="0 0 200 200" className="block w-full" role="img" aria-label={`Set to ${t.target} degrees, currently ${t.current.toFixed(1)} degrees`}>
            <path d={arc(-135, 135, 80)} className="fill-none stroke-surface-3" strokeWidth="10" strokeLinecap="round" />
            {!off && <path d={arc(-135, angle(t.target), 80)} className={cn('fill-none', meta.stroke)} strokeWidth="10" strokeLinecap="round" />}
            <circle cx={cur.x} cy={cur.y} r="3" className="fill-fg-3" />
            <circle cx={knob.x} cy={knob.y} r="9" className={cn('fill-surface', meta.stroke)} strokeWidth="3" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xs font-medium text-fg-3">{off ? 'Off' : 'Set to'}</div>
            <div className={cn('text-5xl leading-tight font-semibold tracking-[-0.03em] tabular', off ? 'text-fg-3' : 'text-fg')}>{t.target}°</div>
            <div className="text-xs text-fg-3 tabular">Inside {t.current.toFixed(1)}°</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Button icon={Minus} onClick={() => setTarget(t.target - 1)} aria-label="Lower temperature" />
          <Button icon={Plus} onClick={() => setTarget(t.target + 1)} aria-label="Raise temperature" />
        </div>
      </div>
      <Segmented
        className="mt-5 w-full [&>button]:flex-1 [&>button]:justify-center"
        size="sm"
        value={t.mode}
        onChange={setMode}
        options={(Object.keys(MODE_META) as ThermostatMode[]).map((m) => ({ value: m, label: MODE_META[m].label, icon: MODE_META[m].icon }))}
      />
    </Card>
  )
}

export default function Devices() {
  const home = useStore((s) => s.home)
  const toggleLight = useStore((s) => s.toggleLight)
  const setBrightness = useStore((s) => s.setBrightness)
  const setRoomLights = useStore((s) => s.setRoomLights)
  const allOff = useStore((s) => s.allLightsOff)
  const setLock = useStore((s) => s.setLock)
  const lockAll = useStore((s) => s.lockAll)
  const setGarage = useStore((s) => s.setGarage)
  const [room, setRoom] = useState<string>('all')

  const rooms = room === 'all' ? home.rooms : home.rooms.filter((r) => r.id === room)
  const deviceCount = home.lights.length + home.doors.length + home.windows.length + home.motion.length + home.cameras.length + home.water.leakSensors.length + 2
  const lightsOn = home.lights.filter((l) => l.on).length
  const locks = home.doors.filter((d) => d.kind === 'lock')
  const wetSensors = home.water.leakSensors.filter((s) => s.wet).length
  const health = [
    { label: 'Lights', hint: 'Zigbee', value: `${home.lights.length}` },
    { label: 'Contact sensors', hint: 'All reporting', value: `${home.windows.length + home.doors.length}` },
    { label: 'Leak sensors', hint: wetSensors ? `${wetSensors} wet` : 'All dry', value: `${home.water.leakSensors.length}` },
    { label: 'Cameras', hint: 'Online', value: `${home.cameras.filter((c) => c.online).length} of ${home.cameras.length}` },
    { label: 'Motion sensors', hint: 'Z-Wave', value: `${home.motion.length}` },
    { label: 'Smart locks', hint: `Lowest battery ${Math.min(...locks.map((d) => d.battery))}%`, value: `${locks.length}` },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Devices"
        title="Lights, locks and climate"
        subtitle={`${deviceCount} connected devices · ${lightsOn} lights on`}
        actions={
          <>
            <Button size="sm" icon={LightbulbOff} onClick={allOff}>
              All lights off
            </Button>
            <Button size="sm" icon={Lock} onClick={lockAll}>
              Lock all doors
            </Button>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ThermostatCard />
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="Doors and garage" subtitle="Tap a tile to lock, unlock, open or close" />
            <div className="grid grid-cols-2 gap-3">
              {home.doors.map((d) =>
                d.kind === 'garage' ? (
                  <DeviceTile
                    key={d.id}
                    icon={Warehouse}
                    iconClassName={d.moving ? 'animate-pulse' : undefined}
                    name={d.name}
                    state={d.moving ? `${d.moving === 'opening' ? 'Opening' : 'Closing'}…` : d.open ? 'Open' : 'Closed'}
                    attention={d.open || !!d.moving}
                    pressed={d.open}
                    disabled={!!d.moving}
                    onClick={() => setGarage(d.id, !d.open)}
                  />
                ) : (
                  <DeviceTile
                    key={d.id}
                    icon={d.locked ? Lock : LockOpen}
                    name={d.name}
                    state={`${d.locked ? 'Locked' : 'Unlocked'} · ${d.battery}% battery`}
                    attention={!d.locked}
                    pressed={d.locked}
                    onClick={() => setLock(d.id, !d.locked)}
                  />
                ),
              )}
            </div>
          </Card>
          <Card className="flex-1">
            <CardHeader title="Device health" subtitle="Every device is reporting normally" className="mb-2" />
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {health.map((h) => (
                <div key={h.label} className="flex items-center justify-between gap-3 border-t border-border py-2.5">
                  <dt className="min-w-0">
                    <span className="block text-[13px] leading-5 font-medium text-fg">{h.label}</span>
                    <span className="block text-xs leading-4 text-fg-3">{h.hint}</span>
                  </dt>
                  <dd className="text-sm font-semibold text-fg tabular">{h.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      <SectionTitle>Rooms</SectionTitle>
      <div className="mb-4">
        <Segmented value={room} onChange={setRoom} size="sm" options={[{ value: 'all', label: 'All rooms' }, ...home.rooms.map((r) => ({ value: r.id, label: r.name }))]} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((r) => {
          const Icon = ROOM_ICONS[r.icon]
          const lights = home.lights.filter((l) => l.roomId === r.id)
          const windows = home.windows.filter((w) => w.roomId === r.id)
          const leaks = home.water.leakSensors.filter((s) => s.location.toLowerCase().includes(r.name.split(' ')[0].toLowerCase()))
          const on = lights.filter((l) => l.on).length
          if (!lights.length && !windows.length) return null
          return (
            <Card key={r.id} padded={false} className="min-w-0">
              <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                <Icon className={cn('size-4 shrink-0', on ? 'text-warning-fg' : 'text-fg-3')} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-fg">{r.name}</div>
                  <div className="text-xs text-fg-3">{lights.length ? `${on} of ${lights.length} lights on` : 'No lights'}</div>
                </div>
                {lights.length > 0 && <Toggle checked={on > 0} onChange={(v) => setRoomLights(r.id, v)} label={`${r.name} lights`} />}
              </div>
              <div className="divide-y divide-border border-t border-border px-5">
                {lights.map((l) => (
                  <div key={l.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <Lightbulb className={cn('size-4 shrink-0', l.on ? 'text-warning-fg' : 'text-fg-3')} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{l.name}</span>
                      <span className="w-9 text-right text-xs text-fg-3 tabular">{l.on ? `${l.brightness}%` : 'Off'}</span>
                      <Toggle size="sm" checked={l.on} onChange={() => toggleLight(l.id)} label={l.name} />
                    </div>
                    <div className="mt-2 pl-7">
                      <Slider
                        label={`${l.name} brightness`}
                        className={l.on ? undefined : 'opacity-50'}
                        value={l.on ? l.brightness : 0}
                        min={0}
                        max={100}
                        onChange={(v) => (v === 0 ? l.on && toggleLight(l.id) : setBrightness(l.id, v))}
                      />
                    </div>
                  </div>
                ))}
                {windows.map((w) => (
                  <ListRow
                    key={w.id}
                    className="min-h-0 py-2.5"
                    icon={AppWindow}
                    iconClassName={w.open ? 'text-warning-fg' : undefined}
                    title={w.name}
                    trailing={
                      <Badge tone={w.open ? 'warning' : 'neutral'} dot>
                        {w.open ? 'Open' : 'Closed'}
                      </Badge>
                    }
                  />
                ))}
                {leaks.map((s) => (
                  <ListRow
                    key={s.id}
                    className="min-h-0 py-2.5"
                    icon={Droplets}
                    iconClassName={s.wet ? 'text-critical-fg' : undefined}
                    title={`${s.name} leak sensor`}
                    trailing={
                      <Badge tone={s.wet ? 'critical' : 'good'} dot>
                        {s.wet ? 'Wet' : 'Dry'}
                      </Badge>
                    }
                  />
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
