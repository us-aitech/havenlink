import { useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button, Field, Input, Modal, Segmented, Select, Textarea, Toggle, type SegmentOption } from '@/components/ui'
import { DEMO_PROPERTY_ID } from '@/data/seed'
import { SLA_HOURS, WORK_ORDER_TYPE_LABEL } from '@/lib/workflows'
import { bestTechnicianFor } from '@/sim/engine'
import { useStore } from '@/store/useStore'
import type { Priority, WorkOrderType } from '@/types'
import { DEFAULT_PRIORITY, DEFAULT_SOURCE, WO_TYPE_ORDER } from './WoUtils'

interface FormState {
  type: WorkOrderType
  priority: Priority
  propertyId: string
  unit: string
  title: string
  description: string
  autoAssign: boolean
}

const INITIAL: FormState = {
  type: 'trouble',
  priority: 'P2',
  propertyId: DEMO_PROPERTY_ID,
  unit: '',
  title: '',
  description: '',
  autoAssign: true,
}

const PRIORITY_OPTIONS: SegmentOption<Priority>[] = [
  { value: 'P1', label: 'P1 · Urgent' },
  { value: 'P2', label: 'P2 · High' },
  { value: 'P3', label: 'P3 · Normal' },
]

export function WoCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const properties = useStore((s) => s.ops.properties)
  const onts = useStore((s) => s.ops.onts)
  const createWorkOrder = useStore((s) => s.createWorkOrder)
  const [form, setForm] = useState<FormState>(INITIAL)

  const units = useMemo(() => onts.filter((o) => o.propertyId === form.propertyId).map((o) => o.unit), [onts, form.propertyId])
  const matchedOnt = onts.find((o) => o.propertyId === form.propertyId && o.unit.toLowerCase() === form.unit.trim().toLowerCase())
  const slaHours = SLA_HOURS[form.type][form.priority]
  const source = DEFAULT_SOURCE[form.type]

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const close = () => {
    setForm(INITIAL)
    onClose()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return
    const unit = matchedOnt?.unit ?? (form.unit.trim() || undefined)
    const tech = form.autoAssign ? bestTechnicianFor(useStore.getState(), form.type) : null
    const wo = createWorkOrder({
      type: form.type,
      priority: form.priority,
      title: unit && !title.includes(unit) ? `${title} — ${unit}` : title,
      description: form.description.trim() || title,
      propertyId: form.propertyId,
      unit,
      ontId: matchedOnt?.id,
      splitterId: form.type === 'emergency' ? matchedOnt?.splitterId : undefined,
      source,
      assigneeId: tech?.id ?? null,
    })
    setForm(INITIAL)
    onCreated(wo.id)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New work order"
      subtitle="Dispatch a field or resident support ticket"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" icon={Plus} type="submit" form="new-work-order" disabled={!form.title.trim()}>
            Create work order
          </Button>
        </>
      }
    >
      <form id="new-work-order" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Intermittent drops reported by resident" autoFocus />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(e) => {
                const type = e.target.value as WorkOrderType
                setForm((f) => ({ ...f, type, priority: DEFAULT_PRIORITY[type] }))
              }}
            >
              {WO_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {WORK_ORDER_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Property">
            <Select value={form.propertyId} onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value, unit: '' }))}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg-2">Priority</span>
          <Segmented options={PRIORITY_OPTIONS} value={form.priority} onChange={(p) => update('priority', p)} className="flex w-full *:flex-1 *:justify-center" />
        </div>
        <Field label="Unit" hint={matchedOnt ? `Linked to ONT ${matchedOnt.serial}` : 'Optional. Pick a unit from the list to link its ONT.'}>
          <Input value={form.unit} onChange={(e) => update('unit', e.target.value)} list="new-wo-units" placeholder="1420 Palm Cove Dr" />
          <datalist id="new-wo-units">
            {units.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What the technician needs to know before rolling a truck" />
        </Field>
        <div className="divide-y divide-border rounded-lg border border-border">
          <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]">
            <span className="text-fg-3">SLA target</span>
            <span className="font-medium text-fg tabular">{slaHours} hours</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]">
            <span className="text-fg-3">Source</span>
            <span className="font-medium text-fg">{source}</span>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 px-3.5 py-2.5">
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-fg">Auto-dispatch</span>
              <span className="block text-xs text-fg-3">Assign the best available technician for this work type</span>
            </span>
            <Toggle checked={form.autoAssign} onChange={(v) => update('autoAssign', v)} label="Auto-dispatch" />
          </label>
        </div>
      </form>
    </Modal>
  )
}
