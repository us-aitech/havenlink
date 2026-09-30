import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Building2, CircleDollarSign, Home, Router, type LucideIcon } from 'lucide-react'
import { PropCard, type PropertyStats } from '@/components/ops/PropCard'
import { PropDrawer } from '@/components/ops/PropDrawer'
import { PageHeader } from '@/components/ui'
import { currency, num } from '@/lib/format'
import { isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'

function SummaryChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg-3">
      <Icon className="size-3.5 text-accent-fg" />
      <span className="font-semibold text-fg tabular">{value}</span>
      {label}
    </span>
  )
}

export default function OpsProperties() {
  const properties = useStore((s) => s.ops.properties)
  const onts = useStore((s) => s.ops.onts)
  const workOrders = useStore((s) => s.ops.workOrders)
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id')
  const selected = selectedId ? properties.find((p) => p.id === selectedId) : undefined

  const stats = useMemo(() => {
    const map = new Map<string, PropertyStats>()
    for (const p of properties) map.set(p.id, { onts: 0, online: 0, openWorkOrders: 0, p1: 0 })
    for (const o of onts) {
      const s = map.get(o.propertyId)
      if (!s) continue
      s.onts += 1
      if (o.status === 'online') s.online += 1
    }
    for (const w of workOrders) {
      if (!isOpen(w)) continue
      const s = map.get(w.propertyId)
      if (!s) continue
      s.openWorkOrders += 1
      if (w.priority === 'P1') s.p1 += 1
    }
    return map
  }, [properties, onts, workOrders])

  const totalUnits = properties.reduce((sum, p) => sum + p.units, 0)
  const bulkMrr = properties.filter((p) => p.contract === 'Bulk').reduce((sum, p) => sum + p.monthlyContract, 0)

  function setSelected(id: string | null) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set('id', id)
        else next.delete('id')
        return next
      },
      { replace: true },
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        subtitle="MDUs, single-family communities and commercial sites served on the partner’s fiber."
        actions={
          <>
            <SummaryChip icon={Building2} label="properties" value={num(properties.length)} />
            <SummaryChip icon={Home} label="units" value={num(totalUnits)} />
            <SummaryChip icon={Router} label="ONTs" value={num(onts.length)} />
            <SummaryChip icon={CircleDollarSign} label="bulk MRR" value={currency(bulkMrr)} />
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => (
          <PropCard key={p.id} property={p} stats={stats.get(p.id) ?? { onts: 0, online: 0, openWorkOrders: 0, p1: 0 }} onOpen={() => setSelected(p.id)} />
        ))}
      </div>
      <PropDrawer property={selected} onClose={() => setSelected(null)} />
    </>
  )
}
