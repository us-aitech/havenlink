import { Card, CardHeader } from '@/components/ui'
import { currency, num, pct } from '@/lib/format'
import type { RevenueMonth } from '@/types'
import { REVENUE_STREAMS, monthTotal } from './RevStreams'

export function RevModelCard({ month }: { month: RevenueMonth | undefined }) {
  const total = month ? monthTotal(month) : 0
  const monthLabel = month?.month ?? 'This month'

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader title="Revenue model" subtitle={`Five stackable options for the ISP partnership, with ${monthLabel} actuals`} />
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3">
              <th className="px-5 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 text-right font-medium">Share</th>
              <th className="px-5 py-2 text-right font-medium">{monthLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {REVENUE_STREAMS.map((s) => {
              const amount = month ? month[s.key] : 0
              const volume = s.unitPrice ? `≈ ${num(Math.round(amount / s.unitPrice))} ${s.unitLabel}` : s.volumeNote
              return (
                <tr key={s.key} className="align-top transition-colors hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                      <span className="font-medium text-fg">{s.model}</span>
                    </div>
                    <p className="mt-0.5 max-w-xl pl-[18px] text-xs leading-5 text-fg-3">{s.terms}</p>
                  </td>
                  <td className="w-56 px-3 py-3 text-fg-2">{s.rate}</td>
                  <td className="px-3 py-3 text-right text-fg-2 tabular">{total ? pct(amount / total) : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="font-medium text-fg tabular">{currency(amount)}</div>
                    <div className="text-xs whitespace-nowrap text-fg-3">{volume}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-2">
              <td className="px-5 py-2.5 font-medium text-fg" colSpan={2}>
                Total
              </td>
              <td className="px-3 py-2.5 text-right text-fg-2 tabular">{total ? '100%' : '—'}</td>
              <td className="px-5 py-2.5 text-right font-semibold text-fg tabular">{currency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
