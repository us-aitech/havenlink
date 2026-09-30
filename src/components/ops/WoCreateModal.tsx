import { useMemo, useState, type FormEvent } from 'react'
import { ClipboardPlus, Clock, Plus } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea, Toggle } from '@/components/ui'
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

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3']

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
      subtitle="Dispatch a field or support ticket"
      icon={ClipboardPlus}
      tone="accent"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" icon={Plus} type="submit" form="new-work-order" disabled={!form.title.trim()}>
            Create work order
          </Button>
        </>
      }
    >
      <form id="new-work-order" onSubmit={submit} className="flex flex-col gap-4">
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
          <Field label="Priority">
            <div className="grid h-10 grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border ring-inset">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update('priority', p)}
                  className={
                    form.priority === p
                      ? p === 'P1'
                        ? 'rounded-lg bg-critical-soft font-mono text-xs font-semibold text-critical-fg ring-1 ring-critical-line ring-inset'
                        : p === 'P2'
                          ? 'rounded-lg bg-warning-soft font-mono text-xs font-semibold text-warning-fg ring-1 ring-warning-line ring-inset'
                          : 'rounded-lg bg-surface-3 font-mono text-xs font-semibold text-fg'
                      : 'rounded-lg font-mono text-xs text-fg-3 hover:text-fg'
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property">
            <Select value={form.propertyId} onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value, unit: '' }))}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unit" hint={matchedOnt ? `Linked to ONT ${matchedOnt.serial}` : 'Optional · pick from the list to link the ONT'}>
            <Input value={form.unit} onChange={(e) => update('unit', e.target.value)} list="new-wo-units" placeholder="e.g. 1420 Palm Cove Dr" />
            <datalist id="new-wo-units">
              {units.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label="Title">
          <Input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Intermittent drops reported by resident" autoFocus />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What the technician needs to know before rolling a truck" />
        </Field>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-fg-3">
            <Clock className="size-3.5 text-fg-3" />
            <span>
              SLA <b className="font-semibold text-fg">{slaHours}h</b> · source <b className="font-semibold text-fg">{source}</b>
            </span>
          </div>
          <label className="flex items-center gap-2.5 text-xs text-fg-2">
            <Toggle checked={form.autoAssign} onChange={(v) => update('autoAssign', v)} size="sm" label="Auto-dispatch" />
            Auto-dispatch best available tech
          </label>
        </div>
      </form>
    </Modal>
  )
}
