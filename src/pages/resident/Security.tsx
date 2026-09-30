import { useState } from 'react'
import { AppWindow, Headset, Lock, LockOpen, Moon, PersonStanding, Plane, ShieldCheck, ShieldOff, Warehouse } from 'lucide-react'
import { EventFeed } from '@/components/EventFeed'
import { CameraTile } from '@/components/home/CameraTile'
import { ListRow } from '@/components/home/ListRow'
import { HERO_CARD, HERO_TINT, StatusHero } from '@/components/home/StatusHero'
import { PinPad } from '@/components/PinPad'
import { Badge, Button, Card, CardHeader, Modal, PageHeader, ProgressBar, Toggle, type Tone } from '@/components/ui'
import { DEMO } from '@/config'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { useStore } from '@/store/useStore'
import type { SecurityMode } from '@/types'

const MODES: Array<{ key: SecurityMode; label: string; icon: typeof ShieldOff; hint: string }> = [
  { key: 'disarmed', label: 'Disarmed', icon: ShieldOff, hint: 'Sensors monitored, no alarm' },
  { key: 'home', label: 'Armed home', icon: Moon, hint: 'Doors and windows armed, motion off' },
  { key: 'away', label: 'Armed away', icon: Plane, hint: `All zones · ${DEMO.exitDelaySeconds}s exit delay` },
]

export default function Security() {
  const home = useStore((s) => s.home)
  const events = useStore((s) => s.events)
  const arm = useStore((s) => s.armSecurity)
  const setLock = useStore((s) => s.setLock)
  const lockAll = useStore((s) => s.lockAll)
  const setGarage = useStore((s) => s.setGarage)
  const setWindowOpen = useStore((s) => s.setWindowOpen)
  const setDoorOpen = useStore((s) => s.setDoorOpen)
  const setRecording = useStore((s) => s.setCameraRecording)
  const [pinOpen, setPinOpen] = useState(false)
  const now = useNow(250)

  const { security } = home
  const alarm = security.status === 'alarm'
  const entry = security.status === 'entry-delay'
  const arming = security.status === 'arming'
  const urgent = alarm || entry
  const disarmed = security.mode === 'disarmed'
  const remaining = security.deadline ? Math.max(0, Math.ceil((security.deadline - now) / 1000)) : 0
  const delayWindow = entry ? DEMO.entryDelaySeconds : DEMO.exitDelaySeconds
  const tone: Tone = alarm ? 'critical' : entry ? 'warning' : arming ? 'info' : disarmed ? 'neutral' : 'good'
  const label = alarm ? 'Alarm · siren on' : entry ? 'Entry delay' : arming ? 'Exit delay' : disarmed ? 'Disarmed' : 'Armed'
  const title = alarm
    ? 'Intrusion detected'
    : entry
      ? `Disarm within ${remaining}s`
      : arming
        ? `Arming away in ${remaining}s`
        : disarmed
          ? 'System disarmed'
          : security.mode === 'away'
            ? 'Armed away'
            : 'Armed home'
  const description = alarm
    ? `${security.triggeredBy} opened while armed. The siren is sounding, all cameras are recording and the monitoring center has been notified.`
    : entry
      ? `${security.triggeredBy} opened. Enter your PIN before the countdown ends or the alarm will sound.`
      : arming
        ? 'Leave now. Doors are locking, lights are turning off and the garage is closing.'
        : `Professionally monitored · last change ${timeAgo(security.lastChangedAt, now)}`
  const secEvents = events.filter((e) => e.scope !== 'ops' && (e.category === 'security' || e.category === 'access'))
  const locks = home.doors.filter((d) => d.kind === 'lock')
  const lockedCount = locks.filter((d) => d.locked).length
  const openWindows = home.windows.filter((w) => w.open).length

  function selectMode(mode: SecurityMode) {
    if (mode === security.mode) return
    if (mode === 'disarmed' || !disarmed) setPinOpen(true)
    else arm(mode)
  }

  return (
    <>
      <PageHeader eyebrow="Security" title="Alarm, locks and cameras" subtitle="Monitored 24/7 by a central station. Cellular backup keeps the system online during outages." />

      <Card padded={false} className={cn('mb-6 overflow-hidden', alarm && 'animate-siren border-critical-line!', entry && HERO_CARD.warning)}>
        <div className={cn('grid grid-cols-1 gap-6 p-5 sm:p-6', urgent && 'lg:grid-cols-[minmax(0,1fr)_auto]', entry && HERO_TINT.warning)}>
          <div className="flex min-w-0 flex-col gap-5">
            <StatusHero tone={tone} pulse={urgent} label={label} title={<span className={cn(alarm && 'text-critical-fg')}>{title}</span>} description={description} />

            {alarm && (
              <dl className="grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                {[
                  { label: 'Triggered by', value: security.triggeredBy ?? 'Sensor' },
                  { label: 'Siren', value: 'Sounding' },
                  { label: 'Cameras', value: 'All recording' },
                  { label: 'Monitoring', value: security.monitoringNotified ? 'Notified' : 'Notifying' },
                ].map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-xs text-fg-3">{f.label}</dt>
                    <dd className="truncate text-[13px] font-medium text-fg">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {(entry || arming) && (
              <div className="max-w-md">
                <div className="mb-2 flex items-center justify-between text-xs text-fg-3">
                  <span>{entry ? 'Time left to disarm' : 'Exit delay'}</span>
                  <span className="font-medium text-fg tabular">{remaining}s</span>
                </div>
                <ProgressBar value={remaining / delayWindow} tone={entry ? 'warning' : 'accent'} />
              </div>
            )}

            {urgent ? (
              <div className="flex max-w-xl items-start gap-2.5 text-[13px] text-fg-2">
                <Headset className="mt-0.5 size-4 shrink-0 text-fg-3" />
                {alarm
                  ? 'A central station operator is calling your phone to verify. If you cannot be reached, police will be dispatched.'
                  : 'The central station will be notified if the alarm is not disarmed in time.'}
              </div>
            ) : (
              <div role="radiogroup" aria-label="Arming mode" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {MODES.map((m) => {
                  const active = security.mode === m.key
                  return (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => selectMode(m.key)}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 text-left shadow-xs transition-colors',
                        active ? 'border-accent-line bg-accent-soft' : 'border-border bg-surface hover:border-border-strong',
                      )}
                    >
                      <m.icon className={cn('mt-0.5 size-4 shrink-0', active ? 'text-accent-fg' : 'text-fg-3')} />
                      <span className="min-w-0">
                        <span className="block text-[13px] leading-5 font-medium text-fg">{m.label}</span>
                        <span className="block text-xs leading-4 text-fg-3">{m.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {urgent && (
            <div className="flex flex-col items-center gap-4 rounded-lg bg-surface px-6 py-5 shadow-sm lg:w-80">
              <div className="text-center">
                <div className="text-sm font-semibold text-fg">Enter PIN to disarm</div>
                <div className="text-xs text-fg-3">Your 4-digit security code</div>
              </div>
              <PinPad compact />
            </div>
          )}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padded={false} className="min-w-0">
          <div className="px-5 pt-5">
            <CardHeader
              title="Doors and locks"
              subtitle={`${lockedCount} of ${locks.length} locks secured`}
              className="mb-2"
              action={
                <Button size="sm" icon={Lock} onClick={lockAll}>
                  Lock all
                </Button>
              }
            />
          </div>
          <div className="divide-y divide-border border-t border-border">
            {home.doors.map((d) =>
              d.kind === 'garage' ? (
                <ListRow
                  key={d.id}
                  className="px-5"
                  icon={Warehouse}
                  iconClassName={d.open || d.moving ? 'text-warning-fg' : undefined}
                  title={d.name}
                  meta={d.moving ? `${d.moving === 'opening' ? 'Opening' : 'Closing'}…` : d.open ? 'Open' : 'Closed'}
                  trailing={
                    <Button size="xs" disabled={!!d.moving} onClick={() => setGarage(d.id, !d.open)}>
                      {d.open ? 'Close' : 'Open'}
                    </Button>
                  }
                />
              ) : (
                <ListRow
                  key={d.id}
                  className="px-5"
                  icon={d.locked ? Lock : LockOpen}
                  iconClassName={d.locked ? undefined : 'text-warning-fg'}
                  title={d.name}
                  meta={
                    <>
                      <span className={d.locked ? undefined : 'text-warning-fg'}>{d.locked ? 'Locked' : 'Unlocked'}</span> · {d.open ? 'Door open' : 'Door closed'} · {d.battery}% battery
                    </>
                  }
                  trailing={
                    <>
                      {d.open && (
                        <Button size="xs" variant="ghost" onClick={() => setDoorOpen(d.id, false)}>
                          Close door
                        </Button>
                      )}
                      <Toggle checked={d.locked} onChange={(v) => setLock(d.id, v)} tone="good" label={`${d.name} lock`} />
                    </>
                  }
                />
              ),
            )}
          </div>
        </Card>

        <Card padded={false} className="min-w-0">
          <div className="px-5 pt-5">
            <CardHeader title="Sensors" subtitle={openWindows ? `${openWindows} open · use Open to simulate a window` : 'All closed · use Open to simulate a window'} className="mb-2" />
          </div>
          <div className="divide-y divide-border border-t border-border">
            {home.windows.map((w) => (
              <ListRow
                key={w.id}
                className="px-5"
                icon={AppWindow}
                iconClassName={w.open ? 'text-warning-fg' : undefined}
                title={w.name}
                meta={`${w.battery}% battery`}
                trailing={
                  <>
                    <Badge tone={w.open ? 'warning' : 'neutral'} dot>
                      {w.open ? 'Open' : 'Closed'}
                    </Badge>
                    <Button size="xs" variant="ghost" className="w-14" onClick={() => setWindowOpen(w.id, !w.open)}>
                      {w.open ? 'Close' : 'Open'}
                    </Button>
                  </>
                }
              />
            ))}
            {home.motion.map((m) => {
              const recent = m.lastMotionAt !== null && now - m.lastMotionAt < 30_000
              return (
                <ListRow
                  key={m.id}
                  className="px-5"
                  icon={PersonStanding}
                  iconClassName={recent ? 'text-info-fg' : undefined}
                  title={m.name}
                  meta={`Last motion ${timeAgo(m.lastMotionAt, now)}`}
                  trailing={
                    <Badge tone={recent ? 'info' : 'neutral'} dot className="sm:mr-16">
                      {recent ? 'Motion' : 'Clear'}
                    </Badge>
                  }
                />
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Cameras" subtitle={`${home.cameras.filter((c) => c.online).length} of ${home.cameras.length} online · 30-day cloud recording`} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {home.cameras.map((c) => (
            <div key={c.id} className="flex min-w-0 flex-col gap-2.5">
              <CameraTile camera={c} alarm={alarm} />
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-fg-2">Continuous recording</span>
                <Toggle size="sm" checked={c.recording} onChange={(v) => setRecording(c.id, v)} label={`${c.name} recording`} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Security log" subtitle="Arming, alarms and door access" />
        <EventFeed events={secEvents} limit={10} emptyText="No security events yet" />
      </Card>

      <Modal open={pinOpen} onClose={() => setPinOpen(false)} title="Enter PIN to disarm" subtitle="Your 4-digit security code" size="sm" icon={ShieldCheck}>
        <div className="py-2">
          <PinPad onSuccess={() => setPinOpen(false)} />
        </div>
      </Modal>
    </>
  )
}
