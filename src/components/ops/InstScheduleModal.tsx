import { useMemo, useState, type FormEvent } from 'react'
import { CalendarPlus } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { currency } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import { isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'
import type { SmartPackage } from '@/types'
import { PACKAGES, monthlyPrice, packageDef } from './InstPackages'
import { daysFromNowAt } from './MntShared'

const MANUAL = '__manual'
const FORM_ID = 'inst-schedule-form'

function toLocalInput(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function InstScheduleModal({ onClose, initialPackage = 'Secure' }: { onClose: () => void; initialPackage?: SmartPackage }) {
  const now = useNow(30_000)
  const properties = useStore((s) => s.ops.properties)
  const onts = useStore((s) => s.ops.onts)
  const workOrders = useStore((s) => s.ops.workOrders)
  const createWorkOrder = useStore((s) => s.createWorkOrder)

  const [propertyId, setPropertyId] = useState(() => properties[0]?.id ?? '')
  const [ontChoice, setOntChoice] = useState('')
  const [manualUnit, setManualUnit] = useState('')
  const [pkg, setPkg] = useState<SmartPackage>(initialPackage)
  const [when, setWhen] = useState(() => toLocalInput(daysFromNowAt(Date.now(), 1, 10)))
  const [notes, setNotes] = useState('')

  const pendingOnts = useMemo(() => {
    const ids = new Set<string>()
    for (const w of workOrders) if (w.type === 'install' && isOpen(w) && w.ontId) ids.add(w.ontId)
    return ids
  }, [workOrders])

  const candidates = useMemo(
    () => onts.filter((o) => o.propertyId === propertyId && !o.smartHome && !pendingOnts.has(o.id)),
    [onts, propertyId, pendingOnts],
  )

  const effectiveChoice = ontChoice === MANUAL || candidates.some((c) => c.id === ontChoice) ? ontChoice : (candidates[0]?.id ?? MANUAL)
  const ont = effectiveChoice === MANUAL ? undefined : candidates.find((c) => c.id === effectiveChoice)
  const unit = ont ? ont.unit : manualUnit.trim()
  const scheduledFor = new Date(when).getTime()
  const validTime = Number.isFinite(scheduledFor)
  const inPast = validTime && scheduledFor < now
  const canSubmit = Boolean(propertyId && unit && validTime && !inPast)
  const def = packageDef(pkg)
  const property = properties.find((p) => p.id === propertyId)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const contents = def.builds ? `Everything in ${def.builds}, plus ${def.items.join(', ').toLowerCase()}` : def.items.join(', ')
    createWorkOrder({
      type: 'install',
      priority: 'P3',
      title: `${pkg} package install — ${unit}`,
      description: notes.trim() || `${pkg} package: ${contents}. Scheduled by ${property?.manager ?? 'property manager'}${ont ? ` for ${ont.resident}` : ''}. Install, optimize mesh WiFi, onboard resident in the app.`,
      propertyId,
      unit,
      ontId: ont?.id,
      source: 'Property Manager',
      scheduledFor,
      package: pkg,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Schedule smart-home install"
      subtitle="Books the resident visit and opens an install work order."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} disabled={!canSubmit} icon={CalendarPlus}>
            Schedule install
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Property">
          <Select
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value)
              setOntChoice('')
            }}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.city}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Unit"
          hint={candidates.length ? `${candidates.length} fiber-connected units without smart-home and no pending install` : 'Every connected unit already has smart-home or a pending install'}
        >
          <Select value={effectiveChoice} onChange={(e) => setOntChoice(e.target.value)}>
            {candidates.map((o) => (
              <option key={o.id} value={o.id}>
                {o.unit} — {o.resident}
              </option>
            ))}
            <option value={MANUAL}>Enter unit manually…</option>
          </Select>
        </Field>
        {effectiveChoice === MANUAL && (
          <Field label="Unit / address">
            <Input value={manualUnit} onChange={(e) => setManualUnit(e.target.value)} placeholder="e.g. #412 or 1436 Palm Cove Dr" autoFocus />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Package">
            <Select value={pkg} onChange={(e) => setPkg(e.target.value as SmartPackage)}>
              {PACKAGES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {currency(p.install)} + {monthlyPrice(p.monthly)}/mo
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Install date & time" hint={inPast ? <span className="text-critical-fg">Pick a time in the future</span> : 'Arrival window closes 4 hours after start'}>
            <Input type="datetime-local" value={when} min={toLocalInput(now)} onChange={(e) => setWhen(e.target.value)} aria-invalid={inPast || !validTime} />
          </Field>
        </div>
        <Field label="Notes for the technician" hint="Optional — a scope description is generated from the package if left blank.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Access instructions, pets, preferred mount locations…" className="min-h-20!" />
        </Field>
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[13px] font-medium text-fg">{pkg} package</span>
            <span className="text-xs text-fg-2 tabular">
              {currency(def.install)} install · {monthlyPrice(def.monthly)}/mo
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-fg-3">
            {def.builds ? `Everything in ${def.builds}, plus ` : ''}
            {def.builds ? def.items.join(', ').toLowerCase() : def.items.join(', ')}. The install fee bills when the ticket closes.
          </p>
        </div>
      </form>
    </Modal>
  )
}
