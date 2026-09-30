import { useState } from 'react'
import { CalendarClock, CheckCircle2, Headset, MessageSquare, PackagePlus, Phone, ShieldCheck, Wrench } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Segmented, Select, Textarea } from '@/components/ui'
import { DEMO_ONT_ID } from '@/data/seed'
import { cn } from '@/lib/cn'
import { formatDateTime, timeAgo } from '@/lib/format'
import { useNow, usePartner } from '@/lib/hooks'
import { WORKFLOWS, WORK_ORDER_TYPE_LABEL, isOpen, stageIndex } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { WorkOrder } from '@/types'

const TOPICS = ['Internet / WiFi', 'Smart lock', 'Camera or doorbell', 'Water valve or leak sensor', 'Alarm system', 'Thermostat', 'App help', 'Other']
const UPGRADES = ['Add outdoor cameras', 'Smart blinds', 'Extra mesh WiFi node', 'Garage door controller', 'Additional leak sensors', 'Video doorbell upgrade']

function defaultDate(): string {
  const d = new Date(Date.now() + 2 * 86_400_000)
  d.setHours(10, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
}

function RequestCard({ wo }: { wo: WorkOrder }) {
  const technicians = useStore((s) => s.ops.technicians)
  const now = useNow(10000)
  const tech = technicians.find((t) => t.id === wo.assigneeId)
  const stages = WORKFLOWS[wo.type]
  const idx = stageIndex(wo)
  const open = isOpen(wo)
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-fg-3">{wo.number}</span>
            <Badge tone={open ? 'info' : 'good'}>{open ? stages[idx]?.label : 'Resolved'}</Badge>
            {wo.source === 'Auto-detect' && <Badge tone="accent">Detected automatically</Badge>}
          </div>
          <div className="mt-1 text-sm font-medium text-fg">{wo.title.replace(/ — .*$/, '')}</div>
          <div className="text-xs text-fg-3">
            {WORK_ORDER_TYPE_LABEL[wo.type]} · opened {timeAgo(wo.createdAt, now)}
            {wo.scheduledFor ? ` · scheduled ${formatDateTime(wo.scheduledFor)}` : ''}
          </div>
        </div>
        {tech && (
          <div className="flex items-center gap-2">
            <Avatar initials={tech.initials} size="sm" />
            <span className="text-xs text-fg-2">{tech.name}</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1">
        {stages.map((s, i) => (
          <div key={s.key} className="flex flex-1 flex-col gap-1" title={s.label}>
            <div className={cn('h-1.5 rounded-full', i <= idx ? (open ? 'bg-accent' : 'bg-good') : 'bg-surface-2')} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Support() {
  const home = useStore((s) => s.home)
  const workOrders = useStore((s) => s.ops.workOrders)
  const createRequest = useStore((s) => s.createResidentRequest)
  const partner = usePartner()
  const [kind, setKind] = useState<'support' | 'install'>('support')
  const [topic, setTopic] = useState(TOPICS[0])
  const [upgrade, setUpgrade] = useState(UPGRADES[0])
  const [details, setDetails] = useState('')
  const [date, setDate] = useState(defaultDate)

  const mine = workOrders
    .filter((w) => w.ontId === DEMO_ONT_ID || (w.propertyId === home.propertyId && w.unit === home.unit) || (w.incident === 'fiber-cut' && isOpen(w)))
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || b.createdAt - a.createdAt)

  function submit() {
    const title = kind === 'support' ? topic : upgrade
    createRequest({
      kind,
      title,
      description: details || (kind === 'support' ? `Resident reports an issue with: ${topic}.` : `Resident requests: ${upgrade}.`),
      preferredDate: kind === 'install' ? new Date(date).getTime() : undefined,
    })
    setDetails('')
  }

  return (
    <>
      <PageHeader eyebrow="Support" title="One team for fiber, WiFi & smart home" subtitle={`Local technicians partnered with ${partner.name}. Most requests are answered in under 2 hours.`} />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="New request" icon={MessageSquare} />
            <div className="flex flex-col gap-4">
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'support', label: 'Something isn’t working', icon: Wrench },
                  { value: 'install', label: 'Add or upgrade devices', icon: PackagePlus },
                ]}
              />
              {kind === 'support' ? (
                <Field label="What needs attention?">
                  <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {TOPICS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="What would you like to add?">
                    <Select value={upgrade} onChange={(e) => setUpgrade(e.target.value)}>
                      {UPGRADES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Preferred date & time">
                    <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                </div>
              )}
              <Field label="Details (optional)">
                <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={kind === 'support' ? 'e.g. The front door lock beeps but won’t unlock from the app.' : 'e.g. Cameras covering the side yard and pool gate.'} />
              </Field>
              <div className="flex justify-end">
                <Button variant="primary" icon={kind === 'support' ? Headset : CalendarClock} onClick={submit}>
                  {kind === 'support' ? 'Send to my service team' : 'Request installation'}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="My requests" subtitle="Live status from the field team" icon={Wrench} />
            {mine.length ? (
              <div className="flex flex-col gap-3">
                {mine.map((w) => (
                  <RequestCard key={w.id} wo={w} />
                ))}
              </div>
            ) : (
              <EmptyState icon={CheckCircle2} title="No open requests" message="Anything you send — or anything we detect automatically — shows up here." />
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Your service team" icon={Headset} />
            <div className="flex items-center gap-3">
              <Avatar initials="HL" size="lg" />
              <div>
                <div className="text-sm font-semibold text-fg">HavenLink Field Services</div>
                <div className="text-xs text-fg-3">Harbour Heights & Charlotte County</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-fg-2">
                <Phone className="size-4 text-fg-3" /> (941) 555-0142 · 24/7
              </div>
              <div className="flex items-center gap-2 text-fg-2">
                <ShieldCheck className="size-4 text-fg-3" /> Certified by {partner.short} for fiber repairs
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Your plan" subtitle="Complete smart-home package" icon={PackagePlus} />
            <ul className="flex flex-col gap-2 text-sm">
              {['HavenLink hub with LTE backup', 'Alarm with 24/7 monitoring', '3 smart locks + garage controller', '4 cameras with 30-day recording', 'Water shut-off valve + flow sensor', '5 leak sensors', 'Smart thermostat', 'Mesh WiFi (3 nodes)', `${partner.planName} fiber by ${partner.short}`].map((f) => (
                <li key={f} className="flex items-start gap-2 text-fg-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good-fg" />
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
