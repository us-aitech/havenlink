import { useMemo, type ReactNode } from 'react'
import { House, Server, Split, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'
import type { Ont, OntStatus, Splitter } from '@/types'
import { OntCell, OntLegend } from './NetParts'
import { ONT_STATUS_ICON } from './NetUtils'

interface OntView {
  ont: Ont
  status: OntStatus
  rx: number | null
}

interface Branch {
  primary: Splitter
  children: Array<{ splitter: Splitter; views: OntView[]; cut: boolean }>
  total: number
  online: number
  cut: boolean
}

const SECONDARY_PORTS = 8

function Connector({ last, top, trunkCut, stubCut }: { last: boolean; top: number; trunkCut?: boolean; stubCut?: boolean }) {
  return (
    <>
      <span aria-hidden className={cn('absolute top-0 left-0 w-px', trunkCut ? 'bg-critical' : 'bg-border-strong')} style={{ height: last ? top : '100%' }} />
      <span aria-hidden className={cn('absolute left-0 h-px w-5', stubCut ? 'bg-critical' : 'bg-border-strong')} style={{ top }} />
    </>
  )
}

function OnlineCount({ online, total, cut }: { online: number; total: number; cut?: boolean }) {
  if (cut) {
    return (
      <Badge tone="critical" icon={ONT_STATUS_ICON.los}>
        Fiber cut suspected
      </Badge>
    )
  }
  return (
    <span className={cn('text-xs whitespace-nowrap tabular', total > 0 && online === 0 ? 'font-medium text-critical-fg' : online < total ? 'font-medium text-warning-fg' : 'text-fg-3')}>
      {online}/{total} online
    </span>
  )
}

function SecondaryRow({ splitter, views, cut, selectedOntId, onSelectOnt }: { splitter: Splitter; views: OntView[]; cut: boolean; selectedOntId: string | null; onSelectOnt: (id: string) => void }) {
  const online = views.filter((v) => v.status === 'online').length
  const demo = views.find((v) => v.ont.isDemoHome)
  const spare = Math.max(0, SECONDARY_PORTS - views.length)
  return (
    <div className={cn('-mx-2 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 rounded-lg px-2 py-1.5 sm:flex-nowrap', cut && 'bg-critical-soft')}>
      <div className="flex h-6 w-full items-center gap-2 sm:w-40 sm:shrink-0">
        <span className={cn('font-mono text-xs font-medium whitespace-nowrap', cut ? 'text-critical-fg' : 'text-fg')}>{splitter.name}</span>
        <span className="text-xs text-fg-3">{splitter.ratio}</span>
        <span className="ml-auto sm:hidden">
          <OnlineCount online={online} total={views.length} cut={cut} />
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {views.map((v) => (
          <OntCell key={v.ont.id} ont={v.ont} status={v.status} rx={v.rx} selected={v.ont.id === selectedOntId} onSelect={onSelectOnt} />
        ))}
        {Array.from({ length: spare }, (_, i) => (
          <span key={`spare-${i}`} title="Spare port" className="size-5 shrink-0 rounded-[4px] border border-dashed border-border-strong" />
        ))}
      </div>
      <div className={cn('min-w-0 flex-1 items-center gap-3', demo ? 'flex basis-full sm:basis-0' : 'hidden sm:flex')}>
        <span className="hidden truncate text-xs text-fg-3 lg:inline">
          {splitter.cabinet} · {splitter.lossDb} dB
        </span>
        {demo && (
          <button type="button" onClick={() => onSelectOnt(demo.ont.id)} className="inline-flex min-w-0 items-center gap-1.5 rounded-md text-xs font-medium text-accent-fg hover:underline">
            <House className="size-3.5 shrink-0" />
            <span className="truncate">Demo home · {demo.ont.unit}</span>
          </button>
        )}
        <span className="ml-auto hidden shrink-0 sm:inline-flex">
          <OnlineCount online={online} total={views.length} cut={cut} />
        </span>
      </div>
    </div>
  )
}

function NodeBox({ icon: Icon, children, cut, className }: { icon: LucideIcon; children: ReactNode; cut?: boolean; className?: string }) {
  return (
    <div className={cn('inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5', cut ? 'border-critical-line bg-critical-soft' : 'border-border-strong bg-surface', className)}>
      <Icon className={cn('size-4 shrink-0', cut ? 'text-critical-fg' : 'text-fg-3')} />
      {children}
    </div>
  )
}

export function NetTopologyLegend({ className }: { className?: string }) {
  return <OntLegend className={className} />
}

export function NetTopology({ propertyId, selectedOntId, onSelectOnt }: { propertyId: string; selectedOntId: string | null; onSelectOnt: (id: string) => void }) {
  const splitters = useStore((s) => s.ops.splitters)
  const onts = useStore((s) => s.ops.onts)
  const olts = useStore((s) => s.ops.olts)
  const properties = useStore((s) => s.ops.properties)
  const homeStatus = useStore((s) => s.home.network.status)
  const homeRx = useStore((s) => s.home.network.rxPowerDbm)

  const tree = useMemo<Branch[]>(() => {
    const views = new Map<string, OntView[]>()
    for (const o of onts) {
      if (o.propertyId !== propertyId) continue
      const view: OntView = { ont: o, status: o.isDemoHome ? homeStatus : o.status, rx: o.isDemoHome ? homeRx : o.rxPowerDbm }
      const list = views.get(o.splitterId)
      if (list) list.push(view)
      else views.set(o.splitterId, [view])
    }
    const allLos = (list: OntView[]) => list.length > 0 && list.every((v) => v.ont.status === 'los')
    const local = splitters.filter((s) => s.propertyId === propertyId)
    return local
      .filter((s) => s.parentId === null)
      .map((primary) => {
        const kids = local.filter((s) => s.parentId === primary.id).map((s) => ({ splitter: s, views: views.get(s.id) ?? [] }))
        const all = kids.flatMap((c) => c.views)
        const cut = allLos(all)
        return {
          primary,
          children: kids.map((c) => ({ ...c, cut: !cut && allLos(c.views) })),
          total: all.length,
          online: all.filter((v) => v.status === 'online').length,
          cut,
        }
      })
  }, [splitters, onts, propertyId, homeStatus, homeRx])

  const property = properties.find((p) => p.id === propertyId)
  const olt = olts.find((o) => o.id === property?.oltId)
  const portNumber = ((olts.findIndex((o) => o.id === olt?.id) * 5 + properties.findIndex((p) => p.id === propertyId)) % (olt?.ponPorts ?? 16)) + 1

  return (
    <div className="min-w-0">
      <NodeBox icon={Server} className="max-w-full py-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono text-[13px] font-semibold text-fg">{olt?.name ?? 'OLT'}</span>
            <span className="text-xs text-fg-3 tabular">PON {portNumber}</span>
          </div>
          <div className="truncate text-xs text-fg-3">{olt?.location} · GPON 2.5G / 1.25G</div>
        </div>
      </NodeBox>
      <ul className="ml-[19px]">
        {tree.map((branch, i) => (
          <li key={branch.primary.id} className="relative pt-3 pl-5">
            <Connector last={i === tree.length - 1} top={30} stubCut={branch.cut} />
            <div className="flex h-9 min-w-0 items-center gap-3">
              <NodeBox icon={Split} cut={branch.cut} className="h-9 shrink-0">
                <span className={cn('font-mono text-[13px] font-semibold', branch.cut ? 'text-critical-fg' : 'text-fg')}>{branch.primary.name}</span>
                <span className="text-xs text-fg-3">{branch.primary.ratio}</span>
              </NodeBox>
              <span className="hidden min-w-0 truncate text-xs text-fg-3 sm:inline">
                {branch.primary.cabinet} · {branch.primary.lossDb} dB loss
              </span>
              <span className="ml-auto shrink-0">
                <OnlineCount online={branch.online} total={branch.total} cut={branch.cut} />
              </span>
            </div>
            <ul className="ml-[19px]">
              {branch.children.map((c, j) => (
                <li key={c.splitter.id} className="relative pt-2 pl-5">
                  <Connector last={j === branch.children.length - 1} top={26} trunkCut={branch.cut} stubCut={branch.cut || c.cut} />
                  <SecondaryRow splitter={c.splitter} views={c.views} cut={c.cut} selectedOntId={selectedOntId} onSelectOnt={onSelectOnt} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
