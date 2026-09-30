import { useState } from 'react'
import { AppWindow, Droplets, Fan, Flame, Lightbulb, LightbulbOff, Lock, LockOpen, Minus, PersonStanding, Plus, Power, Snowflake, Thermometer, Video, Warehouse, type LucideIcon } from 'lucide-react'
import { ROOM_ICONS } from '@/components/home/icons'
import { Badge, Button, Card, PageHeader, Segmented, Slider, Toggle } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'
import type { ThermostatMode } from '@/types'

const MODE_META: Record<ThermostatMode, { label: string; icon: LucideIcon; color: string }> = {
  cool: { label: 'Cool', icon: Snowflake, color: '#38bdf8' },
  heat: { label: 'Heat', icon: Flame, color: '#fb923c' },
  auto: { label: 'Auto', icon: Fan, color: '#a78bfa' },
  off: { label: 'Off', icon: Power, color: '#52525b' },
}

function ThermostatDial() {
  const t = useStore((s) => s.home.thermostat)
  const setTarget = useStore((s) => s.setThermostatTarget)
  const setMode = useStore((s) => s.setThermostatMode)
  const meta = MODE_META[t.mode]
  const min = 60
  const max = 86
  const angle = (v: number) => -135 + ((v - min) / (max - min)) * 270
  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: 100 + r * Math.cos(rad), y: 100 + r * Math.sin(rad) }
  }
  const arc = (from: number, to: number, r: number) => {
    const a = polar(from, r)
    const b = polar(to, r)
    const large = to - from > 180 ? 1 : 0
    return `M${a.x},${a.y} A${r},${r} 0 ${large} 1 ${b.x},${b.y}`
  }
  const knob = polar(angle(t.target), 78)
  const cur = polar(angle(Math.max(min, Math.min(max, t.current))), 78)
  const working = t.mode !== 'off' && Math.abs(t.current - t.target) > 0.3
  return (
    <Card className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Thermometer className="size-4 text-fg-3" />
          Thermostat
        </div>
        <Badge tone={t.mode === 'off' ? 'neutral' : 'info'}>{working ? `${meta.label === 'Cool' ? 'Cooling' : meta.label === 'Heat' ? 'Heating' : 'Adjusting'} to ${t.target}°` : t.mode === 'off' ? 'Off' : 'Holding'}</Badge>
      </div>
      <div className="relative w-full max-w-[240px]">
        <svg viewBox="0 0 200 200" className="w-full">
          <path d={arc(-135, 135, 78)} stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" strokeLinecap="round" />
          {t.mode !== 'off' && <path d={arc(-135, angle(t.target), 78)} stroke={meta.color} strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.85" />}
          <circle cx={cur.x} cy={cur.y} r="4" fill="#e4e4e7" />
          <circle cx={knob.x} cy={knob.y} r="9" fill="#10151c" stroke={meta.color} strokeWidth="3" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[11px] tracking-wide text-fg-3 uppercase">Set to</div>
          <div className="text-5xl font-semibold tracking-tight text-fg tabular">{t.target}°</div>
          <div className="mt-1 text-xs text-fg-3">Inside {t.current.toFixed(1)}° · {t.humidity}% RH</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="md" icon={Minus} onClick={() => setTarget(t.target - 1)} aria-label="Lower" />
        <Button variant="secondary" size="md" icon={Plus} onClick={() => setTarget(t.target + 1)} aria-label="Raise" />
      </div>
      <Segmented
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

  return (
    <>
      <PageHeader
        eyebrow="Devices"
        title="Lights, locks & climate"
        subtitle={`${deviceCount} connected devices · ${lightsOn} lights on`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={LightbulbOff} onClick={allOff}>
              All lights off
            </Button>
            <Button variant="secondary" size="sm" icon={Lock} onClick={lockAll}>
              Lock all doors
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        <ThermostatDial />
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-fg">Doors & garage</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {home.doors.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <div className={cn('flex size-10 items-center justify-center rounded-xl', d.kind === 'garage' ? (d.open ? 'bg-warning-soft text-warning-fg' : 'bg-good-soft text-good-fg') : d.locked ? 'bg-good-soft text-good-fg' : 'bg-warning-soft text-warning-fg')}>
                    {d.kind === 'garage' ? <Warehouse className={cn('size-5', d.moving && 'animate-pulse')} /> : d.locked ? <Lock className="size-5" /> : <LockOpen className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-fg">{d.name}</div>
                    <div className="text-xs text-fg-3">{d.kind === 'garage' ? (d.moving ? `${d.moving === 'opening' ? 'Opening' : 'Closing'}…` : d.open ? 'Open' : 'Closed') : d.locked ? 'Locked' : 'Unlocked'}</div>
                  </div>
                  {d.kind === 'garage' ? (
                    <Button size="xs" variant="secondary" disabled={!!d.moving} onClick={() => setGarage(d.id, !d.open)}>
                      {d.open ? 'Close' : 'Open'}
                    </Button>
                  ) : (
                    <Toggle checked={d.locked} onChange={(v) => setLock(d.id, v)} tone="good" label={d.name} />
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="mb-3 text-sm font-semibold text-fg">Device health</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: Lightbulb, label: 'Lights', value: `${home.lights.length}`, hint: 'Zigbee' },
                { icon: AppWindow, label: 'Contact sensors', value: `${home.windows.length + home.doors.length}`, hint: 'All reporting' },
                { icon: Droplets, label: 'Leak sensors', value: `${home.water.leakSensors.length}`, hint: `${home.water.leakSensors.filter((s) => s.wet).length} wet` },
                { icon: Video, label: 'Cameras', value: `${home.cameras.filter((c) => c.online).length}/${home.cameras.length}`, hint: 'Online' },
                { icon: PersonStanding, label: 'Motion', value: `${home.motion.length}`, hint: 'Z-Wave' },
                { icon: Lock, label: 'Smart locks', value: `${home.doors.filter((d) => d.kind === 'lock').length}`, hint: `Min battery ${Math.min(...home.doors.filter((d) => d.kind === 'lock').map((d) => d.battery))}%` },
              ].map((x) => (
                <div key={x.label} className="rounded-xl border border-border bg-surface-2 p-3">
                  <x.icon className="mb-2 size-4 text-fg-3" />
                  <div className="text-lg font-semibold text-fg tabular">{x.value}</div>
                  <div className="text-[11px] text-fg-3">{x.label}</div>
                  <div className="text-[10px] text-fg-4">{x.hint}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented value={room} onChange={setRoom} size="sm" options={[{ value: 'all', label: 'All rooms' }, ...home.rooms.map((r) => ({ value: r.id, label: r.name }))]} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((r) => {
          const Icon = ROOM_ICONS[r.icon]
          const lights = home.lights.filter((l) => l.roomId === r.id)
          const windows = home.windows.filter((w) => w.roomId === r.id)
          const leaks = home.water.leakSensors.filter((s) => s.location.toLowerCase().includes(r.name.split(' ')[0].toLowerCase()))
          const anyOn = lights.some((l) => l.on)
          if (!lights.length && !windows.length) return null
          return (
            <Card key={r.id}>
              <div className="mb-3 flex items-center gap-3">
                <div className={cn('flex size-9 items-center justify-center rounded-xl', anyOn ? 'bg-warning-soft text-warning-fg' : 'bg-surface-2 text-fg-3')}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-fg">{r.name}</div>
                  <div className="text-[11px] text-fg-3">{lights.filter((l) => l.on).length} of {lights.length} lights on</div>
                </div>
                {lights.length > 0 && <Toggle checked={anyOn} onChange={(v) => setRoomLights(r.id, v)} label={`${r.name} lights`} />}
              </div>
              <div className="flex flex-col gap-2">
                {lights.map((l) => (
                  <div key={l.id} className="rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleLight(l.id)} className={cn('flex size-8 items-center justify-center rounded-lg transition', l.on ? 'bg-warning-soft text-warning-fg' : 'bg-surface-2 text-fg-3')} aria-label={`Toggle ${l.name}`}>
                        <Lightbulb className="size-4" />
                      </button>
                      <div className="flex-1 text-sm text-fg">{l.name}</div>
                      <span className="w-10 text-right text-xs text-fg-3 tabular">{l.on ? `${l.brightness}%` : 'Off'}</span>
                    </div>
                    <Slider label={`${l.name} brightness`} className="mt-2.5" value={l.on ? l.brightness : 0} min={0} max={100} onChange={(v) => (v === 0 ? l.on && toggleLight(l.id) : setBrightness(l.id, v))} />
                  </div>
                ))}
                {windows.map((w) => (
                  <div key={w.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
                    <AppWindow className="size-4 text-fg-3" />
                    <span className="flex-1 text-sm text-fg-2">{w.name}</span>
                    <Badge tone={w.open ? 'warning' : 'good'}>{w.open ? 'Open' : 'Closed'}</Badge>
                  </div>
                ))}
                {leaks.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
                    <Droplets className="size-4 text-fg-3" />
                    <span className="flex-1 text-sm text-fg-2">{s.name}</span>
                    <Badge tone={s.wet ? 'critical' : 'good'}>{s.wet ? 'Wet' : 'Dry'}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
