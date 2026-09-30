import { useState } from 'react'
import { CalendarClock, Check, CheckCircle2, Headset, PackagePlus, Wrench } from 'lucide-react'
import { StepBar } from '@/components/home/Stepper'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, KeyValue, PageHeader, Segmented, Select, Textarea } from '@/components/ui'
import { DEMO_ONT_ID } from '@/data/seed'
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

function RequestRow({ wo }: { wo: WorkOrder }) {
  const technicians = useStore((s) => s.ops.technicians)
  const now = useNow(10000)
  const tech = technicians.find((t) => t.id === wo.assigneeId)
  const stages = WORKFLOWS[wo.type]
  const idx = stageIndex(wo)
  const open = isOpen(wo)
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] leading-5 font-medium text-fg">{wo.title.replace(/ — .*$/, '')}</span>
            {wo.source === 'Auto-detect' && <Badge tone="accent">Detected automatically</Badge>}
          </div>
          <div className="mt-0.5 text-xs text-fg-3">
            <span className="font-mono">{wo.number}</span> · {WORK_ORDER_TYPE_LABEL[wo.type]} · opened {timeAgo(wo.createdAt, now)}
            {wo.scheduledFor ? ` · scheduled ${formatDateTime(wo.scheduledFor)}` : ''}
          </div>
        </div>
        <Badge tone={open ? 'info' : 'good'} dot>
          {open ? 'In progress' : 'Resolved'}
        </Badge>
      </div>
      <StepBar className="mt-3.5" total={stages.length} current={idx} complete={!open} />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-fg-3">
        <span className="min-w-0 truncate">{open ? `Step ${idx + 1} of ${stages.length} · ${stages[idx]?.label ?? wo.stage}` : `All ${stages.length} steps complete`}</span>
        {tech && (
          <span className="flex shrink-0 items-center gap-1.5 text-fg-2">
            <Avatar initials={tech.initials} size="sm" />
            {tech.name}
          </span>
        )}
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
  const openCount = mine.filter(isOpen).length

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
      <PageHeader eyebrow="Support" title="One team for fiber, WiFi and smart home" subtitle={`Local technicians partnered with ${partner.name}. Most requests are answered in under 2 hours.`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="overflow-hidden">
            <CardHeader title="New request" subtitle="Goes straight to your field-services team" />
            <div className="flex flex-col gap-4">
              <Segmented
                value={kind}
                onChange={setKind}
                className="self-start"
                options={[
                  { value: 'support', label: 'Report an issue', icon: Wrench },
                  { value: 'install', label: 'Add or upgrade', icon: PackagePlus },
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="What would you like to add?">
                    <Select value={upgrade} onChange={(e) => setUpgrade(e.target.value)}>
                      {UPGRADES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Preferred date and time">
                    <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                </div>
              )}
              <Field label="Details" hint="Optional. Anything that helps the technician arrive prepared.">
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={kind === 'support' ? 'The front door lock beeps but won’t unlock from the app.' : 'Cameras covering the side yard and pool gate.'}
                />
              </Field>
            </div>
            <div className="-mx-5 mt-5 -mb-5 flex flex-col-reverse gap-3 border-t border-border bg-surface-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-fg-3">{kind === 'support' ? 'A technician usually replies within 2 hours.' : 'We will confirm the visit by text.'}</span>
              <Button variant="primary" icon={kind === 'support' ? Headset : CalendarClock} onClick={submit}>
                {kind === 'support' ? 'Send to my service team' : 'Request installation'}
              </Button>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title="My requests" subtitle={openCount ? `${openCount} in progress · live status from the field team` : 'Live status from the field team'} className="mb-2" />
            </div>
            {mine.length ? (
              <div className="divide-y divide-border border-t border-border">
                {mine.map((w) => (
                  <RequestRow key={w.id} wo={w} />
                ))}
              </div>
            ) : (
              <div className="border-t border-border">
                <EmptyState icon={CheckCircle2} title="No requests yet" message="Anything you send, or anything we detect automatically, shows up here." />
              </div>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="Your service team" />
            <div className="flex items-center gap-3">
              <Avatar initials="HL" size="lg" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-fg">HavenLink Field Services</div>
                <div className="text-xs text-fg-3">Harbour Heights and Charlotte County</div>
              </div>
            </div>
            <div className="mt-4 divide-y divide-border border-t border-border">
              <KeyValue label="Phone" value="(941) 555-0142" />
              <KeyValue label="Hours" value="24/7, including holidays" />
              <KeyValue label="Fiber repairs" value={`Certified by ${partner.short}`} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Your plan" subtitle="Complete smart-home package" />
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {[
                'HavenLink hub with LTE backup',
                'Alarm with 24/7 monitoring',
                '3 smart locks and garage controller',
                '4 cameras with 30-day recording',
                'Water shut-off valve and flow sensor',
                '5 leak sensors',
                'Smart thermostat',
                'Mesh WiFi (3 nodes)',
                `${partner.planName} fiber by ${partner.short}`,
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-fg-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-fg-3" />
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
