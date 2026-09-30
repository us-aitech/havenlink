import { SERIES } from '@/components/charts/palette'
import type { RevenueMonth } from '@/types'

export type StreamKey = Exclude<keyof RevenueMonth, 'month'>

export interface RevenueStream {
  key: StreamKey
  label: string
  model: string
  color: string
  rate: string
  terms: string
  unitPrice?: number
  unitLabel?: string
  volumeNote?: string
}

export const REVENUE_STREAMS: RevenueStream[] = [
  {
    key: 'retainer',
    label: 'Maintenance retainer',
    model: 'Maintenance retainer',
    color: SERIES[0],
    rate: '$18,000 / mo flat',
    terms: 'Covers scheduled inspections, light-level testing, cabinet and pedestal checks, cleaning and documentation updates.',
    volumeNote: 'Flat monthly fee',
  },
  {
    key: 'troubleCalls',
    label: 'Trouble calls',
    model: 'Per-ticket trouble-call rate',
    color: SERIES[1],
    rate: '$145 per ticket',
    terms: 'ISP-dispatched trouble calls: diagnose ONT, drop, splitter and cabinet; repair, test and document.',
    unitPrice: 145,
    unitLabel: 'tickets',
  },
  {
    key: 'emergency',
    label: 'Emergency premium',
    model: 'Emergency repair premium',
    color: SERIES[2],
    rate: '$595 per P1 dispatch',
    terms: '24/7 fiber-cut and storm restoration with a 4-hour SLA: locate, splice, test and restore service.',
    unitPrice: 595,
    unitLabel: 'P1 dispatches',
  },
  {
    key: 'smartHome',
    label: 'Smart-home share',
    model: 'Smart-home install revenue share',
    color: SERIES[3],
    rate: '30% of monthly package fees + install fees',
    terms: 'Essentials, Secure and Complete packages sold to residents on the partner’s fiber.',
    volumeNote: 'Package share + install fees',
  },
  {
    key: 'bulk',
    label: 'Bulk contracts',
    model: 'Bulk property contracts',
    color: SERIES[4],
    rate: '$80 / unit / mo',
    terms: 'MDU technology package bundled into property-wide bulk agreements with owners and managers.',
    unitPrice: 80,
    unitLabel: 'units',
  },
]

export function monthTotal(row: RevenueMonth): number {
  return REVENUE_STREAMS.reduce((sum, s) => sum + row[s.key], 0)
}

export function compactUsd(value: number): string {
  if (Math.abs(value) < 1000) return `$${Math.round(value)}`
  const k = value / 1000
  const text = Math.abs(k) >= 100 ? String(Math.round(k)) : String(Math.round(k * 10) / 10)
  return `$${text}k`
}
