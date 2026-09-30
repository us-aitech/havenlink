import { DEMO, getPartner } from '@/config'
import { DEMO_ONT_ID } from '@/data/seed'
import { chance, pick, rand, randInt, round, uid } from '@/lib/random'
import { SLA_HOURS, WORKFLOWS, nextStage } from '@/lib/workflows'
import type {
  ActivityEvent,
  AppData,
  AutomationKey,
  CriticalAlert,
  IncidentKind,
  Priority,
  ScenarioKey,
  SecurityMode,
  SmartPackage,
  Technician,
  Toast,
  WorkOrder,
  WorkOrderSource,
  WorkOrderType,
} from '@/types'

const HOUR = 3_600_000

export function addEvent(d: AppData, e: Omit<ActivityEvent, 'id' | 'ts'> & { ts?: number }) {
  d.events.unshift({ ...e, id: uid('ev'), ts: e.ts ?? Date.now() })
  if (d.events.length > 250) d.events.length = 250
}

export function addToast(d: AppData, t: Omit<Toast, 'id' | 'createdAt'>) {
  d.toasts.push({ ...t, id: uid('toast'), createdAt: Date.now() })
  if (d.toasts.length > 4) d.toasts.splice(0, d.toasts.length - 4)
}

export function raiseAlert(d: AppData, a: Omit<CriticalAlert, 'id' | 'at'>) {
  d.alert = { ...a, id: uid('alert'), at: Date.now() }
}

function automationEnabled(d: AppData, key: AutomationKey): boolean {
  return d.home.automations.find((a) => a.id === key)?.enabled ?? false
}

function markAutomationRun(d: AppData, key: AutomationKey) {
  const a = d.home.automations.find((x) => x.id === key)
  if (a) a.lastRunAt = Date.now()
}

function techName(d: AppData, id: string | null): string {
  return d.ops.technicians.find((t) => t.id === id)?.name ?? 'Dispatch'
}

function propertyName(d: AppData, id: string): string {
  return d.ops.properties.find((p) => p.id === id)?.name ?? id
}

function isDemoWorkOrder(d: AppData, wo: WorkOrder): boolean {
  return wo.ontId === DEMO_ONT_ID || (wo.propertyId === d.home.propertyId && wo.unit === d.home.unit) || wo.incident === 'fiber-cut'
}

export interface NewWorkOrder {
  type: WorkOrderType
  priority: Priority
  title: string
  description: string
  propertyId: string
  unit?: string
  ontId?: string
  splitterId?: string
  assetId?: string
  source: WorkOrderSource
  scheduledFor?: number
  incident?: IncidentKind
  package?: SmartPackage
  billable?: number
  assigneeId?: string | null
}

export function createWorkOrder(d: AppData, input: NewWorkOrder): WorkOrder {
  const now = Date.now()
  const num = d.ops.nextWorkOrderNumber
  d.ops.nextWorkOrderNumber += 1
  const firstStage = WORKFLOWS[input.type][0].key
  const dueAt =
    input.scheduledFor && (input.type === 'install' || input.type === 'maintenance')
      ? input.scheduledFor + 4 * HOUR
      : now + SLA_HOURS[input.type][input.priority] * HOUR
  const wo: WorkOrder = {
    id: `wo-${num}`,
    number: `WO-${num}`,
    type: input.type,
    priority: input.priority,
    title: input.title,
    description: input.description,
    propertyId: input.propertyId,
    unit: input.unit,
    ontId: input.ontId,
    splitterId: input.splitterId,
    assetId: input.assetId,
    source: input.source,
    createdAt: now,
    dueAt,
    scheduledFor: input.scheduledFor,
    stage: firstStage,
    history: [{ stage: firstStage, at: now, by: input.source }],
    assigneeId: null,
    photos: [],
    notes: [],
    incident: input.incident,
    package: input.package,
    billable: input.billable ?? defaultBillable(input.type, input.package),
  }
  d.ops.workOrders.unshift(wo)
  if (input.assigneeId) assignWorkOrder(d, wo.id, input.assigneeId, 'Auto-dispatch')
  return wo
}

function defaultBillable(type: WorkOrderType, pkg?: SmartPackage): number {
  if (type === 'emergency') return 595
  if (type === 'trouble') return 145
  if (type === 'install') return pkg === 'Complete' ? 380 : pkg === 'Secure' ? 290 : 180
  return 0
}

const SKILL_HINTS: Record<WorkOrderType, string[]> = {
  emergency: ['Fiber splicing', 'Aerial fiber', 'Underground', 'Splicing', 'GPON'],
  trouble: ['GPON', 'ONT', 'Splicing', 'Fiber splicing', 'OTDR'],
  maintenance: ['Cabinets', 'Underground', 'Aerial fiber', 'GPON'],
  install: ['Smart-home', 'Access control', 'Mesh WiFi'],
  support: ['Resident support', 'Mesh WiFi', 'Smart-home', 'App onboarding'],
}

export function bestTechnicianFor(d: AppData, type: WorkOrderType): Technician | null {
  const available = d.ops.technicians.filter((t) => t.status === 'available')
  const skilled = available.find((t) => t.skills.some((s) => SKILL_HINTS[type].includes(s)))
  return skilled ?? available[0] ?? d.ops.technicians.find((t) => t.status !== 'off-duty') ?? null
}

export function assignWorkOrder(d: AppData, woId: string, techId: string, by = 'Dispatcher') {
  const wo = d.ops.workOrders.find((w) => w.id === woId)
  if (!wo) return
  wo.assigneeId = techId
  const stages = WORKFLOWS[wo.type]
  const assignedStage = stages.find((s) => s.key === 'assigned')
  if (assignedStage && stages.findIndex((s) => s.key === wo.stage) < stages.findIndex((s) => s.key === 'assigned')) {
    wo.stage = 'assigned'
    wo.history.push({ stage: 'assigned', at: Date.now(), by })
  }
  addEvent(d, {
    severity: 'info',
    category: 'work-order',
    scope: 'ops',
    title: `${wo.number} assigned to ${techName(d, techId)}`,
    detail: wo.title,
    propertyId: wo.propertyId,
  })
}

export function advanceWorkOrder(d: AppData, woId: string, note?: string) {
  const wo = d.ops.workOrders.find((w) => w.id === woId)
  if (!wo) return
  const next = nextStage(wo)
  if (!next) return
  const now = Date.now()
  if (!wo.assigneeId) {
    const tech = bestTechnicianFor(d, wo.type)
    if (tech) wo.assigneeId = tech.id
  }
  const tech = d.ops.technicians.find((t) => t.id === wo.assigneeId)
  wo.stage = next.key
  wo.history.push({ stage: next.key, at: now, by: tech?.name ?? 'Dispatcher', note })
  if (tech) {
    if (next.key === 'en-route') {
      tech.status = 'en-route'
      tech.activeWorkOrderId = wo.id
    } else if (['diagnosing', 'repairing', 'installing', 'inspecting', 'light-level', 'wifi'].includes(next.key)) {
      if (wo.type !== 'support') tech.status = 'on-site'
      tech.activeWorkOrderId = wo.id
    }
  }
  if (next.key === 'closed') {
    wo.closedAt = now
    if (tech && tech.activeWorkOrderId === wo.id) {
      tech.status = 'available'
      tech.activeWorkOrderId = null
    }
    if (wo.incident) resolveIncident(d, wo)
    if (wo.type === 'maintenance' && wo.assetId) {
      const asset = d.ops.assets.find((a) => a.id === wo.assetId)
      if (asset) {
        asset.lastInspectedAt = now
        asset.condition = 'good'
      }
    }
    if (wo.type === 'install') {
      const prop = d.ops.properties.find((p) => p.id === wo.propertyId)
      const ont = d.ops.onts.find((o) => o.id === wo.ontId)
      if (ont && !ont.smartHome) {
        ont.smartHome = true
        if (prop) prop.smartHomeUnits += 1
      }
    }
  }
  addEvent(d, {
    severity: next.key === 'closed' ? 'success' : 'info',
    category: 'work-order',
    scope: 'ops',
    title: `${wo.number} → ${next.label}`,
    detail: `${wo.title}${tech ? ` · ${tech.name}` : ''}`,
    propertyId: wo.propertyId,
  })
  if (isDemoWorkOrder(d, wo)) {
    const residentCopy: Record<string, string> = {
      assigned: `${tech?.name ?? 'A technician'} has been assigned to your request`,
      'en-route': `${tech?.name ?? 'Your technician'} is on the way`,
      diagnosing: `${tech?.name ?? 'Your technician'} is on site and diagnosing`,
      repairing: 'Repair in progress',
      resolving: 'Your request is being resolved',
      installing: 'Installation in progress',
      closed: 'Service ticket closed — thank you!',
    }
    const text = residentCopy[next.key]
    if (text) {
      addEvent(d, { severity: next.key === 'closed' ? 'success' : 'info', category: 'work-order', scope: 'home', title: text, detail: `${wo.number} · ${wo.title}` })
    }
  }
}

function resolveIncident(d: AppData, wo: WorkOrder) {
  const now = Date.now()
  if (wo.incident === 'fiber-cut') {
    const splitterId = wo.splitterId ?? d.ops.onts.find((o) => o.id === DEMO_ONT_ID)?.splitterId
    const restored = d.ops.onts.filter((o) => o.splitterId === splitterId && o.status === 'los')
    for (const o of restored) {
      o.status = 'online'
      o.rxPowerDbm = o.isDemoHome ? -19.4 : round(rand(-22.5, -15), 1)
      o.lastTestAt = now
    }
    const n = d.home.network
    if (restored.some((o) => o.isDemoHome) || n.status === 'los') {
      n.status = 'online'
      n.rxPowerDbm = -19.4
      n.backupActive = false
      n.onlineSince = now
      n.latencyMs = 4
      n.packetLoss = 0
      for (const node of n.meshNodes) node.online = true
    }
    if (d.alert?.kind === 'outage') d.alert = null
    addEvent(d, { severity: 'success', category: 'network', scope: 'both', title: 'Fiber service restored', detail: `${restored.length} homes back online · ${wo.number}`, propertyId: wo.propertyId })
    addToast(d, { severity: 'success', title: 'Fiber service restored', message: `${restored.length} homes back online. Hub switched back from LTE backup.` })
  }
  if (wo.incident === 'signal-degradation') {
    const ont = d.ops.onts.find((o) => o.id === wo.ontId)
    if (ont) {
      ont.status = 'online'
      ont.rxPowerDbm = ont.isDemoHome ? -19.4 : round(rand(-21, -16), 1)
      ont.lastTestAt = now
      d.ops.lightLevels.unshift({ id: uid('ll'), ontId: ont.id, point: 'ONT', dbm: ont.rxPowerDbm, at: now, pass: true, by: techName(d, wo.assigneeId) })
    }
    if (ont?.isDemoHome) {
      d.home.network.status = 'online'
      d.home.network.rxPowerDbm = -19.4
      d.home.network.packetLoss = 0
      d.home.network.latencyMs = 4
    }
    if (d.alert?.kind === 'degradation') d.alert = null
    addEvent(d, { severity: 'success', category: 'network', scope: ont?.isDemoHome ? 'both' : 'ops', title: 'Light level back to normal', detail: `${ont?.unit ?? ''} · connector cleaned and re-terminated`, propertyId: wo.propertyId })
    if (ont?.isDemoHome) addToast(d, { scope: 'home', severity: 'success', title: 'Connection back to full speed', message: 'Your technician cleaned and re-terminated the fiber connector.' })
  }
  if (wo.incident === 'leak-followup') {
    addEvent(d, { severity: 'success', category: 'water', scope: 'both', title: 'Leak follow-up completed', detail: 'Plumbing inspected, sensors re-tested, valve exercised' })
  }
}

export function triggerLeak(d: AppData, cause: string, now: number) {
  const w = d.home.water
  if (w.status === 'leak') return
  w.status = 'leak'
  w.leakCause = cause
  w.leakDetectedAt = now
  addEvent(d, { severity: 'critical', category: 'water', scope: 'home', title: 'Leak detected', detail: cause })
  const auto = w.settings.autoShutoff && automationEnabled(d, 'leak-shutoff')
  if (auto && (w.valve === 'open' || w.valve === 'opening')) {
    w.valve = 'closing'
    w.valveTransitionEndsAt = now + DEMO.valveTravelSeconds * 1000
    w.shutoffCount += 1
    const estimatedLossGpm = w.scenario === 'burst-pipe' ? 9.5 : w.scenario === 'slow-leak' ? 0.45 : 1.5
    const hoursUntilNoticed = w.scenario === 'slow-leak' ? 48 : 8
    w.gallonsSaved += Math.round(estimatedLossGpm * 60 * hoursUntilNoticed)
    markAutomationRun(d, 'leak-shutoff')
    addEvent(d, { severity: 'warning', category: 'automation', scope: 'home', title: 'Automatic shut-off engaged', detail: 'Main water valve is closing' })
  }
  raiseAlert(d, {
    kind: 'leak',
    title: auto ? 'Leak detected — water shut off' : 'Leak detected!',
    message: auto
      ? `${cause}. The main water valve was closed automatically to protect your home from water damage and mold. Our field team has been notified.`
      : `${cause}. Automatic shut-off is disabled — close the main valve now to prevent water damage.`,
  })
  if (w.settings.notifyOps) {
    const existing = d.ops.workOrders.find((x) => x.incident === 'leak-followup' && x.stage !== 'closed')
    if (!existing) {
      const wo = createWorkOrder(d, {
        type: 'support',
        priority: 'P2',
        title: `Leak follow-up — ${d.home.unit}`,
        description: `${cause}. Valve ${auto ? 'closed automatically' : 'still open — resident alerted'}. Inspect plumbing, dry sensors, verify valve and flow sensor.`,
        propertyId: d.home.propertyId,
        unit: d.home.unit,
        ontId: DEMO_ONT_ID,
        source: 'Auto-detect',
        incident: 'leak-followup',
      })
      addEvent(d, {
        severity: 'critical',
        category: 'water',
        scope: 'ops',
        title: `Leak at ${d.home.unit} — ${auto ? 'valve closed automatically' : 'valve OPEN'}`,
        detail: `${cause} · ${wo.number} created`,
        propertyId: d.home.propertyId,
        unit: d.home.unit,
      })
    }
  }
}

export function resolveLeak(d: AppData) {
  const w = d.home.water
  const now = Date.now()
  w.scenario = 'none'
  w.status = 'normal'
  w.leakCause = null
  w.leakDetectedAt = null
  w.continuousFlowMinutes = 0
  w.highFlowSeconds = 0
  for (const s of w.leakSensors) s.wet = false
  if (w.valve === 'closed' || w.valve === 'closing') {
    w.valve = 'opening'
    w.valveTransitionEndsAt = now + DEMO.valveTravelSeconds * 1000
  }
  if (d.alert?.kind === 'leak') d.alert = null
  addEvent(d, { severity: 'success', category: 'water', scope: 'both', title: 'Leak cleared — water restored', detail: 'Resident confirmed the issue was fixed', propertyId: d.home.propertyId, unit: d.home.unit })
}

export function setValve(d: AppData, open: boolean) {
  const w = d.home.water
  const now = Date.now()
  if (open && (w.valve === 'closed' || w.valve === 'closing')) {
    w.valve = 'opening'
    w.valveTransitionEndsAt = now + DEMO.valveTravelSeconds * 1000
    addEvent(d, { severity: 'info', category: 'water', scope: 'home', title: 'Opening main water valve', detail: 'Requested from the app' })
  }
  if (!open && (w.valve === 'open' || w.valve === 'opening')) {
    w.valve = 'closing'
    w.valveTransitionEndsAt = now + DEMO.valveTravelSeconds * 1000
    addEvent(d, { severity: 'info', category: 'water', scope: 'home', title: 'Closing main water valve', detail: 'Requested from the app' })
  }
}

const FIXTURES = [
  { name: 'Kitchen faucet', gpm: 1.5, min: 4, max: 10 },
  { name: 'Shower', gpm: 2.1, min: 10, max: 18 },
  { name: 'Toilet flush', gpm: 1.6, min: 3, max: 5 },
  { name: 'Dishwasher', gpm: 1.2, min: 6, max: 12 },
  { name: 'Washing machine', gpm: 2.4, min: 8, max: 14 },
  { name: 'Bathroom sink', gpm: 1.0, min: 3, max: 7 },
]

function tickWater(d: AppData, now: number, dt: number) {
  const w = d.home.water
  if (w.valveTransitionEndsAt && now >= w.valveTransitionEndsAt) {
    if (w.valve === 'closing') {
      w.valve = 'closed'
      addEvent(d, { severity: w.status === 'leak' ? 'success' : 'info', category: 'water', scope: 'home', title: 'Main water valve closed', detail: w.status === 'leak' ? 'Water supply isolated — leak contained' : 'Valve closed' })
    } else if (w.valve === 'opening') {
      w.valve = 'open'
      addEvent(d, { severity: 'info', category: 'water', scope: 'home', title: 'Main water valve open', detail: 'Water supply restored' })
    }
    w.valveTransitionEndsAt = null
  }
  if (w.activeFixture && now >= w.activeFixture.endsAt) w.activeFixture = null
  if (!w.activeFixture && w.valve === 'open' && w.status !== 'leak' && chance(0.05)) {
    const f = pick(FIXTURES)
    w.activeFixture = { name: f.name, gpm: f.gpm, endsAt: now + randInt(f.min, f.max) * 1000 }
  }
  let demand = w.activeFixture ? w.activeFixture.gpm + rand(-0.08, 0.08) : 0
  if (w.scenario === 'burst-pipe') demand += rand(8.6, 10.4)
  if (w.scenario === 'slow-leak') demand += rand(0.35, 0.5)
  let factor = 0
  if (w.valve === 'open') factor = 1
  if (w.valve === 'closing' && w.valveTransitionEndsAt) factor = Math.max(0, (w.valveTransitionEndsAt - now) / (DEMO.valveTravelSeconds * 1000))
  if (w.valve === 'opening' && w.valveTransitionEndsAt) factor = 1 - Math.max(0, (w.valveTransitionEndsAt - now) / (DEMO.valveTravelSeconds * 1000))
  const flow = Math.max(0, round(demand * factor, 2))
  w.flowGpm = flow
  const targetPressure = w.valve === 'closed' ? 0 : w.valve === 'closing' ? 20 : 61 - flow * 2.3 + rand(-0.6, 0.6)
  w.pressurePsi = round(w.pressurePsi + (targetPressure - w.pressurePsi) * 0.55, 1)
  const gallons = (flow * dt) / 60
  w.todayGallons = round(w.todayGallons + gallons, 2)
  w.monthGallons = round(w.monthGallons + gallons, 2)
  const today = w.dailyUsage[w.dailyUsage.length - 1]
  if (today) today.gallons = Math.round(w.todayGallons)
  w.history.push({ t: now, gpm: flow })
  if (w.history.length > 120) w.history.splice(0, w.history.length - 120)
  if (flow > 0.05) w.continuousFlowMinutes = round(w.continuousFlowMinutes + dt * DEMO.simMinutesPerSecond, 1)
  else w.continuousFlowMinutes = 0
  if (flow > w.settings.maxFlowGpm) w.highFlowSeconds += dt
  else w.highFlowSeconds = 0
  if (w.status === 'leak') return
  const wet = w.leakSensors.find((s) => s.wet)
  if (wet) {
    triggerLeak(d, `Water detected by the ${wet.name.toLowerCase()} sensor (${wet.location})`, now)
    return
  }
  if (w.highFlowSeconds >= DEMO.highFlowSecondsToTrigger) {
    triggerLeak(d, `Abnormal flow rate of ${flow.toFixed(1)} GPM (limit ${w.settings.maxFlowGpm} GPM) — possible burst pipe`, now)
    return
  }
  if (w.continuousFlowMinutes >= w.settings.maxContinuousMinutes) {
    triggerLeak(d, `Water running continuously for ${Math.round(w.continuousFlowMinutes)} min (limit ${w.settings.maxContinuousMinutes} min) — possible hidden leak`, now)
    return
  }
  const warning = w.continuousFlowMinutes >= w.settings.maxContinuousMinutes * 0.7
  if (warning && w.status === 'normal') {
    addEvent(d, { severity: 'warning', category: 'water', scope: 'home', title: 'Unusual continuous flow', detail: `Water has been running for ${Math.round(w.continuousFlowMinutes)} min` })
  }
  w.status = warning ? 'warning' : 'normal'
}

function triggerAlarm(d: AppData, source: string, now: number) {
  const s = d.home.security
  s.status = 'alarm'
  s.deadline = null
  s.triggeredBy = source
  s.monitoringNotified = true
  s.lastChangedAt = now
  for (const c of d.home.cameras) c.recording = true
  for (const l of d.home.lights) {
    if (l.outdoor || l.roomId === 'entry' || l.roomId === 'living') {
      l.on = true
      l.brightness = 100
    }
  }
  addEvent(d, { severity: 'critical', category: 'security', scope: 'home', title: 'ALARM — intrusion detected', detail: `${source} · Central station notified, siren on` })
  addEvent(d, { severity: 'critical', category: 'security', scope: 'ops', title: `Alarm triggered at ${d.home.unit}`, detail: `${source} · monitoring center dispatched`, propertyId: d.home.propertyId, unit: d.home.unit })
  raiseAlert(d, {
    kind: 'intrusion',
    title: 'Intrusion alarm',
    message: `${source} was opened while the system was armed. The siren is on, all cameras are recording and the monitoring center has been notified. Enter your PIN to disarm.`,
  })
}

export function perimeterBreach(d: AppData, source: string, entryPoint: boolean) {
  const s = d.home.security
  const now = Date.now()
  if (s.status !== 'armed') return
  if (entryPoint) {
    s.status = 'entry-delay'
    s.deadline = now + DEMO.entryDelaySeconds * 1000
    s.triggeredBy = source
    s.lastChangedAt = now
    addEvent(d, { severity: 'warning', category: 'security', scope: 'home', title: 'Entry delay started', detail: `${source} opened — disarm within ${DEMO.entryDelaySeconds}s` })
    addToast(d, { scope: 'home', severity: 'warning', title: 'Entry delay — disarm now', message: `${source} opened while armed. Enter your PIN within ${DEMO.entryDelaySeconds} seconds.` })
  } else {
    triggerAlarm(d, source, now)
  }
}

export function armSecurity(d: AppData, mode: Exclude<SecurityMode, 'disarmed'>) {
  const s = d.home.security
  const now = Date.now()
  const openSensors = [...d.home.windows.filter((w) => w.open).map((w) => w.name), ...d.home.doors.filter((x) => x.open && x.kind === 'lock').map((x) => x.name)]
  s.mode = mode
  s.triggeredBy = null
  s.monitoringNotified = false
  s.lastChangedAt = now
  if (mode === 'away') {
    s.status = 'arming'
    s.deadline = now + DEMO.exitDelaySeconds * 1000
    if (automationEnabled(d, 'away-lockdown')) runAwayLockdown(d)
  } else {
    s.status = 'armed'
    s.deadline = null
  }
  addEvent(d, {
    severity: 'info',
    category: 'security',
    scope: 'home',
    title: mode === 'away' ? `Arming Away — exit delay ${DEMO.exitDelaySeconds}s` : 'Alarm armed · Home',
    detail: openSensors.length ? `Bypassed open sensors: ${openSensors.join(', ')}` : 'All sensors secure',
  })
  if (openSensors.length) addToast(d, { scope: 'home', severity: 'warning', title: 'Armed with open sensors', message: `${openSensors.join(', ')} ${openSensors.length > 1 ? 'are' : 'is'} open and was bypassed.` })
}

function runAwayLockdown(d: AppData) {
  const now = Date.now()
  for (const door of d.home.doors) {
    if (door.kind === 'lock') door.locked = true
    if (door.kind === 'garage' && (door.open || door.moving === 'opening')) {
      door.moving = 'closing'
      door.movingEndsAt = now + DEMO.garageTravelSeconds * 1000
    }
  }
  for (const l of d.home.lights) if (!l.outdoor) l.on = false
  for (const c of d.home.cameras) c.recording = true
  markAutomationRun(d, 'away-lockdown')
  addEvent(d, { severity: 'info', category: 'automation', scope: 'home', title: 'Away lockdown ran', detail: 'Doors locked, garage closing, lights off, cameras recording' })
}

export function disarmSecurity(d: AppData, pin: string): boolean {
  if (pin !== d.settings.demoPin) {
    addEvent(d, { severity: 'warning', category: 'security', scope: 'home', title: 'Wrong PIN entered', detail: 'Keypad' })
    return false
  }
  const s = d.home.security
  const wasAlarm = s.status === 'alarm'
  s.mode = 'disarmed'
  s.status = 'ready'
  s.deadline = null
  s.triggeredBy = null
  s.monitoringNotified = false
  s.lastChangedAt = Date.now()
  for (const c of d.home.cameras) if (!c.outdoor) c.recording = false
  if (d.alert?.kind === 'intrusion') d.alert = null
  addEvent(d, { severity: wasAlarm ? 'success' : 'info', category: 'security', scope: 'home', title: wasAlarm ? 'Alarm silenced & disarmed' : 'Alarm disarmed', detail: 'PIN accepted' })
  return true
}

function tickSecurity(d: AppData, now: number) {
  const s = d.home.security
  if (s.status === 'arming' && s.deadline && now >= s.deadline) {
    s.status = 'armed'
    s.deadline = null
    addEvent(d, { severity: 'success', category: 'security', scope: 'home', title: 'Alarm armed · Away', detail: 'Exit delay complete — all zones active' })
  }
  if (s.status === 'entry-delay' && s.deadline && now >= s.deadline) {
    triggerAlarm(d, s.triggeredBy ?? 'Entry door', now)
  }
}

export function setDoorOpen(d: AppData, doorId: string, open: boolean) {
  const door = d.home.doors.find((x) => x.id === doorId)
  if (!door) return
  door.open = open
  if (open) {
    door.locked = false
    addEvent(d, { severity: 'info', category: 'access', scope: 'home', title: `${door.name} opened` })
    perimeterBreach(d, door.name, door.entryPoint)
  }
}

export function setWindowOpen(d: AppData, id: string, open: boolean) {
  const w = d.home.windows.find((x) => x.id === id)
  if (!w) return
  w.open = open
  addEvent(d, { severity: 'info', category: 'security', scope: 'home', title: `${w.name} ${open ? 'opened' : 'closed'}` })
  if (open) perimeterBreach(d, w.name, false)
}

export function moveGarage(d: AppData, doorId: string, open: boolean) {
  const door = d.home.doors.find((x) => x.id === doorId)
  if (!door || door.kind !== 'garage') return
  door.moving = open ? 'opening' : 'closing'
  door.movingEndsAt = Date.now() + DEMO.garageTravelSeconds * 1000
  addEvent(d, { severity: 'info', category: 'access', scope: 'home', title: `${door.name} ${open ? 'opening' : 'closing'}`, detail: 'From the app' })
  if (open) perimeterBreach(d, door.name, true)
}

function tickDoors(d: AppData, now: number) {
  for (const door of d.home.doors) {
    if (door.moving && door.movingEndsAt && now >= door.movingEndsAt) {
      door.open = door.moving === 'opening'
      door.moving = null
      door.movingEndsAt = null
      addEvent(d, { severity: 'info', category: 'access', scope: 'home', title: `${door.name} ${door.open ? 'open' : 'closed'}` })
    }
  }
}

function tickClimate(d: AppData, dt: number) {
  const t = d.home.thermostat
  const outdoor = 86
  let delta = 0
  if (t.mode === 'off') delta = (outdoor - t.current) * 0.002
  else if (t.mode === 'cool') delta = t.current > t.target ? -0.04 : (outdoor - t.current) * 0.001
  else if (t.mode === 'heat') delta = t.current < t.target ? 0.04 : -0.005
  else delta = Math.sign(t.target - t.current) * 0.03
  if (Math.abs(t.target - t.current) < 0.05 && t.mode !== 'off') delta = 0
  t.current = round(t.current + delta * dt, 2)
  t.humidity = Math.round(Math.min(65, Math.max(40, t.humidity + rand(-0.3, 0.3))))
}

function tickNetwork(d: AppData, now: number) {
  const n = d.home.network
  const ont = d.ops.onts.find((o) => o.id === n.ontId)
  if (n.status === 'online' || n.status === 'degraded') {
    const base = n.status === 'online' ? -19.4 : -28.3
    n.rxPowerDbm = round(base + rand(-0.15, 0.15), 1)
    const activeClients = n.clients.filter((c) => c.mbps > 0)
    for (const c of n.clients) {
      if (c.kind === 'iot') continue
      if (chance(0.08)) c.mbps = chance(0.35) ? 0 : Math.round(rand(2, c.kind === 'tv' ? 40 : c.kind === 'laptop' ? 90 : 20))
    }
    const demand = n.clients.reduce((sum, c) => sum + c.mbps, 0)
    const cap = n.status === 'degraded' ? 60 : n.planDownMbps
    n.downMbps = Math.round(Math.min(cap, demand * rand(0.9, 1.1)))
    n.upMbps = Math.round(Math.min(n.status === 'degraded' ? 20 : n.planUpMbps, demand * rand(0.12, 0.2) + activeClients.length))
    n.latencyMs = n.status === 'online' ? randInt(3, 6) : randInt(18, 46)
    n.packetLoss = n.status === 'online' ? 0 : round(rand(0.8, 3.2), 1)
    if (ont) {
      ont.status = n.status
      ont.rxPowerDbm = n.rxPowerDbm
    }
  } else {
    n.rxPowerDbm = null
    n.downMbps = 0
    n.upMbps = 0
    n.latencyMs = 0
    n.packetLoss = 100
  }
  const st = n.speedTest
  if (st.running && st.startedAt && now - st.startedAt >= DEMO.speedTestSeconds * 1000) {
    st.running = false
    st.startedAt = null
    const degraded = n.status === 'degraded'
    st.result = {
      down: degraded ? randInt(150, 260) : Math.round(n.planDownMbps * rand(0.93, 0.95)),
      up: degraded ? randInt(40, 90) : Math.round(n.planUpMbps * rand(0.91, 0.94)),
      latency: degraded ? randInt(22, 40) : randInt(2, 4),
      at: now,
    }
    addEvent(d, { severity: degraded ? 'warning' : 'success', category: 'network', scope: 'home', title: 'Speed test complete', detail: `${st.result.down} Mbps down · ${st.result.up} Mbps up · ${st.result.latency} ms` })
  }
}

const OPS_AMBIENT = [
  (d: AppData) => {
    const ont = pick(d.ops.onts.filter((o) => o.status === 'online'))
    if (!ont || ont.rxPowerDbm === null) return
    const reading = round(ont.rxPowerDbm + rand(-0.3, 0.3), 1)
    ont.lastTestAt = Date.now()
    d.ops.lightLevels.unshift({ id: uid('ll'), ontId: ont.id, point: 'ONT', dbm: reading, at: Date.now(), pass: reading > -27, by: 'Remote poll' })
    if (d.ops.lightLevels.length > 80) d.ops.lightLevels.length = 80
    addEvent(d, { severity: 'info', category: 'maintenance', scope: 'ops', title: 'Remote light-level check passed', detail: `${propertyName(d, ont.propertyId)} ${ont.unit} · ${reading} dBm`, propertyId: ont.propertyId })
  },
  (d: AppData) => {
    const olt = pick(d.ops.olts)
    addEvent(d, { severity: 'info', category: 'network', scope: 'ops', title: `${olt.name} PON utilization ${randInt(28, 61)}%`, detail: `${olt.location} · no alarms` })
  },
  (d: AppData) => {
    const prop = pick(d.ops.properties)
    addEvent(d, { severity: 'success', category: 'system', scope: 'ops', title: 'Resident completed app onboarding', detail: prop.name, propertyId: prop.id })
  },
]

function tickAmbient(d: AppData, now: number) {
  if (d.home.security.mode !== 'away' && chance(0.05)) {
    const m = pick(d.home.motion.filter((x) => x.id !== 'm-garage'))
    m.lastMotionAt = now
    if (m.roomId === 'living') {
      const cam = d.home.cameras.find((c) => c.id === 'c-living')
      if (cam) cam.lastMotionAt = now
    }
  }
  if (chance(0.02)) {
    const cam = pick(d.home.cameras.filter((c) => c.outdoor))
    cam.lastMotionAt = now
  }
  if (chance(1 / 35)) pick(OPS_AMBIENT)(d)
}

export function tick(d: AppData, now = Date.now()) {
  const dt = Math.min(5, Math.max(0.2, (now - d.sim.lastTickAt) / 1000))
  d.sim.lastTickAt = now
  d.sim.tickCount += 1
  tickWater(d, now, dt)
  tickSecurity(d, now)
  tickDoors(d, now)
  tickClimate(d, dt)
  tickNetwork(d, now)
  tickAmbient(d, now)
}

export function runScenario(d: AppData, key: ScenarioKey) {
  const now = Date.now()
  const w = d.home.water
  const partner = getPartner(d.settings.partnerId)
  switch (key) {
    case 'burst-pipe': {
      if (w.valve !== 'open') setValve(d, true)
      w.scenario = 'burst-pipe'
      addEvent(d, { severity: 'warning', category: 'system', scope: 'home', title: 'Simulation: burst pipe', detail: 'Flow sensor will read ~9–10 GPM' })
      break
    }
    case 'slow-leak': {
      if (w.valve !== 'open') setValve(d, true)
      w.scenario = 'slow-leak'
      addEvent(d, { severity: 'warning', category: 'system', scope: 'home', title: 'Simulation: hidden slow leak', detail: 'Constant ~0.4 GPM flow (running toilet / slab leak)' })
      break
    }
    case 'sensor-wet': {
      const sensor = w.leakSensors.find((s) => s.id === 'ls-heater') ?? w.leakSensors[0]
      sensor.wet = true
      addEvent(d, { severity: 'warning', category: 'system', scope: 'home', title: `Simulation: water under ${sensor.name.toLowerCase()}` })
      break
    }
    case 'intrusion': {
      if (d.home.security.status === 'ready') {
        armSecurity(d, 'away')
        d.home.security.status = 'armed'
        d.home.security.deadline = null
      }
      setWindowOpen(d, 'w-slider', true)
      break
    }
    case 'entry-door': {
      if (d.home.security.status === 'ready') {
        armSecurity(d, 'away')
        d.home.security.status = 'armed'
        d.home.security.deadline = null
      }
      setDoorOpen(d, 'd-front', true)
      break
    }
    case 'fiber-cut': {
      const demoOnt = d.ops.onts.find((o) => o.id === DEMO_ONT_ID)
      if (!demoOnt || d.home.network.status === 'los') return
      const splitter = d.ops.splitters.find((s) => s.id === demoOnt.splitterId)
      const affected = d.ops.onts.filter((o) => o.splitterId === demoOnt.splitterId)
      for (const o of affected) {
        o.status = 'los'
        o.rxPowerDbm = null
      }
      const n = d.home.network
      n.status = 'los'
      n.rxPowerDbm = null
      n.speedTest.running = false
      if (automationEnabled(d, 'outage-backup')) {
        n.backupActive = true
        markAutomationRun(d, 'outage-backup')
        addEvent(d, { severity: 'warning', category: 'automation', scope: 'home', title: 'Hub switched to LTE backup', detail: 'Alarm, cameras and leak protection remain online' })
      }
      const tech = bestTechnicianFor(d, 'emergency')
      const wo = createWorkOrder(d, {
        type: 'emergency',
        priority: 'P1',
        title: `Fiber cut — ${splitter?.name ?? 'splitter'} · ${affected.length} homes down`,
        description: `PON alarm: loss of signal on ${affected.length} ONTs downstream of ${splitter?.name} (${splitter?.cabinet}). Pattern indicates a distribution cable cut between the pedestal and the drops. Locate with OTDR, splice, test and document.`,
        propertyId: demoOnt.propertyId,
        splitterId: demoOnt.splitterId,
        source: 'Auto-detect',
        incident: 'fiber-cut',
        assigneeId: tech?.id ?? null,
      })
      addEvent(d, { severity: 'critical', category: 'network', scope: 'ops', title: `PON alarm — LOS on ${affected.length} ONTs`, detail: `${splitter?.name} · ${propertyName(d, demoOnt.propertyId)} · ${wo.number} auto-dispatched${tech ? ` to ${tech.name}` : ''}`, propertyId: demoOnt.propertyId })
      addEvent(d, { severity: 'critical', category: 'network', scope: 'home', title: 'Internet outage — fiber signal lost', detail: `${partner.short} fiber down in your area · technician dispatched` })
      raiseAlert(d, {
        kind: 'outage',
        title: 'Internet outage in your area',
        message: `We lost the fiber signal to your home and ${affected.length - 1} neighbors. ${tech ? `${tech.name} has been dispatched (${wo.number}).` : `${wo.number} has been opened.`} Your alarm, cameras and leak protection stay online through the hub's LTE backup.`,
      })
      addToast(d, { scope: 'ops', severity: 'critical', title: `P1 emergency ${wo.number}`, message: `Fiber cut at ${propertyName(d, demoOnt.propertyId)} — ${affected.length} homes down` })
      break
    }
    case 'signal-degradation': {
      const n = d.home.network
      if (n.status !== 'online') return
      n.status = 'degraded'
      const ont = d.ops.onts.find((o) => o.id === DEMO_ONT_ID)
      if (ont) ont.status = 'degraded'
      const wo = createWorkOrder(d, {
        type: 'trouble',
        priority: 'P2',
        title: `Low light level — ${d.home.unit}`,
        description: 'ONT receive power dropped below -27 dBm (threshold). Likely dirty/damaged connector or bent drop. Clean, re-terminate and verify light levels.',
        propertyId: d.home.propertyId,
        unit: d.home.unit,
        ontId: DEMO_ONT_ID,
        source: 'Auto-detect',
        incident: 'signal-degradation',
      })
      addEvent(d, { severity: 'warning', category: 'network', scope: 'ops', title: `Low light on ONT — ${d.home.unit}`, detail: `-28.3 dBm · ${wo.number} created`, propertyId: d.home.propertyId })
      addEvent(d, { severity: 'warning', category: 'network', scope: 'home', title: 'Connection degraded', detail: 'Weak fiber signal detected — a technician visit is being scheduled' })
      addToast(d, { scope: 'home', severity: 'warning', title: 'Weak fiber signal detected', message: `${wo.number} opened automatically. We'll fix it before you notice.` })
      break
    }
    case 'install-request': {
      createResidentRequest(d, {
        kind: 'install',
        title: 'Add 2 outdoor cameras + smart blinds',
        description: 'Would like cameras covering the side yard and pool gate, plus motorized blinds in the living room.',
        preferredDate: now + 2 * 24 * HOUR,
      })
      break
    }
    case 'isp-trouble-ticket': {
      const candidates = d.ops.onts.filter((o) => o.status === 'online' && !o.isDemoHome)
      const ont = pick(candidates)
      const issue = pick(['Intermittent drops reported by resident', 'ONT rebooting repeatedly', 'Slow speeds — suspected dirty connector', 'No sync after power outage'])
      const wo = createWorkOrder(d, {
        type: 'trouble',
        priority: 'P2',
        title: `${issue} — ${ont.unit}`,
        description: `${partner.short} NOC ticket #${randInt(480000, 499999)}. ${issue}. Diagnose ONT, drop, splitter and cabinet.`,
        propertyId: ont.propertyId,
        unit: ont.unit,
        ontId: ont.id,
        source: 'ISP Dispatch',
      })
      addEvent(d, { severity: 'warning', category: 'work-order', scope: 'ops', title: `New ${partner.short} trouble ticket ${wo.number}`, detail: `${propertyName(d, ont.propertyId)} · ${ont.unit}`, propertyId: ont.propertyId })
      addToast(d, { scope: 'ops', severity: 'info', title: `${partner.short} dispatched ${wo.number}`, message: `${issue} — ${propertyName(d, ont.propertyId)} ${ont.unit}` })
      break
    }
  }
}

export interface ResidentRequest {
  kind: 'support' | 'install'
  title: string
  description: string
  preferredDate?: number
  package?: SmartPackage
}

export function createResidentRequest(d: AppData, req: ResidentRequest): WorkOrder {
  const wo = createWorkOrder(d, {
    type: req.kind,
    priority: req.kind === 'install' ? 'P3' : 'P2',
    title: `${req.title} — ${d.home.unit}`,
    description: req.description,
    propertyId: d.home.propertyId,
    unit: d.home.unit,
    ontId: DEMO_ONT_ID,
    source: 'Resident',
    scheduledFor: req.preferredDate,
    package: req.package,
  })
  addEvent(d, { severity: 'info', category: 'work-order', scope: 'home', title: req.kind === 'install' ? 'Installation request sent' : 'Support request sent', detail: `${wo.number} · ${req.title}` })
  addEvent(d, { severity: 'info', category: 'work-order', scope: 'ops', title: `New resident ${req.kind === 'install' ? 'install' : 'support'} request ${wo.number}`, detail: `${d.home.residentName} · ${d.home.unit}`, propertyId: d.home.propertyId, unit: d.home.unit })
  addToast(d, { scope: 'home', severity: 'success', title: `${wo.number} created`, message: req.kind === 'install' ? 'Our team will confirm your installation slot shortly.' : 'A technician will reach out shortly.' })
  return wo
}
