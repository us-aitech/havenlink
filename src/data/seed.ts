import { getPartner } from '@/config'
import { SLA_HOURS, WORKFLOWS } from '@/lib/workflows'
import type {
  ActivityEvent,
  AppData,
  Asset,
  AssetKind,
  Automation,
  ConnectedClient,
  FlowSample,
  HomeState,
  LightLevelReading,
  Olt,
  Ont,
  OpsState,
  PartnerId,
  Priority,
  Property,
  Splitter,
  Technician,
  WorkOrder,
  WorkOrderSource,
  WorkOrderType,
} from '@/types'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const rng = seeded(20260930)
const r = (min: number, max: number) => min + rng() * (max - min)
const ri = (min: number, max: number) => Math.floor(r(min, max + 1))
const pickR = <T,>(items: readonly T[]): T => items[Math.floor(rng() * items.length)]
const hex = (len: number) => Array.from({ length: len }, () => '0123456789ABCDEF'[ri(0, 15)]).join('')

const FIRST = ['James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia', 'David', 'Jennifer', 'Carlos', 'Elizabeth', 'Daniel', 'Susan', 'Kevin', 'Jessica', 'Brian', 'Karen', 'Anthony', 'Nancy', 'Mark', 'Lisa', 'Steven', 'Ashley', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Ryan', 'Laura', 'Jose', 'Rachel', 'Eric', 'Olivia', 'Tyler', 'Sofia']
const LAST = ['Johnson', 'Williams', 'Brown', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill']

const residentName = () => `${pickR(FIRST)} ${pickR(LAST)}`

export const DEMO_PROPERTY_ID = 'p-palm-cove'
export const DEMO_ONT_ID = 'ont-demo'
export const DEMO_UNIT = '1420 Palm Cove Dr'
export const DEMO_RESIDENT = 'Sarah Mitchell'

function buildFlowHistory(now: number): FlowSample[] {
  return Array.from({ length: 120 }, (_, i) => {
    const t = now - (120 - i) * 1000
    const inUse = i > 30 && i < 48 ? 2.1 : i > 84 && i < 92 ? 1.4 : 0
    return { t, gpm: inUse ? Math.round((inUse + r(-0.1, 0.1)) * 100) / 100 : 0 }
  })
}

function buildClients(): ConnectedClient[] {
  return [
    { id: 'cl-1', name: "Sarah's iPhone", kind: 'phone', nodeId: 'mn-living', mbps: 12 },
    { id: 'cl-2', name: "David's Pixel", kind: 'phone', nodeId: 'mn-primary', mbps: 4 },
    { id: 'cl-3', name: 'MacBook Pro', kind: 'laptop', nodeId: 'mn-living', mbps: 48 },
    { id: 'cl-4', name: 'Work laptop', kind: 'laptop', nodeId: 'mn-living', mbps: 22 },
    { id: 'cl-5', name: 'Living room TV', kind: 'tv', nodeId: 'mn-living', mbps: 25 },
    { id: 'cl-6', name: 'Bedroom TV', kind: 'tv', nodeId: 'mn-primary', mbps: 0 },
    { id: 'cl-7', name: 'iPad', kind: 'tablet', nodeId: 'mn-primary', mbps: 3 },
    { id: 'cl-8', name: 'PlayStation 5', kind: 'console', nodeId: 'mn-living', mbps: 0 },
    { id: 'cl-9', name: 'HavenLink Hub', kind: 'iot', nodeId: 'mn-living', mbps: 1 },
    { id: 'cl-10', name: 'Doorbell camera', kind: 'iot', nodeId: 'mn-living', mbps: 2 },
    { id: 'cl-11', name: 'Driveway camera', kind: 'iot', nodeId: 'mn-garage', mbps: 2 },
    { id: 'cl-12', name: 'Backyard camera', kind: 'iot', nodeId: 'mn-garage', mbps: 2 },
    { id: 'cl-13', name: 'Water valve controller', kind: 'iot', nodeId: 'mn-garage', mbps: 0 },
    { id: 'cl-14', name: 'Thermostat', kind: 'iot', nodeId: 'mn-living', mbps: 0 },
  ]
}

const AUTOMATIONS: Automation[] = [
  {
    id: 'leak-shutoff',
    name: 'Leak protection',
    trigger: 'Leak sensor wet, abnormal flow rate or continuous flow',
    actions: ['Close main water valve', 'Sound alert on hub + push to residents', 'Notify field-services team'],
    enabled: true,
    lastRunAt: null,
    critical: true,
  },
  {
    id: 'outage-backup',
    name: 'Internet outage failover',
    trigger: 'Fiber signal lost (ONT LOS)',
    actions: ['Switch hub to LTE backup', 'Keep alarm & leak protection online', 'Auto-open trouble ticket'],
    enabled: true,
    lastRunAt: null,
    critical: true,
  },
  {
    id: 'away-lockdown',
    name: 'Away lockdown',
    trigger: 'Alarm armed in Away mode',
    actions: ['Lock all doors', 'Close garage door', 'Turn off interior lights', 'Cameras start recording'],
    enabled: true,
    lastRunAt: null,
    critical: false,
  },
  {
    id: 'sunset-porch',
    name: 'Sunset porch lights',
    trigger: 'Sunset · 7:21 PM',
    actions: ['Porch lights on at 80%', 'Landscape lights on'],
    enabled: true,
    lastRunAt: null,
    critical: false,
  },
  {
    id: 'motion-hallway',
    name: 'Night hallway light',
    trigger: 'Hallway motion between 11 PM and 6 AM',
    actions: ['Hallway light at 20% for 3 minutes'],
    enabled: true,
    lastRunAt: null,
    critical: false,
  },
  {
    id: 'night-check',
    name: 'Good-night check',
    trigger: 'Every day at 11:00 PM',
    actions: ['Verify all doors are locked', 'Arm alarm in Home mode', 'Notify if a window is open'],
    enabled: false,
    lastRunAt: null,
    critical: false,
  },
]

export function createHome(now: number, partnerId: PartnerId): HomeState {
  const partner = getPartner(partnerId)
  return {
    residentName: DEMO_RESIDENT,
    address: `${DEMO_UNIT}, Harbour Heights, FL 33983`,
    propertyId: DEMO_PROPERTY_ID,
    unit: DEMO_UNIT,
    rooms: [
      { id: 'living', name: 'Living Room', icon: 'sofa' },
      { id: 'kitchen', name: 'Kitchen', icon: 'chef' },
      { id: 'primary', name: 'Primary Suite', icon: 'bed' },
      { id: 'office', name: 'Office', icon: 'monitor' },
      { id: 'bath', name: 'Bathrooms', icon: 'bath' },
      { id: 'entry', name: 'Entry & Hall', icon: 'door' },
      { id: 'laundry', name: 'Laundry', icon: 'shirt' },
      { id: 'garage', name: 'Garage', icon: 'car' },
      { id: 'outdoor', name: 'Outdoor & Lanai', icon: 'tree' },
    ],
    lights: [
      { id: 'l-living-main', name: 'Ceiling lights', roomId: 'living', on: true, brightness: 80 },
      { id: 'l-living-lamp', name: 'Floor lamp', roomId: 'living', on: true, brightness: 45 },
      { id: 'l-kitchen-main', name: 'Recessed lights', roomId: 'kitchen', on: true, brightness: 100 },
      { id: 'l-kitchen-island', name: 'Island pendants', roomId: 'kitchen', on: false, brightness: 70 },
      { id: 'l-primary-main', name: 'Ceiling fan light', roomId: 'primary', on: false, brightness: 60 },
      { id: 'l-primary-bedside', name: 'Bedside lamps', roomId: 'primary', on: false, brightness: 30 },
      { id: 'l-office', name: 'Desk light', roomId: 'office', on: true, brightness: 90 },
      { id: 'l-bath', name: 'Vanity lights', roomId: 'bath', on: false, brightness: 100 },
      { id: 'l-hallway', name: 'Hallway', roomId: 'entry', on: false, brightness: 50 },
      { id: 'l-foyer', name: 'Foyer chandelier', roomId: 'entry', on: false, brightness: 70 },
      { id: 'l-laundry', name: 'Laundry light', roomId: 'laundry', on: false, brightness: 100 },
      { id: 'l-garage', name: 'Garage lights', roomId: 'garage', on: false, brightness: 100 },
      { id: 'l-porch', name: 'Porch lights', roomId: 'outdoor', on: false, brightness: 80, outdoor: true },
      { id: 'l-landscape', name: 'Landscape lights', roomId: 'outdoor', on: false, brightness: 60, outdoor: true },
      { id: 'l-pool', name: 'Pool & lanai', roomId: 'outdoor', on: false, brightness: 75, outdoor: true },
    ],
    doors: [
      { id: 'd-front', name: 'Front door', roomId: 'entry', kind: 'lock', locked: true, open: false, moving: null, movingEndsAt: null, battery: 86, entryPoint: true },
      { id: 'd-back', name: 'Lanai door', roomId: 'outdoor', kind: 'lock', locked: true, open: false, moving: null, movingEndsAt: null, battery: 72, entryPoint: false },
      { id: 'd-garage-entry', name: 'Garage entry door', roomId: 'garage', kind: 'lock', locked: false, open: false, moving: null, movingEndsAt: null, battery: 64, entryPoint: true },
      { id: 'd-garage', name: 'Garage door', roomId: 'garage', kind: 'garage', locked: false, open: false, moving: null, movingEndsAt: null, battery: 100, entryPoint: true },
    ],
    windows: [
      { id: 'w-living', name: 'Living room windows', roomId: 'living', open: false, battery: 91 },
      { id: 'w-kitchen', name: 'Kitchen window', roomId: 'kitchen', open: false, battery: 88 },
      { id: 'w-primary', name: 'Primary bedroom window', roomId: 'primary', open: false, battery: 79 },
      { id: 'w-office', name: 'Office window', roomId: 'office', open: false, battery: 83 },
      { id: 'w-slider', name: 'Lanai sliding door', roomId: 'outdoor', open: false, battery: 94 },
    ],
    motion: [
      { id: 'm-living', name: 'Living room motion', roomId: 'living', lastMotionAt: now - 4 * MIN, battery: 77 },
      { id: 'm-hallway', name: 'Hallway motion', roomId: 'entry', lastMotionAt: now - 11 * MIN, battery: 81 },
      { id: 'm-garage', name: 'Garage motion', roomId: 'garage', lastMotionAt: now - 2 * HOUR, battery: 69 },
    ],
    cameras: [
      { id: 'c-doorbell', name: 'Doorbell', roomId: 'entry', online: true, recording: true, lastMotionAt: now - 38 * MIN, outdoor: true },
      { id: 'c-driveway', name: 'Driveway', roomId: 'outdoor', online: true, recording: true, lastMotionAt: now - 2 * HOUR, outdoor: true },
      { id: 'c-backyard', name: 'Backyard & Pool', roomId: 'outdoor', online: true, recording: true, lastMotionAt: now - 5 * HOUR, outdoor: true },
      { id: 'c-living', name: 'Living room', roomId: 'living', online: true, recording: false, lastMotionAt: now - 4 * MIN, outdoor: false },
    ],
    thermostat: { mode: 'cool', target: 74, current: 75.8, humidity: 52, fan: 'auto' },
    security: { mode: 'disarmed', status: 'ready', deadline: null, triggeredBy: null, monitoringNotified: false, lastChangedAt: now - 3 * HOUR },
    water: {
      valve: 'open',
      valveTransitionEndsAt: null,
      flowGpm: 0,
      pressurePsi: 61,
      temperatureF: 79,
      todayGallons: 86.4,
      monthGallons: 4180,
      history: buildFlowHistory(now),
      status: 'normal',
      leakCause: null,
      leakDetectedAt: null,
      continuousFlowMinutes: 0,
      highFlowSeconds: 0,
      scenario: 'none',
      activeFixture: null,
      settings: { autoShutoff: true, maxFlowGpm: 6, maxContinuousMinutes: 30, notifyOps: true },
      leakSensors: [
        { id: 'ls-kitchen', name: 'Under kitchen sink', location: 'Kitchen', wet: false, battery: 88 },
        { id: 'ls-heater', name: 'Water heater', location: 'Garage', wet: false, battery: 74 },
        { id: 'ls-laundry', name: 'Washing machine', location: 'Laundry', wet: false, battery: 91 },
        { id: 'ls-bath', name: 'Primary bathroom', location: 'Primary Suite', wet: false, battery: 66 },
        { id: 'ls-ac', name: 'A/C drain pan', location: 'Air handler closet', wet: false, battery: 83 },
      ],
      dailyUsage: [
        { day: 'Thu', gallons: 142 },
        { day: 'Fri', gallons: 168 },
        { day: 'Sat', gallons: 211 },
        { day: 'Sun', gallons: 196 },
        { day: 'Mon', gallons: 155 },
        { day: 'Tue', gallons: 149 },
        { day: 'Today', gallons: 86 },
      ],
      shutoffCount: 0,
      gallonsSaved: 0,
    },
    network: {
      ontId: DEMO_ONT_ID,
      status: 'online',
      rxPowerDbm: -19.4,
      txPowerDbm: 2.1,
      downMbps: 124,
      upMbps: 18,
      latencyMs: 4,
      packetLoss: 0,
      planName: partner.planName,
      planDownMbps: partner.down,
      planUpMbps: partner.up,
      backupActive: false,
      onlineSince: now - 18 * DAY - 5 * HOUR,
      meshNodes: [
        { id: 'mn-living', name: 'Living room (router)', online: true, clients: 8, signal: 98 },
        { id: 'mn-primary', name: 'Primary suite', online: true, clients: 3, signal: 86 },
        { id: 'mn-garage', name: 'Garage / Lanai', online: true, clients: 3, signal: 74 },
      ],
      clients: buildClients(),
      speedTest: { running: false, startedAt: null, result: { down: 941, up: 928, latency: 3, at: now - 2 * DAY } },
    },
    scenes: [
      { id: 'scene-morning', name: 'Good Morning', icon: 'sunrise', description: 'Kitchen & living lights on, disarm, 74°F' },
      { id: 'scene-away', name: 'Away', icon: 'plane', description: 'Lock up, lights off, arm Away' },
      { id: 'scene-night', name: 'Good Night', icon: 'moon', description: 'Lock doors, arm Home, lights off' },
      { id: 'scene-movie', name: 'Movie Time', icon: 'film', description: 'Dim living room, lamps at 20%' },
      { id: 'scene-home', name: "I'm Home", icon: 'home', description: 'Disarm, foyer & kitchen lights on' },
    ],
    automations: AUTOMATIONS.map((a) => ({ ...a, lastRunAt: a.id === 'sunset-porch' ? now - 20 * HOUR : a.id === 'motion-hallway' ? now - 9 * HOUR : null })),
    lastSceneId: null,
  }
}

interface PropertySeed extends Property {
  code: string
  layout: 'street' | 'floors' | 'suites'
  street?: string
  floors?: number
}

const PROPERTY_SEEDS: PropertySeed[] = [
  { id: 'p-palm-cove', code: 'PC', name: 'Palm Cove Estates', type: 'SFH Community', address: 'Palm Cove Dr', city: 'Harbour Heights, FL', units: 48, smartHomeUnits: 22, package: 'Complete', contract: 'Bulk', oltId: 'olt-pg', manager: 'Linda Parker', monthlyContract: 4800, layout: 'street', street: 'Palm Cove Dr' },
  { id: 'p-harbor-view', code: 'HV', name: 'Harbor View Apartments', type: 'MDU', address: '2100 Tamiami Trail', city: 'Punta Gorda, FL', units: 120, smartHomeUnits: 64, package: 'Secure', contract: 'Bulk', oltId: 'olt-pg', manager: 'Greystar · Tom Alvarez', monthlyContract: 9600, layout: 'floors', floors: 6 },
  { id: 'p-cape-landing', code: 'CL', name: 'Cape Landing Residences', type: 'MDU', address: '1820 SE 47th Ter', city: 'Cape Coral, FL', units: 96, smartHomeUnits: 41, package: 'Complete', contract: 'Bulk', oltId: 'olt-cc', manager: 'Bell Partners · Nina Shah', monthlyContract: 7680, layout: 'floors', floors: 4 },
  { id: 'p-riverside', code: 'RC', name: 'Riverside Commons', type: 'MDU', address: '3300 Fowler St', city: 'Fort Myers, FL', units: 144, smartHomeUnits: 52, package: 'Secure', contract: 'Bulk', oltId: 'olt-fm', manager: 'Cortland · Greg Mills', monthlyContract: 11520, layout: 'floors', floors: 12 },
  { id: 'p-gulf-breeze', code: 'GB', name: 'Gulf Breeze Townhomes', type: 'SFH Community', address: 'Gulf Breeze Blvd', city: 'Port Charlotte, FL', units: 64, smartHomeUnits: 19, package: 'Essentials', contract: 'Retail', oltId: 'olt-pg', manager: 'HOA · Carol Bennett', monthlyContract: 2400, layout: 'street', street: 'Gulf Breeze Blvd' },
  { id: 'p-lehigh', code: 'LP', name: 'Lehigh Park Plaza', type: 'Commercial', address: '1200 Lee Blvd', city: 'Lehigh Acres, FL', units: 24, smartHomeUnits: 6, package: 'Essentials', contract: 'Retail', oltId: 'olt-fm', manager: 'Sunbelt CRE · Ray Ortiz', monthlyContract: 1200, layout: 'suites' },
]

function unitLabel(p: PropertySeed, index: number): string {
  if (p.layout === 'street') return `${1400 + index * 4} ${p.street}`
  if (p.layout === 'suites') return `Suite ${100 + index + 1}`
  const perFloor = Math.ceil(p.units / (p.floors ?? 1))
  const floor = Math.floor(index / perFloor) + 1
  const n = (index % perFloor) + 1
  return `#${floor}${String(n).padStart(2, '0')}`
}

const OLTS: Olt[] = [
  { id: 'olt-pg', name: 'OLT-PG-01', location: 'Punta Gorda Central Office', ponPorts: 16, usedPorts: 11 },
  { id: 'olt-cc', name: 'OLT-CC-01', location: 'Cape Coral Hub', ponPorts: 16, usedPorts: 9 },
  { id: 'olt-fm', name: 'OLT-FM-01', location: 'Fort Myers Headend', ponPorts: 32, usedPorts: 19 },
]

function buildNetwork(now: number) {
  const splitters: Splitter[] = []
  const onts: Ont[] = []
  const properties: Property[] = []
  for (const p of PROPERTY_SEEDS) {
    const { code, layout, street, floors, ...property } = p
    void layout
    void street
    void floors
    properties.push(property)
    const secondaryCount = Math.ceil(p.units / 8)
    const primaryCount = Math.ceil(secondaryCount / 4)
    for (let pi = 0; pi < primaryCount; pi++) {
      const primaryId = `sp-${code.toLowerCase()}-p${pi + 1}`
      splitters.push({
        id: primaryId,
        name: `SP-${code}-P${pi + 1}`,
        oltId: p.oltId,
        parentId: null,
        ratio: '1:4',
        cabinet: p.type === 'MDU' ? `MDF-${code}` : `CAB-${code}-0${pi + 1}`,
        propertyId: p.id,
        lossDb: 7.2,
      })
      for (let si = 0; si < 4; si++) {
        const secondaryIndex = pi * 4 + si
        if (secondaryIndex >= secondaryCount) break
        const letter = String.fromCharCode(65 + si)
        const secondaryId = `sp-${code.toLowerCase()}-${pi + 1}${letter.toLowerCase()}`
        splitters.push({
          id: secondaryId,
          name: `SP-${code}-${pi + 1}${letter}`,
          oltId: p.oltId,
          parentId: primaryId,
          ratio: '1:8',
          cabinet: p.type === 'MDU' ? `IDF-${code}-${secondaryIndex + 1}` : `PED-${code}-${String(secondaryIndex + 1).padStart(2, '0')}`,
          propertyId: p.id,
          lossDb: 10.5,
        })
        for (let oi = 0; oi < 8; oi++) {
          const unitIndex = secondaryIndex * 8 + oi
          if (unitIndex >= p.units) break
          const unit = unitLabel(p, unitIndex)
          const isDemo = p.id === DEMO_PROPERTY_ID && unit === DEMO_UNIT
          onts.push({
            id: isDemo ? DEMO_ONT_ID : `ont-${code.toLowerCase()}-${unitIndex + 1}`,
            serial: `ALCL${hex(8)}`,
            splitterId: secondaryId,
            propertyId: p.id,
            unit,
            resident: isDemo ? DEMO_RESIDENT : residentName(),
            status: 'online',
            rxPowerDbm: isDemo ? -19.4 : Math.round(r(-23.5, -14.5) * 10) / 10,
            lastTestAt: now - ri(2, 60) * DAY,
            smartHome: isDemo,
            isDemoHome: isDemo,
          })
        }
      }
    }
  }
  for (const p of properties) {
    const candidates = onts.filter((o) => o.propertyId === p.id && !o.isDemoHome)
    const needed = p.smartHomeUnits - onts.filter((o) => o.propertyId === p.id && o.smartHome).length
    for (let i = 0; i < needed && candidates.length; i++) {
      const idx = Math.floor(rng() * candidates.length)
      candidates[idx].smartHome = true
      candidates.splice(idx, 1)
    }
  }
  const degradedIds = ['ont-hv-52', 'ont-rc-88', 'ont-cl-17', 'ont-gb-22']
  const offlineIds = ['ont-rc-131', 'ont-hv-7', 'ont-lp-12']
  for (const o of onts) {
    if (degradedIds.includes(o.id)) {
      o.status = 'degraded'
      o.rxPowerDbm = Math.round(r(-28.6, -27.1) * 10) / 10
    }
    if (offlineIds.includes(o.id)) {
      o.status = 'offline'
      o.rxPowerDbm = null
    }
  }
  return { splitters, onts, properties }
}

const TECHNICIANS: Technician[] = [
  { id: 't-marcus', name: 'Marcus Reed', initials: 'MR', status: 'on-site', skills: ['Fiber splicing', 'OTDR', 'GPON'], zone: 'Charlotte County', activeWorkOrderId: 'wo-1042' },
  { id: 't-ana', name: 'Ana Souza', initials: 'AS', status: 'en-route', skills: ['Smart-home', 'Mesh WiFi', 'Cameras'], zone: 'Lee County', activeWorkOrderId: 'wo-1045' },
  { id: 't-derek', name: 'Derek Chen', initials: 'DC', status: 'available', skills: ['Aerial fiber', 'Underground', 'Cabinets'], zone: 'Charlotte County', activeWorkOrderId: null },
  { id: 't-luis', name: 'Luis Ortega', initials: 'LO', status: 'on-site', skills: ['Smart-home', 'Access control', 'Locks'], zone: 'Charlotte County', activeWorkOrderId: 'wo-1047' },
  { id: 't-jamal', name: 'Jamal Wright', initials: 'JW', status: 'available', skills: ['GPON', 'ONT', 'Splicing'], zone: 'Charlotte County', activeWorkOrderId: null },
  { id: 't-priya', name: 'Priya Nair', initials: 'PN', status: 'off-duty', skills: ['Mesh WiFi', 'Resident support', 'App onboarding'], zone: 'Lee County', activeWorkOrderId: null },
]

function buildAssets(now: number, splitters: Splitter[]): Asset[] {
  const assets: Asset[] = []
  const conditions = ['good', 'good', 'good', 'fair', 'good', 'poor'] as const
  const seen = new Set<string>()
  for (const s of splitters) {
    if (seen.has(s.cabinet)) continue
    seen.add(s.cabinet)
    const prop = PROPERTY_SEEDS.find((p) => p.id === s.propertyId)
    if (!prop) continue
    const kind: AssetKind = s.cabinet.startsWith('PED') ? 'pedestal' : s.cabinet.startsWith('IDF') ? 'riser' : 'cabinet'
    if (kind === 'riser' && assets.filter((a) => a.propertyId === s.propertyId && a.kind === 'riser').length >= 3) continue
    if (kind === 'pedestal' && assets.filter((a) => a.propertyId === s.propertyId && a.kind === 'pedestal').length >= 4) continue
    assets.push({
      id: `as-${s.cabinet.toLowerCase()}`,
      kind,
      name: s.cabinet,
      propertyId: s.propertyId,
      lastInspectedAt: now - ri(10, 120) * DAY,
      condition: pickR(conditions),
    })
  }
  for (const p of PROPERTY_SEEDS) {
    assets.push({
      id: `as-slack-${p.code.toLowerCase()}`,
      kind: 'slack-storage',
      name: `SLK-${p.code}-01`,
      propertyId: p.id,
      lastInspectedAt: now - ri(20, 150) * DAY,
      condition: pickR(conditions),
    })
  }
  return assets
}

interface WoInput {
  num: number
  type: WorkOrderType
  priority: Priority
  title: string
  description: string
  propertyId: string
  unit?: string
  ontId?: string
  assetId?: string
  source: WorkOrderSource
  createdAt: number
  scheduledFor?: number
  stage: string
  assigneeId: string | null
  closedAt?: number
  package?: WorkOrder['package']
  billable: number
}

const TECH_NAMES: Record<string, string> = Object.fromEntries(TECHNICIANS.map((t) => [t.id, t.name]))

function makeWorkOrder(input: WoInput): WorkOrder {
  const stages = WORKFLOWS[input.type]
  const targetIdx = Math.max(0, stages.findIndex((s) => s.key === input.stage))
  const endAt = input.closedAt ?? input.createdAt + Math.min(Date.now() - input.createdAt, HOUR * 2)
  const span = Math.max(1, endAt - input.createdAt)
  const history = stages.slice(0, targetIdx + 1).map((s, i) => ({
    stage: s.key,
    at: i === 0 ? input.createdAt : input.createdAt + (span * i) / Math.max(1, targetIdx),
    by: i === 0 ? input.source : input.assigneeId ? TECH_NAMES[input.assigneeId] : 'Dispatch',
  }))
  const slaBase = input.scheduledFor && (input.type === 'install' || input.type === 'maintenance') ? input.scheduledFor + 4 * HOUR : input.createdAt + SLA_HOURS[input.type][input.priority] * HOUR
  return {
    id: `wo-${input.num}`,
    number: `WO-${input.num}`,
    type: input.type,
    priority: input.priority,
    title: input.title,
    description: input.description,
    propertyId: input.propertyId,
    unit: input.unit,
    ontId: input.ontId,
    assetId: input.assetId,
    source: input.source,
    createdAt: input.createdAt,
    dueAt: slaBase,
    scheduledFor: input.scheduledFor,
    stage: input.stage,
    history,
    assigneeId: input.assigneeId,
    photos: [],
    notes: [],
    closedAt: input.closedAt,
    package: input.package,
    billable: input.billable,
  }
}

const CLOSED_TEMPLATES: Array<{ type: WorkOrderType; priority: Priority; title: string; source: WorkOrderSource; billable: number }> = [
  { type: 'trouble', priority: 'P2', title: 'ONT not registering on PON', source: 'ISP Dispatch', billable: 145 },
  { type: 'trouble', priority: 'P2', title: 'Intermittent signal loss', source: 'ISP Dispatch', billable: 145 },
  { type: 'trouble', priority: 'P3', title: 'Fiber drop re-termination', source: 'ISP Dispatch', billable: 145 },
  { type: 'trouble', priority: 'P2', title: 'Splitter port degradation', source: 'ISP Dispatch', billable: 145 },
  { type: 'emergency', priority: 'P1', title: 'Cut fiber — landscaping crew', source: 'ISP Dispatch', billable: 595 },
  { type: 'emergency', priority: 'P1', title: 'Storm damage — aerial drop down', source: 'ISP Dispatch', billable: 595 },
  { type: 'maintenance', priority: 'P3', title: 'Quarterly pedestal inspection', source: 'Scheduled', billable: 0 },
  { type: 'maintenance', priority: 'P3', title: 'Light-level testing — splitter ports', source: 'Scheduled', billable: 0 },
  { type: 'maintenance', priority: 'P3', title: 'Connector cleaning & re-termination', source: 'Scheduled', billable: 0 },
  { type: 'install', priority: 'P3', title: 'Complete package install', source: 'Resident', billable: 380 },
  { type: 'install', priority: 'P3', title: 'Secure package install', source: 'Resident', billable: 290 },
  { type: 'install', priority: 'P3', title: 'Essentials package install', source: 'Property Manager', billable: 180 },
  { type: 'support', priority: 'P3', title: 'App onboarding help', source: 'Resident', billable: 0 },
  { type: 'support', priority: 'P2', title: 'Smart lock not responding', source: 'Resident', billable: 0 },
  { type: 'support', priority: 'P3', title: 'Mesh WiFi dead zone', source: 'Resident', billable: 0 },
]

function buildWorkOrders(now: number, onts: Ont[], assets: Asset[]): WorkOrder[] {
  const orders: WorkOrder[] = []
  const techIds = TECHNICIANS.map((t) => t.id)
  for (let i = 0; i < 44; i++) {
    const tpl = pickR(CLOSED_TEMPLATES)
    const ont = pickR(onts.filter((o) => !o.isDemoHome))
    const createdAt = now - r(1.5, 30) * DAY
    const sla = SLA_HOURS[tpl.type][tpl.priority] * HOUR
    const withinSla = rng() < 0.94
    const duration = withinSla ? r(0.25, 0.9) * sla : r(1.05, 1.4) * sla
    const scheduledFor = tpl.type === 'install' || tpl.type === 'maintenance' ? createdAt + r(1, 3) * DAY : undefined
    const closedAt = scheduledFor ? scheduledFor + r(1, withinSla ? 3.5 : 6) * HOUR : createdAt + duration
    if (closedAt > now) continue
    const asset = tpl.type === 'maintenance' ? pickR(assets) : undefined
    orders.push(
      makeWorkOrder({
        num: 1000 + orders.length,
        type: tpl.type,
        priority: tpl.priority,
        title: asset ? `${tpl.title} — ${asset.name}` : `${tpl.title} — ${ont.unit}`,
        description: tpl.title,
        propertyId: asset ? asset.propertyId : ont.propertyId,
        unit: asset ? undefined : ont.unit,
        ontId: asset ? undefined : ont.id,
        assetId: asset?.id,
        source: tpl.source,
        createdAt,
        scheduledFor,
        stage: 'closed',
        assigneeId: pickR(techIds),
        closedAt,
        package: tpl.type === 'install' ? (tpl.title.startsWith('Complete') ? 'Complete' : tpl.title.startsWith('Secure') ? 'Secure' : 'Essentials') : undefined,
        billable: tpl.billable,
      }),
    )
  }
  const ontById = (id: string) => onts.find((o) => o.id === id)
  const assetByName = (name: string) => assets.find((a) => a.name === name) ?? assets[0]
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const at = (days: number, hour: number) => today.getTime() + days * DAY + hour * HOUR
  const open: Array<Omit<WoInput, 'num'>> = [
    { type: 'trouble', priority: 'P2', title: `Low light level — Harbor View ${ontById('ont-hv-52')?.unit}`, description: 'ISP NOC reports Rx power below -27 dBm. Resident reports buffering during evenings. Check drop, connector and splitter port.', propertyId: 'p-harbor-view', unit: ontById('ont-hv-52')?.unit, ontId: 'ont-hv-52', source: 'ISP Dispatch', createdAt: now - 5 * HOUR, stage: 'diagnosing', assigneeId: 't-marcus', billable: 145 },
    { type: 'support', priority: 'P2', title: `Doorbell camera offline — Riverside ${ontById('ont-rc-44')?.unit}`, description: 'Resident reports doorbell camera stopped recording after power blip. Remote reboot failed.', propertyId: 'p-riverside', unit: ontById('ont-rc-44')?.unit, ontId: 'ont-rc-44', source: 'Resident', createdAt: now - 7 * HOUR, stage: 'diagnosing', assigneeId: 't-ana', billable: 0 },
    { type: 'trouble', priority: 'P2', title: `Fiber drop damage — ${ontById('ont-gb-22')?.unit}`, description: 'Irrigation contractor nicked the drop conduit. Resident on degraded signal. Replace drop and re-terminate.', propertyId: 'p-gulf-breeze', unit: ontById('ont-gb-22')?.unit, ontId: 'ont-gb-22', source: 'ISP Dispatch', createdAt: now - 70 * MIN, stage: 'assigned', assigneeId: 't-jamal', billable: 145 },
    { type: 'install', priority: 'P2', title: `Secure package install — Harbor View ${ontById('ont-hv-18')?.unit}`, description: 'Smart lock, 2 cameras, 5 door/window sensors, leak sensors and hub. Resident home all day.', propertyId: 'p-harbor-view', unit: ontById('ont-hv-18')?.unit, ontId: 'ont-hv-18', source: 'Resident', createdAt: now - 3 * DAY, scheduledFor: at(0, 9), stage: 'installing', assigneeId: 't-luis', package: 'Secure', billable: 290 },
    { type: 'install', priority: 'P3', title: `Complete package install — Cape Landing ${ontById('ont-cl-36')?.unit}`, description: 'Full Complete package including water shut-off valve, flow sensor and 4 leak sensors.', propertyId: 'p-cape-landing', unit: ontById('ont-cl-36')?.unit, ontId: 'ont-cl-36', source: 'Resident', createdAt: now - 2 * DAY, scheduledFor: at(1, 10), stage: 'scheduled', assigneeId: 't-ana', package: 'Complete', billable: 380 },
    { type: 'install', priority: 'P2', title: `Complete package install — Riverside ${ontById('ont-rc-70')?.unit}`, description: 'Hardware installed. Mesh WiFi survey and channel optimization pending.', propertyId: 'p-riverside', unit: ontById('ont-rc-70')?.unit, ontId: 'ont-rc-70', source: 'Property Manager', createdAt: now - 4 * DAY, scheduledFor: at(0, 8), stage: 'wifi', assigneeId: 't-luis', package: 'Complete', billable: 380 },
    { type: 'install', priority: 'P3', title: `Essentials package install — ${ontById('ont-gb-41')?.unit}`, description: 'Hub, 2 smart bulbs, smart lock and 2 leak sensors.', propertyId: 'p-gulf-breeze', unit: ontById('ont-gb-41')?.unit, ontId: 'ont-gb-41', source: 'Resident', createdAt: now - 1 * DAY, scheduledFor: at(3, 13), stage: 'scheduled', assigneeId: null, package: 'Essentials', billable: 180 },
    { type: 'install', priority: 'P3', title: `Secure package install — Palm Cove ${ontById('ont-pc-31')?.unit}`, description: 'Resident upgrading from Essentials to Secure. App already installed.', propertyId: 'p-palm-cove', unit: ontById('ont-pc-31')?.unit, ontId: 'ont-pc-31', source: 'Resident', createdAt: now - 5 * DAY, scheduledFor: at(-1, 14), stage: 'onboarding', assigneeId: 't-ana', package: 'Secure', billable: 290 },
    { type: 'maintenance', priority: 'P3', title: 'Quarterly cabinet inspection — MDF-RC', description: 'Inspect cabinet, verify labeling, clean connectors, check slack storage and grounding.', propertyId: 'p-riverside', assetId: assetByName('MDF-RC').id, source: 'Scheduled', createdAt: now - 10 * DAY, scheduledFor: at(2, 9), stage: 'scheduled', assigneeId: 't-derek', billable: 0 },
    { type: 'maintenance', priority: 'P3', title: 'Light-level testing — Palm Cove splitters', description: 'Measure downstream power at every splitter output and a sample of ONTs. Update as-built records.', propertyId: 'p-palm-cove', assetId: assetByName('CAB-PC-01').id, source: 'Scheduled', createdAt: now - 6 * DAY, scheduledFor: at(0, 15), stage: 'scheduled', assigneeId: 't-derek', billable: 0 },
    { type: 'maintenance', priority: 'P2', title: 'Pedestal re-seal after storm — PED-GB-03', description: 'Post-storm inspection found moisture intrusion. Re-seal, replace gel caps, verify splice tray.', propertyId: 'p-gulf-breeze', assetId: assetByName('PED-GB-03').id, source: 'Scheduled', createdAt: now - 4 * DAY, scheduledFor: at(-1, 10), stage: 'inspecting', assigneeId: 't-jamal', billable: 0 },
    { type: 'maintenance', priority: 'P3', title: 'Riser inspection — IDF-HV-2', description: 'Check riser conduit, fire-stopping, and pathway labeling.', propertyId: 'p-harbor-view', assetId: assetByName('IDF-HV-2').id, source: 'Scheduled', createdAt: now - 9 * DAY, scheduledFor: at(5, 9), stage: 'scheduled', assigneeId: null, billable: 0 },
    { type: 'support', priority: 'P3', title: `Mesh WiFi optimization — Palm Cove ${ontById('ont-pc-3')?.unit}`, description: 'Weak signal in the lanai. Resident wants coverage by the pool.', propertyId: 'p-palm-cove', unit: ontById('ont-pc-3')?.unit, ontId: 'ont-pc-3', source: 'Resident', createdAt: now - 3 * HOUR, stage: 'received', assigneeId: null, billable: 0 },
    { type: 'trouble', priority: 'P3', title: `Resident ONT offline — Riverside ${ontById('ont-rc-131')?.unit}`, description: 'ONT has been offline for 2 days. Possibly powered down by resident. Confirm and test.', propertyId: 'p-riverside', unit: ontById('ont-rc-131')?.unit, ontId: 'ont-rc-131', source: 'ISP Dispatch', createdAt: now - 26 * HOUR, stage: 'dispatched', assigneeId: null, billable: 145 },
  ]
  const startNum = 1000 + orders.length
  const openOrders = open.map((o, i) => makeWorkOrder({ ...o, num: startNum + i }))
  const renumber = (wo: WorkOrder, n: number): WorkOrder => ({ ...wo, id: `wo-${n}`, number: `WO-${n}` })
  const closedSorted = orders.sort((a, b) => a.createdAt - b.createdAt).map((wo, i) => renumber(wo, 1000 + i))
  const openNumbered = openOrders.map((wo, i) => renumber(wo, 1042 + i))
  return [...openNumbered, ...closedSorted]
}

function buildLightLevels(now: number, onts: Ont[]): LightLevelReading[] {
  return onts
    .filter((o) => o.status === 'degraded' || rng() < 0.03)
    .slice(0, 18)
    .map((o, i) => ({
      id: `ll-${i}`,
      ontId: o.id,
      point: 'ONT' as const,
      dbm: o.rxPowerDbm ?? -40,
      at: now - ri(1, 72) * HOUR,
      pass: (o.rxPowerDbm ?? -40) > -27,
      by: pickR(TECHNICIANS).name,
    }))
}

export function createOps(now: number): OpsState {
  const { splitters, onts, properties } = buildNetwork(now)
  const assets = buildAssets(now, splitters)
  const workOrders = buildWorkOrders(now, onts, assets)
  const technicians = TECHNICIANS.map((t) => {
    const active = workOrders.find((w) => w.stage !== 'closed' && w.assigneeId === t.id && (t.status === 'on-site' || t.status === 'en-route'))
    return { ...t, activeWorkOrderId: active?.id ?? null }
  })
  return {
    properties,
    olts: OLTS,
    splitters,
    onts,
    technicians,
    workOrders,
    assets,
    lightLevels: buildLightLevels(now, onts),
    revenue: [
      { month: 'Apr', retainer: 18000, troubleCalls: 7250, emergency: 2380, smartHome: 4100, bulk: 12400 },
      { month: 'May', retainer: 18000, troubleCalls: 6960, emergency: 1790, smartHome: 5200, bulk: 12800 },
      { month: 'Jun', retainer: 18000, troubleCalls: 8120, emergency: 4170, smartHome: 6300, bulk: 13300 },
      { month: 'Jul', retainer: 18000, troubleCalls: 7830, emergency: 3570, smartHome: 7400, bulk: 13900 },
      { month: 'Aug', retainer: 18000, troubleCalls: 9280, emergency: 5360, smartHome: 8900, bulk: 14500 },
      { month: 'Sep', retainer: 18000, troubleCalls: 8410, emergency: 2980, smartHome: 10200, bulk: 15100 },
    ],
    nextWorkOrderNumber: 1042 + 14,
  }
}

function seedEvents(now: number): ActivityEvent[] {
  const list: Array<Omit<ActivityEvent, 'id'>> = [
    { ts: now - 4 * MIN, severity: 'info', category: 'security', scope: 'home', title: 'Motion in living room', detail: 'Living room motion sensor' },
    { ts: now - 38 * MIN, severity: 'info', category: 'access', scope: 'home', title: 'Front door unlocked by Sarah', detail: 'Keypad code · Front door' },
    { ts: now - 39 * MIN, severity: 'info', category: 'security', scope: 'home', title: 'Alarm disarmed', detail: 'Disarmed from the HavenLink app' },
    { ts: now - 70 * MIN, severity: 'warning', category: 'work-order', scope: 'ops', title: 'New trouble ticket from ISP', detail: 'Fiber drop damage — Gulf Breeze Townhomes', propertyId: 'p-gulf-breeze' },
    { ts: now - 2 * HOUR, severity: 'success', category: 'work-order', scope: 'ops', title: 'Install completed & onboarded', detail: 'Secure package — Cape Landing Residences', propertyId: 'p-cape-landing' },
    { ts: now - 3 * HOUR, severity: 'info', category: 'security', scope: 'home', title: 'Alarm armed · Away', detail: 'Armed by Sarah · Away lockdown ran' },
    { ts: now - 5 * HOUR, severity: 'warning', category: 'network', scope: 'ops', title: 'Low light level detected', detail: 'ONT at Harbor View Apartments below -27 dBm', propertyId: 'p-harbor-view' },
    { ts: now - 9 * HOUR, severity: 'info', category: 'automation', scope: 'home', title: 'Night hallway light ran', detail: 'Hallway motion at 2:14 AM' },
    { ts: now - 20 * HOUR, severity: 'info', category: 'automation', scope: 'home', title: 'Sunset porch lights ran', detail: 'Porch & landscape lights on' },
    { ts: now - 26 * HOUR, severity: 'success', category: 'water', scope: 'home', title: 'Weekly valve exercise passed', detail: 'Main valve cycled closed/open in 2.8 s' },
  ]
  return list.map((e, i) => ({ ...e, id: `ev-seed-${i}` }))
}

export function createInitialData(partnerId: PartnerId = 'hotwire', now = Date.now()): AppData {
  return {
    settings: { partnerId, demoPin: '1234' },
    home: createHome(now, partnerId),
    ops: createOps(now),
    events: seedEvents(now),
    toasts: [],
    alert: null,
    sim: { running: true, tickCount: 0, lastTickAt: now },
  }
}

