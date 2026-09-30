import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarCheck, CalendarPlus, Server } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, Segmented, Select } from '@/components/ui'
import { formatDate, pct, timeAgo } from '@/lib/format'
import type { Asset, AssetCondition, Property, WorkOrder } from '@/types'
import { ASSET_KIND_ICON, ASSET_KIND_LABEL, ConditionBadge, DAY_MS, workOrderHref } from './MntShared'

type ConditionFilter = 'all' | AssetCondition

const CONDITION_RANK: Record<AssetCondition, number> = { poor: 0, fair: 1, good: 2 }
const DEFAULT_ROWS = 10
const CYCLE_DAYS = 90

interface Props {
  assets: Asset[]
  properties: Property[]
  openByAsset: Map<string, WorkOrder>
  now: number
  onSchedule: (asset: Asset) => void
}

export function MntAssetRegister({ assets, properties, openByAsset, now, onSchedule }: Props) {
  const [propertyId, setPropertyId] = useState('all')
  const [condition, setCondition] = useState<ConditionFilter>('all')
  const [expanded, setExpanded] = useState(false)
  const propertyName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties])

  const scoped = propertyId === 'all' ? assets : assets.filter((a) => a.propertyId === propertyId)
  const counts: Record<ConditionFilter, number> = {
    all: scoped.length,
    good: scoped.filter((a) => a.condition === 'good').length,
    fair: scoped.filter((a) => a.condition === 'fair').length,
    poor: scoped.filter((a) => a.condition === 'poor').length,
  }
  const rows = scoped
    .filter((a) => condition === 'all' || a.condition === condition)
    .sort((a, b) => CONDITION_RANK[a.condition] - CONDITION_RANK[b.condition] || a.lastInspectedAt - b.lastInspectedAt)
  const visible = expanded ? rows : rows.slice(0, DEFAULT_ROWS)
  const inCycle = assets.filter((a) => now - a.lastInspectedAt <= CYCLE_DAYS * DAY_MS).length

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader
          title="Asset register"
          subtitle={`${assets.length} cabinets, pedestals, risers and slack loops · ${assets.length ? pct(inCycle / assets.length) : '—'} inspected in the last ${CYCLE_DAYS} days`}
        />
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center">
          <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} aria-label="Filter by property" className="h-8 text-[13px] sm:w-60">
            <option value="all">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Segmented<ConditionFilter>
            size="sm"
            value={condition}
            onChange={setCondition}
            className="self-start sm:self-auto"
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'poor', label: 'Poor', count: counts.poor },
              { value: 'fair', label: 'Fair', count: counts.fair },
              { value: 'good', label: 'Good', count: counts.good },
            ]}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="border-t border-border">
          <EmptyState icon={Server} title="No assets match these filters" message="Try a different property or condition." />
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-y border-border bg-surface-2 text-left text-xs text-fg-3">
                <th className="px-5 py-2 font-medium">Asset</th>
                <th className="px-5 py-2 font-medium">Property</th>
                <th className="px-5 py-2 font-medium">Condition</th>
                <th className="px-5 py-2 font-medium">Last inspected</th>
                <th className="px-5 py-2 text-right font-medium">Next inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((a) => {
                const Icon = ASSET_KIND_ICON[a.kind]
                const stale = now - a.lastInspectedAt > CYCLE_DAYS * DAY_MS
                const open = openByAsset.get(a.id)
                return (
                  <tr key={a.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-4 shrink-0 text-fg-3" />
                        <div className="min-w-0">
                          <div className="font-mono text-xs leading-5 text-fg">{a.name}</div>
                          <div className="text-xs text-fg-3">{ASSET_KIND_LABEL[a.kind]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-fg-2">{propertyName.get(a.propertyId) ?? a.propertyId}</td>
                    <td className="px-5 py-2.5">
                      <ConditionBadge condition={a.condition} />
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="text-fg-2 tabular">{formatDate(a.lastInspectedAt)}</div>
                      <div className={stale ? 'text-xs text-warning-fg' : 'text-xs text-fg-3'}>
                        {timeAgo(a.lastInspectedAt, now)}
                        {stale && ` · outside ${CYCLE_DAYS}-day cycle`}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {open ? (
                        <Link
                          to={workOrderHref(open.id)}
                          className="inline-flex items-center gap-1.5 rounded-md text-[13px] text-fg-2 underline-offset-2 hover:text-fg hover:underline"
                          title={`Open ${open.number}`}
                        >
                          <CalendarCheck className="size-3.5 text-fg-3" />
                          {open.scheduledFor ? formatDate(open.scheduledFor) : 'Scheduled'}
                          <span className="font-mono text-xs text-fg-3">{open.number}</span>
                        </Link>
                      ) : (
                        <Button size="xs" icon={CalendarPlus} onClick={() => onSchedule(a)}>
                          Schedule inspection
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > DEFAULT_ROWS && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2">
          <span className="text-xs text-fg-3 tabular">
            Showing {visible.length} of {rows.length}
          </span>
          <Button size="xs" variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show fewer' : `Show all ${rows.length}`}
          </Button>
        </div>
      )}
    </Card>
  )
}
