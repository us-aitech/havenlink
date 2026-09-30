import { ChevronRight } from 'lucide-react'
import { Badge, Card, ProgressBar } from '@/components/ui'
import { currency, num, pct } from '@/lib/format'
import type { Property } from '@/types'
import { DEMO_PROPERTY, OnlineValue, activateOnKey, type PropertyStats } from './PropCard'

const EMPTY: PropertyStats = { onts: 0, online: 0, openWorkOrders: 0, p1: 0 }

export function PropTable({ properties, stats, onOpen }: { properties: Property[]; stats: Map<string, PropertyStats>; onOpen: (id: string) => void }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[920px] text-[13px] whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-fg-3">
              <th className="px-5 py-2 font-medium">Property</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Units</th>
              <th className="px-3 py-2 font-medium">ONTs online</th>
              <th className="px-3 py-2 text-right font-medium">Open WOs</th>
              <th className="px-3 py-2 font-medium">Smart-home adoption</th>
              <th className="px-3 py-2 font-medium">Contract</th>
              <th className="px-3 py-2 text-right font-medium">Value / mo</th>
              <th className="w-10 py-2 pr-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {properties.map((p) => {
              const s = stats.get(p.id) ?? EMPTY
              const adoption = p.units ? p.smartHomeUnits / p.units : 0
              const open = () => onOpen(p.id)
              return (
                <tr key={p.id} tabIndex={0} onClick={open} onKeyDown={activateOnKey(open)} aria-label={`Open ${p.name}`} className="group cursor-pointer transition-colors hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">{p.name}</span>
                      {p.id === DEMO_PROPERTY && <Badge tone="accent">Demo home</Badge>}
                    </div>
                    <div className="text-xs text-fg-3">{p.city}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge>{p.type}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right text-fg-2 tabular">{num(p.units)}</td>
                  <td className="px-3 py-3 text-fg-2">
                    <OnlineValue stats={s} />
                  </td>
                  <td className="px-3 py-3 text-right text-fg-2 tabular">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {s.p1 > 0 && <Badge tone="critical">P1</Badge>}
                      {s.openWorkOrders}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={adoption} className="w-24" />
                      <span className="w-9 text-fg-2 tabular">{pct(adoption)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-fg-2">
                    {p.contract} <span className="text-fg-4">·</span> {p.package}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-fg tabular">{currency(p.monthlyContract)}</td>
                  <td className="py-3 pr-3 text-right">
                    <ChevronRight className="inline size-4 text-fg-4 transition-colors group-hover:text-fg-3" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
