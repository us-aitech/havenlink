import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { LayoutGrid, List } from 'lucide-react'
import { PropCard, type PropertyStats } from '@/components/ops/PropCard'
import { PropDrawer } from '@/components/ops/PropDrawer'
import { PropTable } from '@/components/ops/PropTable'
import { PageHeader, Segmented } from '@/components/ui'
import { currency, num, pct } from '@/lib/format'
import { isOpen } from '@/lib/workflows'
import { useStore } from '@/store/useStore'

type View = 'cards' | 'table'

const EMPTY_STATS: PropertyStats = { onts: 0, online: 0, openWorkOrders: 0, p1: 0 }

export default function OpsProperties() {
  const properties = useStore((s) => s.ops.properties)
  const onts = useStore((s) => s.ops.onts)
  const workOrders = useStore((s) => s.ops.workOrders)
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('cards')
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
  const smartUnits = properties.reduce((sum, p) => sum + p.smartHomeUnits, 0)
  const contractMrr = properties.reduce((sum, p) => sum + p.monthlyContract, 0)
  const bulkCount = properties.filter((p) => p.contract === 'Bulk').length

  const summary = [
    { label: 'Properties', value: num(properties.length) },
    { label: 'Units', value: num(totalUnits) },
    { label: 'ONTs', value: num(onts.length) },
    { label: 'Smart-home adoption', value: pct(totalUnits ? smartUnits / totalUnits : 0) },
    { label: 'Contract MRR', value: currency(contractMrr) },
    { label: 'Bulk contracts', value: `${bulkCount} of ${properties.length}` },
  ]

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
      <PageHeader title="Properties" subtitle="MDUs, single-family communities and commercial sites served on the partner’s fiber." />
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          {summary.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <dt className="text-fg-3">{s.label}</dt>
              <dd className="font-semibold text-fg tabular">{s.value}</dd>
            </div>
          ))}
        </dl>
        <Segmented<View>
          size="sm"
          value={view}
          onChange={setView}
          className="self-start md:self-auto"
          options={[
            { value: 'cards', label: 'Cards', icon: LayoutGrid },
            { value: 'table', label: 'Table', icon: List },
          ]}
        />
      </div>
      {view === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <PropCard key={p.id} property={p} stats={stats.get(p.id) ?? EMPTY_STATS} onOpen={() => setSelected(p.id)} />
          ))}
        </div>
      ) : (
        <PropTable properties={properties} stats={stats} onOpen={(id) => setSelected(id)} />
      )}
      <PropDrawer property={selected} onClose={() => setSelected(null)} />
    </>
  )
}
