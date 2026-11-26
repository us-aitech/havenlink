import type { Ont, OntStatus, Priority, Splitter, WorkOrder, WorkOrderType } from '@/types'
import { isOpen } from '@/lib/workflows'

/**
 * Binary fiber view of an ONT, derived from the OLT-reported status.
 * - signal:      light reaches the ONT (online, or online with low light)
 * - no-signal:   ONT is powered but reports LOS — no light at the ONT
 * - no-response: ONT stopped answering without a LOS alarm. Fiber state unknown; most likely power.
 */
export type FiberSignal = 'signal' | 'no-signal' | 'no-response'

export function fiberSignal(status: OntStatus): FiberSignal {
  if (status === 'los') return 'no-signal'
  if (status === 'offline') return 'no-response'
  return 'signal'
}

export const FIBER_SIGNAL_LABEL: Record<FiberSignal, string> = {
  signal: 'Signal',
  'no-signal': 'No signal',
  'no-response': 'Not responding',
}

/** Where the break is, walking up the tree: drop → 1:8 splitter → 1:4 feeder. */
export type FaultLevel = 'feeder' | 'splitter' | 'drop' | 'no-response'

export const FAULT_LEVEL_LABEL: Record<FaultLevel, string> = {
  feeder: 'Street / feeder',
  splitter: 'Splitter',
  drop: 'Drop / inside the home',
  'no-response': 'Likely power',
}

export const FAULT_LEVEL_ORDER: Record<FaultLevel, number> = { feeder: 0, splitter: 1, drop: 2, 'no-response': 3 }

export interface FiberFault {
  id: string
  level: FaultLevel
  propertyId: string
  /** Splitter where the fault sits (feeder: the 1:4, splitter: the 1:8, drop/no-response: the ONT's 1:8). */
  splitter: Splitter
  /** ONTs without light (or not responding) explained by this fault. */
  onts: Ont[]
  /** Lit ONTs that prove the network upstream of the fault is fine. */
  litNeighbors: number
  /** Other dark drops on the same splitter (drop level only). */
  darkSiblings: number
  /** True when the tree can't separate this level from the one above it. */
  ambiguous: boolean
}

/** Fewer than this many responding ONTs dark together is not enough to blame shared fiber. */
const MIN_DARK_FOR_SHARED_FAULT = 2

/**
 * A group of ONTs is "dark" when every ONT that still talks to the OLT reports LOS,
 * and at least two do. Not-responding ONTs are ignored so one unplugged ONT can't hide a cut.
 */
export function isDark(list: Array<Pick<Ont, 'status'>>): boolean {
  const responding = list.filter((o) => o.status !== 'offline')
  return responding.length >= MIN_DARK_FOR_SHARED_FAULT && responding.every((o) => o.status === 'los')
}

function groupBy<T>(items: T[], key: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    if (k === null) continue
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

export function locateFiberFaults(splitters: Splitter[], onts: Ont[]): FiberFault[] {
  const ontsBySplitter = groupBy(onts, (o) => o.splitterId)
  const childrenOf = groupBy(splitters, (s) => s.parentId)
  const faults: FiberFault[] = []
  const explained = new Set<string>()
  const lit = (list: Ont[]) => list.filter((o) => fiberSignal(o.status) === 'signal').length

  for (const primary of splitters) {
    if (primary.parentId) continue
    const secondaries = (childrenOf.get(primary.id) ?? []).filter((s) => (ontsBySplitter.get(s.id) ?? []).length > 0)
    const downstream = secondaries.flatMap((s) => ontsBySplitter.get(s.id) ?? [])

    // Every splitter under the 1:4 is dark → the break is upstream of it (feeder / street / cabinet).
    // Splitters whose ONTs are all not responding carry no evidence either way and are skipped.
    const responding = (s: Splitter) => (ontsBySplitter.get(s.id) ?? []).filter((o) => o.status !== 'offline')
    const active = secondaries.filter((s) => responding(s).length > 0)
    const dark = downstream.filter((o) => o.status === 'los')
    if (active.length >= 2 && dark.length >= MIN_DARK_FOR_SHARED_FAULT && active.every((s) => responding(s).every((o) => o.status === 'los'))) {
      dark.forEach((o) => explained.add(o.id))
      faults.push({ id: `feeder-${primary.id}`, level: 'feeder', propertyId: primary.propertyId, splitter: primary, onts: dark, litNeighbors: 0, darkSiblings: 0, ambiguous: false })
      continue
    }

    // One 1:8 dark while its siblings on the same 1:4 are lit → the splitter or the fiber feeding it.
    for (const s of secondaries) {
      const list = ontsBySplitter.get(s.id) ?? []
      if (!isDark(list)) continue
      const splitterDark = list.filter((o) => o.status === 'los')
      splitterDark.forEach((o) => explained.add(o.id))
      const siblingLit = secondaries.filter((x) => x.id !== s.id).reduce((n, x) => n + lit(ontsBySplitter.get(x.id) ?? []), 0)
      faults.push({ id: `splitter-${s.id}`, level: 'splitter', propertyId: s.propertyId, splitter: s, onts: splitterDark, litNeighbors: siblingLit, darkSiblings: 0, ambiguous: secondaries.length < 2 })
    }
  }

  const splitterById = new Map(splitters.map((s) => [s.id, s]))
  for (const o of onts) {
    if (explained.has(o.id)) continue
    const signal = fiberSignal(o.status)
    if (signal === 'signal') continue
    const splitter = splitterById.get(o.splitterId)
    if (!splitter) continue
    const mates = (ontsBySplitter.get(o.splitterId) ?? []).filter((m) => m.id !== o.id)
    faults.push({
      id: `${signal === 'no-signal' ? 'drop' : 'power'}-${o.id}`,
      level: signal === 'no-signal' ? 'drop' : 'no-response',
      propertyId: o.propertyId,
      splitter,
      onts: [o],
      litNeighbors: lit(mates),
      darkSiblings: mates.filter((m) => m.status === 'los' && !explained.has(m.id)).length,
      // With no lit neighbor on the same splitter we can't prove the splitter port is fine.
      ambiguous: signal === 'no-signal' && lit(mates) === 0,
    })
  }

  return faults.sort(
    (a, b) => FAULT_LEVEL_ORDER[a.level] - FAULT_LEVEL_ORDER[b.level] || b.onts.length - a.onts.length || a.propertyId.localeCompare(b.propertyId) || a.splitter.name.localeCompare(b.splitter.name),
  )
}

export interface FaultDispatch {
  type: WorkOrderType
  priority: Priority
  incident: 'fiber-cut' | 'drop-fault' | 'ont-power'
}

export const FAULT_DISPATCH: Record<FaultLevel, FaultDispatch> = {
  feeder: { type: 'emergency', priority: 'P1', incident: 'fiber-cut' },
  splitter: { type: 'emergency', priority: 'P1', incident: 'fiber-cut' },
  drop: { type: 'trouble', priority: 'P2', incident: 'drop-fault' },
  'no-response': { type: 'support', priority: 'P3', incident: 'ont-power' },
}

/** Open fiber-cut work order whose splitter is `splitterId` or one of its ancestors (a feeder WO covers its splitters). */
export function fiberCutWorkOrderFor(splitterId: string, splitters: Splitter[], workOrders: WorkOrder[]): WorkOrder | undefined {
  const exact = workOrders.find((w) => isOpen(w) && w.incident === 'fiber-cut' && w.splitterId === splitterId)
  if (exact) return exact
  return workOrders.find((w) => isOpen(w) && w.incident === 'fiber-cut' && w.splitterId !== undefined && splitterSubtree(splitters, w.splitterId).has(splitterId))
}

/** True when an open fiber-cut work order reaches this ONT. Legacy WOs without a splitter only covered the demo home. */
export function fiberCutReaches(wo: WorkOrder, ont: Pick<Ont, 'splitterId' | 'isDemoHome'>, splitters: Splitter[]): boolean {
  if (wo.incident !== 'fiber-cut') return false
  if (!wo.splitterId) return ont.isDemoHome
  return splitterSubtree(splitters, wo.splitterId).has(ont.splitterId)
}

/** The open work order already covering this fault, if any. */
export function workOrderForFault(fault: FiberFault, workOrders: WorkOrder[], splitters: Splitter[]): WorkOrder | undefined {
  const shared = fiberCutWorkOrderFor(fault.splitter.id, splitters, workOrders)
  if (fault.level === 'feeder' || fault.level === 'splitter' || shared) return shared
  const incident = FAULT_DISPATCH[fault.level].incident
  const ontId = fault.onts[0]?.id
  return workOrders.find((w) => isOpen(w) && w.ontId === ontId && w.incident === incident)
}

/** All splitter ids at or below `splitterId`. */
export function splitterSubtree(splitters: Splitter[], splitterId: string): Set<string> {
  const ids = new Set([splitterId])
  let grew = true
  while (grew) {
    grew = false
    for (const s of splitters) {
      if (s.parentId && ids.has(s.parentId) && !ids.has(s.id)) {
        ids.add(s.id)
        grew = true
      }
    }
  }
  return ids
}
