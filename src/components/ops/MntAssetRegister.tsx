import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CalendarCheck, CalendarPlus, Clock, Server } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, Segmented, Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDate, timeAgo } from '@/lib/format'
import type { Asset, AssetCondition, Property, WorkOrder } from '@/types'
import { ASSET_KIND_ICON, ASSET_KIND_LABEL, ConditionBadge, DAY_MS, LINK_BUTTON, workOrderHref } from './MntShared'

type ConditionFilter = 'all' | AssetCondition

const CONDITION_RANK: Record<AssetCondition, number> = { poor: 0, fair: 1, good: 2 }

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

  return (
    <Card padded={false}>
      <div className="p-5 pb-4">
        <CardHeader
          title="Asset register"
          subtitle={`Cabinets, pedestals, risers and slack storage across ${properties.length} properties`}
          icon={Server}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} aria-label="Filter by property" className="sm:w-64">
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
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'poor', label: 'Poor', count: counts.poor },
              { value: 'fair', label: 'Fair', count: counts.fair },
              { value: 'good', label: 'Good', count: counts.good },
            ]}
          />
        </div>
      </div>
      <div className="relative overflow-x-auto border-t border-border">
        {rows.length > 0 ? (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-fg-3 uppercase">
                <th className="px-5 py-2.5 font-medium">Asset</th>
                <th className="px-3 py-2.5 font-medium">Property</th>
                <th className="px-3 py-2.5 font-medium">Condition</th>
                <th className="px-3 py-2.5 font-medium">Last inspected</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => {
                const Icon = ASSET_KIND_ICON[a.kind]
                const stale = now - a.lastInspectedAt > 90 * DAY_MS
                const open = openByAsset.get(a.id)
                return (
                  <tr key={a.id} className="transition hover:bg-surface-3">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-2 ring-1 ring-border">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-fg">{a.name}</div>
                          <div className="text-[11px] text-fg-3">{ASSET_KIND_LABEL[a.kind]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-fg-2">{propertyName.get(a.propertyId) ?? a.propertyId}</td>
                    <td className="px-3 py-3">
                      <ConditionBadge condition={a.condition} />
                    </td>
                    <td className="px-3 py-3">
                      <div className={cn('inline-flex items-center gap-1.5 tabular', stale ? 'text-warning-fg' : 'text-fg-2')}>
                        {stale && <Clock className="size-3.5" />}
                        {timeAgo(a.lastInspectedAt, now)}
                      </div>
                      <div className="text-[11px] text-fg-3">
                        {formatDate(a.lastInspectedAt)}
                        {stale && ' · outside 90-day cycle'}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {open ? (
                        <Link to={workOrderHref(open.id)} className={LINK_BUTTON} title="Inspection already scheduled">
                          <CalendarCheck className="size-3.5 text-good-fg" />
                          {open.number}
                          {open.scheduledFor ? ` · ${formatDate(open.scheduledFor)}` : ''}
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
        ) : (
          <EmptyState icon={Server} title="No assets match these filters" message="Try a different property or condition." />
        )}
      </div>
    </Card>
  )
}
