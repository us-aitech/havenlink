import { Layers } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui'
import { currency, num, pct } from '@/lib/format'
import type { RevenueMonth } from '@/types'
import { REVENUE_STREAMS, monthTotal } from './RevStreams'

export function RevModelCard({ month }: { month: RevenueMonth | undefined }) {
  const total = month ? monthTotal(month) : 0

  return (
    <Card padded={false}>
      <div className="p-5 pb-3">
        <CardHeader title="Revenue model" subtitle={`Five stackable options for the ISP partnership · amounts for ${month?.month ?? 'this month'}`} icon={Layers} className="mb-0!" />
      </div>
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_8rem] gap-4 border-y border-border px-5 py-2 text-[11px] font-medium tracking-wider text-fg-3 uppercase sm:grid">
        <span>Model</span>
        <span>Rate / terms</span>
        <span className="text-right">{month?.month ?? 'Month'}</span>
      </div>
      <ul className="divide-y divide-border border-t border-border sm:border-t-0">
        {REVENUE_STREAMS.map((s) => {
          const amount = month ? month[s.key] : 0
          const volume = s.unitPrice ? `≈ ${num(Math.round(amount / s.unitPrice))} ${s.unitLabel}` : s.volumeNote
          return (
            <li key={s.key} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_8rem] sm:items-center sm:gap-4">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                <span className="text-sm font-medium text-fg">{s.model}</span>
              </div>
              <div className="min-w-0 pl-5 sm:pl-0">
                <div className="text-sm text-accent-fg">{s.rate}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-fg-3">{s.terms}</div>
              </div>
              <div className="flex items-baseline justify-between gap-3 pl-5 sm:block sm:pl-0 sm:text-right">
                <div className="text-sm font-semibold text-fg tabular">{currency(amount)}</div>
                <div className="text-[11px] text-fg-3">
                  {volume} · {total ? pct(amount / total) : '—'}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-border-strong px-5 py-3 text-sm">
        <span className="text-fg-3">Total · {month?.month ?? 'this month'}</span>
        <span className="font-semibold text-fg tabular">{currency(total)}</span>
      </div>
    </Card>
  )
}
