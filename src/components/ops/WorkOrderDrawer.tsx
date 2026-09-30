import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Camera, Check, CircleCheck, Droplets, ImagePlus, MessageSquare, RadioTower, Send, TriangleAlert, Unplug, Upload, type LucideIcon } from 'lucide-react'
import { Avatar, Badge, Button, Drawer, Input, KeyValue, Modal, ProgressBar, SectionTitle, Select, TONE_BORDER, TONE_TEXT, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency, dbm, formatDateTime, formatDuration, formatWeekday, formatTime, timeAgo } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import {
  ONT_STATUS_LABEL,
  SLA_HOURS,
  SLA_TONE,
  TECH_STATUS_LABEL,
  WORKFLOWS,
  isOpen,
  nextStage,
  slaState,
  stageIndex,
  stageLabel,
} from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { WaterStatus, WorkOrder, WorkOrderPhoto } from '@/types'
import { OntStatusBadge, RxGauge } from './NetParts'
import { ONT_STATUS_ICON, ONT_TILE_CLASS, shortUnit } from './NetUtils'
import { AssigneeChip, PriorityBadge, SlaIcon, TypeBadge } from './WoParts'
import { SLA_LABEL, WO_SOURCE_ICON, lastEntryFor, locationLabel, makeSamplePhoto, samplePhotoCaption } from './WoUtils'

const TONE_BG: Record<Tone, string> = {
  neutral: 'bg-surface-2',
  info: 'bg-info-soft',
  accent: 'bg-accent-soft',
  good: 'bg-good-soft',
  warning: 'bg-warning-soft',
  serious: 'bg-serious-soft',
  critical: 'bg-critical-soft',
}

const WATER_TONE: Record<WaterStatus, Tone> = { normal: 'good', warning: 'warning', leak: 'critical' }
const WATER_LABEL: Record<WaterStatus, string> = { normal: 'Normal', warning: 'Unusual flow', leak: 'Leak detected' }

function clock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h >= 48) return formatDuration(ms)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function SlaPanel({ wo, now }: { wo: WorkOrder; now: number }) {
  const state = slaState(wo, now)
  const tone = SLA_TONE[state]
  const scheduledWindow = wo.scheduledFor !== undefined && (wo.type === 'install' || wo.type === 'maintenance')
  const target = scheduledWindow ? 'Scheduled window + 4h' : `${SLA_HOURS[wo.type][wo.priority]}h ${wo.priority} target`
  if (wo.closedAt) {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border p-4', TONE_BORDER[tone], TONE_BG[tone])}>
        <SlaIcon state={state} className={cn('size-5 shrink-0', TONE_TEXT[tone])} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-fg">
            Closed {formatDateTime(wo.closedAt)} · {state === 'met' ? 'SLA met' : 'SLA missed'}
          </div>
          <div className="mt-0.5 text-xs text-fg-3">
            Resolved in {formatDuration(wo.closedAt - wo.createdAt)} · {target} · due {formatDateTime(wo.dueAt)}
          </div>
        </div>
      </div>
    )
  }
  const remaining = wo.dueAt - now
  const total = Math.max(1, wo.dueAt - wo.createdAt)
  const elapsed = (now - wo.createdAt) / total
  return (
    <div className={cn('rounded-xl border p-4', TONE_BORDER[tone], TONE_BG[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wider text-fg-3 uppercase">Service level</div>
          <div className={cn('mt-1 font-mono text-2xl font-semibold tabular', TONE_TEXT[tone])}>
            {remaining < 0 && '−'}
            {clock(remaining)}
          </div>
          <div className="mt-0.5 text-xs text-fg-3">
            {remaining < 0 ? 'past due' : 'remaining'} · due {formatDateTime(wo.dueAt)}
          </div>
        </div>
        <Badge tone={tone} className="shrink-0">
          <SlaIcon state={state} className="size-3" />
          {SLA_LABEL[state]}
        </Badge>
      </div>
      <ProgressBar value={elapsed} tone={tone} className="mt-3" />
      <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-fg-3">
        <span>Opened {timeAgo(wo.createdAt, now)}</span>
        <span className="text-right">{target}</span>
      </div>
    </div>
  )
}

function CalloutShell({ tone, icon: Icon, title, children }: { tone: Tone; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border p-4', TONE_BORDER[tone], TONE_BG[tone])}>
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[tone])} />
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-semibold', TONE_TEXT[tone])}>{title}</div>
          <div className="mt-1 text-xs text-fg-2">{children}</div>
        </div>
      </div>
    </div>
  )
}

function IncidentCallout({ wo }: { wo: WorkOrder }) {
  const onts = useStore((s) => s.ops.onts)
  const splitters = useStore((s) => s.ops.splitters)
  const water = useStore((s) => s.home.water)
  const homeNetwork = useStore((s) => s.home.network)

  if (wo.incident === 'fiber-cut') {
    const splitter = splitters.find((s) => s.id === wo.splitterId)
    const affected = onts.filter((o) => o.splitterId === wo.splitterId)
    const down = affected.filter((o) => o.status === 'los').length
    const restored = down === 0
    return (
      <CalloutShell
        tone={restored ? 'good' : 'critical'}
        icon={restored ? CircleCheck : Unplug}
        title={restored ? `Service restored · ${affected.length} homes back online` : `${down} of ${affected.length} homes without fiber service`}
      >
        <p>
          {splitter ? `${splitter.name} (${splitter.ratio}) · ${splitter.cabinet}. ` : ''}
          {restored
            ? 'All ONTs on this splitter have light again and residents are back on fiber.'
            : 'Closing this work order restores service to affected homes (LTE backup deactivates on the resident side).'}
        </p>
        {affected.length > 0 && (
          <div className="mt-3 grid grid-cols-8 gap-1">
            {affected.map((o) => {
              const Icon = ONT_STATUS_ICON[o.status]
              return (
                <div
                  key={o.id}
                  title={`${o.unit} · ${ONT_STATUS_LABEL[o.status]}`}
                  className={cn('flex h-8 flex-col items-center justify-center gap-0.5 rounded font-mono text-[9px] ring-1 ring-inset', ONT_TILE_CLASS[o.status], o.isDemoHome && 'ring-2 ring-accent')}
                >
                  <span className="max-w-full truncate px-0.5">{shortUnit(o.unit)}</span>
                  <Icon className="size-2.5" />
                </div>
              )
            })}
          </div>
        )}
        {!restored && homeNetwork.backupActive && (
          <p className="mt-2.5 flex items-center gap-1.5 text-warning-fg">
            <RadioTower className="size-3.5" />
            Demo home hub is on LTE backup — alarm, cameras and leak protection remain online.
          </p>
        )}
      </CalloutShell>
    )
  }

  if (wo.incident === 'signal-degradation') {
    const ont = onts.find((o) => o.id === wo.ontId)
    const rx = ont?.isDemoHome ? homeNetwork.rxPowerDbm : (ont?.rxPowerDbm ?? null)
    const status = ont?.isDemoHome ? homeNetwork.status : ont?.status
    const ok = status === 'online'
    return (
      <CalloutShell tone={ok ? 'good' : 'warning'} icon={ok ? CircleCheck : TriangleAlert} title={ok ? `Light level normal · ${dbm(rx)}` : `Low light on ONT · currently ${dbm(rx)}`}>
        <p className="mb-3">{ok ? 'Receive power is back above the −27 dBm threshold.' : 'Receive power is below the −27 dBm GPON threshold. Clean, inspect and re-terminate the connector, then re-test.'}</p>
        <RxGauge value={rx} />
      </CalloutShell>
    )
  }

  if (wo.incident === 'leak-followup') {
    const tone = WATER_TONE[water.status]
    return (
      <CalloutShell tone={tone} icon={Droplets} title={`Live water status · ${WATER_LABEL[water.status]}`}>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <div className="text-[10px] text-fg-3 uppercase">Valve</div>
            <div className="text-sm font-semibold text-fg capitalize">{water.valve}</div>
          </div>
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <div className="text-[10px] text-fg-3 uppercase">Flow</div>
            <div className="text-sm font-semibold text-fg tabular">{water.flowGpm.toFixed(2)} GPM</div>
          </div>
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <div className="text-[10px] text-fg-3 uppercase">Pressure</div>
            <div className="text-sm font-semibold text-fg tabular">{water.pressurePsi.toFixed(0)} psi</div>
          </div>
        </div>
        {water.leakCause && <p className="mt-2.5 text-fg-3">{water.leakCause}</p>}
        {water.leakDetectedAt && <p className="mt-1 text-fg-3">Detected at {formatTime(water.leakDetectedAt)}</p>}
      </CalloutShell>
    )
  }

  return null
}

function WorkflowStepper({ wo, now }: { wo: WorkOrder; now: number }) {
  const stages = WORKFLOWS[wo.type]
  const current = stageIndex(wo)
  const closed = !isOpen(wo)
  return (
    <ol className="flex flex-col">
      {stages.map((stage, i) => {
        const entry = lastEntryFor(wo, stage.key)
        const done = i < current || (closed && i === current)
        const active = i === current && !closed
        return (
          <li key={stage.key} className={cn('relative flex gap-3', i < stages.length - 1 && 'pb-4')}>
            {i < stages.length - 1 && <span className={cn('absolute top-8 bottom-1 left-[13px] w-0.5 rounded', i < current ? 'bg-good-soft' : 'bg-border')} />}
            <span
              className={cn(
                'relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset',
                done && 'bg-good-soft text-good-fg ring-good-line',
                active && 'bg-accent-soft text-accent-fg ring-2 ring-accent-line',
                !done && !active && 'bg-surface-2 text-fg-4 ring-border',
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
              {active && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent-soft" />}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('text-sm', done ? 'text-fg' : active ? 'font-semibold text-accent-fg' : 'text-fg-3')}>{stage.label}</span>
                {active && <Badge tone="accent">In progress</Badge>}
              </div>
              {entry && (done || active) && (
                <div className="mt-0.5 text-xs text-fg-3">
                  {formatDateTime(entry.at)} · {entry.by}
                  {active && ` · ${timeAgo(entry.at, now)}`}
                </div>
              )}
              {!entry && done && <div className="mt-0.5 text-xs text-fg-4">Completed</div>}
              {entry?.note && <div className="mt-1 text-xs text-fg-3">“{entry.note}”</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function PhotoSection({ wo, location }: { wo: WorkOrder; location: string }) {
  const addPhoto = useStore((s) => s.addWorkOrderPhoto)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<WorkOrderPhoto | null>(null)
  const needsPhoto = wo.stage === 'documenting' && wo.photos.length === 0

  const addSample = () => {
    const caption = samplePhotoCaption(wo)
    addPhoto(wo.id, makeSamplePhoto(wo, caption, location, Date.now()), caption)
  }

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const file of files) {
      addPhoto(wo.id, URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, '') || 'Field photo')
    }
    e.target.value = ''
  }

  return (
    <section>
      <SectionTitle
        action={
          <div className="flex gap-1.5">
            <Button size="xs" variant="secondary" icon={ImagePlus} onClick={addSample}>
              Add sample photo
            </Button>
            <Button size="xs" variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>
              Upload
            </Button>
          </div>
        }
      >
        Photo documentation · {wo.photos.length}
      </SectionTitle>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      {needsPhoto && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-xs text-warning-fg">
          <TriangleAlert className="size-3.5 shrink-0" />
          Add at least one photo before closing
        </div>
      )}
      {wo.photos.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {wo.photos.map((p) => (
            <button key={p.id} type="button" onClick={() => setPreview(p)} className="group overflow-hidden rounded-lg border border-border bg-surface-2 text-left transition hover:border-border-strong">
              <span className="block aspect-[4/3] overflow-hidden">
                <img src={p.url} alt={p.caption} className="size-full object-cover transition group-hover:scale-[1.03]" />
              </span>
              <span className="block border-t border-border px-2 py-1.5">
                <span className="block truncate text-[11px] text-fg">{p.caption}</span>
                <span className="block text-[10px] text-fg-3">{formatTime(p.at)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <Camera className="size-5 text-fg-4" />
          <div className="text-xs text-fg-3">No photos yet</div>
          <div className="max-w-xs text-[11px] text-fg-4">Splice trays, light-meter readings, cabinets and finished installs are documented here for the ISP.</div>
        </div>
      )}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.caption ?? ''} subtitle={preview ? `${wo.number} · ${formatDateTime(preview.at)}` : undefined} size="lg" icon={Camera}>
        {preview && <img src={preview.url} alt={preview.caption} className="w-full rounded-xl border border-border" />}
      </Modal>
    </section>
  )
}

function NotesSection({ wo }: { wo: WorkOrder }) {
  const addNote = useStore((s) => s.addWorkOrderNote)
  const [text, setText] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    addNote(wo.id, value, 'Dispatcher')
    setText('')
  }
  return (
    <section>
      <SectionTitle>Notes · {wo.notes.length}</SectionTitle>
      {wo.notes.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {wo.notes.map((n) => (
            <li key={n.id} className="flex gap-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
              <Avatar initials={initialsOf(n.by)} size="sm" tone="neutral" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-fg">{n.by}</span>
                  <span className="shrink-0 text-[11px] text-fg-3">{formatDateTime(n.at)}</span>
                </div>
                <p className="mt-0.5 text-sm break-words text-fg-2">{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a dispatcher note…" className="h-9" aria-label="Note" />
        <Button type="submit" size="sm" variant="secondary" icon={Send} disabled={!text.trim()} className="h-9">
          Add
        </Button>
      </form>
    </section>
  )
}

export function WorkOrderDrawer({ workOrderId, onClose }: { workOrderId: string | null; onClose: () => void }) {
  const now = useNow()
  const wo = useStore((s) => (workOrderId ? s.ops.workOrders.find((w) => w.id === workOrderId) : undefined))
  const technicians = useStore((s) => s.ops.technicians)
  const properties = useStore((s) => s.ops.properties)
  const onts = useStore((s) => s.ops.onts)
  const splitters = useStore((s) => s.ops.splitters)
  const assets = useStore((s) => s.ops.assets)
  const advance = useStore((s) => s.advanceWorkOrder)
  const assign = useStore((s) => s.assignWorkOrder)

  if (!wo) return null

  const property = properties.find((p) => p.id === wo.propertyId)
  const ont = onts.find((o) => o.id === wo.ontId)
  const splitter = splitters.find((s) => s.id === (wo.splitterId ?? ont?.splitterId))
  const asset = assets.find((a) => a.id === wo.assetId)
  const tech = technicians.find((t) => t.id === wo.assigneeId)
  const next = nextStage(wo)
  const open = isOpen(wo)
  const SourceIcon = WO_SOURCE_ICON[wo.source]
  const location = locationLabel(property?.name, wo.unit)

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={
        <span className="block">
          <span className="font-mono text-accent-fg">{wo.number}</span> · {wo.title}
        </span>
      }
      subtitle={location}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={wo.assigneeId ?? ''}
            onChange={(e) => e.target.value && assign(wo.id, e.target.value)}
            disabled={!open}
            aria-label="Assign technician"
            className="h-9 sm:max-w-[250px]"
          >
            <option value="" disabled>
              Assign technician…
            </option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {TECH_STATUS_LABEL[t.status]}
              </option>
            ))}
          </Select>
          <Button variant="primary" size="md" disabled={!next} onClick={() => advance(wo.id)} className="h-9 sm:ml-auto">
            {next ? `Advance → ${next.label}` : 'Work order closed'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={wo.priority} />
          <TypeBadge type={wo.type} />
          <Badge tone="neutral" icon={SourceIcon}>
            {wo.source}
          </Badge>
          <Badge tone={open ? 'accent' : 'good'} dot>
            {stageLabel(wo)}
          </Badge>
        </div>

        <SlaPanel wo={wo} now={now} />

        {wo.incident && <IncidentCallout wo={wo} />}

        {wo.description && <p className="text-sm leading-relaxed text-fg-2">{wo.description}</p>}

        <section>
          <SectionTitle>Details</SectionTitle>
          <div className="divide-y divide-border rounded-xl border border-border px-4">
            <KeyValue label="Property" value={property ? `${property.name} · ${property.city}` : wo.propertyId} />
            <KeyValue label="Unit" value={wo.unit ?? '—'} />
            {ont && (
              <KeyValue
                label="ONT"
                value={
                  <Link to={`/ops/network?property=${ont.propertyId}&ont=${ont.id}`} className="inline-flex flex-wrap items-center justify-end gap-2 hover:text-accent-fg">
                    <span className="font-mono text-xs">{ont.serial}</span>
                    <OntStatusBadge status={ont.status} />
                  </Link>
                }
              />
            )}
            {splitter && <KeyValue label="Splitter" value={`${splitter.name} · ${splitter.ratio} · ${splitter.cabinet}`} />}
            {asset && <KeyValue label="Asset" value={`${asset.name} · ${asset.kind} · ${asset.condition}`} />}
            {wo.scheduledFor && <KeyValue label="Scheduled for" value={`${formatWeekday(wo.scheduledFor)} · ${formatTime(wo.scheduledFor)}`} />}
            {wo.package && <KeyValue label="Package" value={`HavenLink ${wo.package}`} />}
            <KeyValue label="Created" value={`${formatDateTime(wo.createdAt)} · ${timeAgo(wo.createdAt, now)}`} />
            <KeyValue label="Assignee" value={<AssigneeChip tech={tech} />} />
            <KeyValue label="Billable" value={wo.billable ? currency(wo.billable) : 'Included in retainer'} />
          </div>
        </section>

        <section>
          <SectionTitle>Workflow</SectionTitle>
          <div className="rounded-xl border border-border bg-black/10 p-4">
            <WorkflowStepper wo={wo} now={now} />
          </div>
        </section>

        <PhotoSection wo={wo} location={location} />

        <NotesSection wo={wo} />

        {!open && (
          <div className="flex items-center gap-2 text-xs text-fg-3">
            <MessageSquare className="size-3.5" />
            Closed work orders stay available for ISP audits and billing.
          </div>
        )}
      </div>
    </Drawer>
  )
}
