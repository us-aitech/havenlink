export type Severity = 'info' | 'success' | 'warning' | 'critical'

export type EventCategory =
  | 'water'
  | 'security'
  | 'network'
  | 'lighting'
  | 'access'
  | 'climate'
  | 'automation'
  | 'work-order'
  | 'maintenance'
  | 'system'

export type EventScope = 'home' | 'ops' | 'both'

export interface ActivityEvent {
  id: string
  ts: number
  severity: Severity
  category: EventCategory
  scope: EventScope
  title: string
  detail?: string
  propertyId?: string
  unit?: string
}

export type RoomIcon = 'sofa' | 'chef' | 'bed' | 'bath' | 'car' | 'tree' | 'door' | 'shirt' | 'monitor'

export interface Room {
  id: string
  name: string
  icon: RoomIcon
}

export interface Light {
  id: string
  name: string
  roomId: string
  on: boolean
  brightness: number
  outdoor?: boolean
}

export type DoorKind = 'lock' | 'garage'

export interface Door {
  id: string
  name: string
  roomId: string
  kind: DoorKind
  locked: boolean
  open: boolean
  moving: 'opening' | 'closing' | null
  movingEndsAt: number | null
  battery: number
  entryPoint: boolean
}

export interface ContactSensor {
  id: string
  name: string
  roomId: string
  open: boolean
  battery: number
}

export interface MotionSensor {
  id: string
  name: string
  roomId: string
  lastMotionAt: number | null
  battery: number
}

export interface Camera {
  id: string
  name: string
  roomId: string
  online: boolean
  recording: boolean
  lastMotionAt: number | null
  outdoor: boolean
}

export type ThermostatMode = 'cool' | 'heat' | 'auto' | 'off'

export interface Thermostat {
  mode: ThermostatMode
  target: number
  current: number
  humidity: number
  fan: 'auto' | 'on'
}

export type SecurityMode = 'disarmed' | 'home' | 'away'
export type SecurityStatus = 'ready' | 'arming' | 'armed' | 'entry-delay' | 'alarm'

export interface SecurityState {
  mode: SecurityMode
  status: SecurityStatus
  deadline: number | null
  triggeredBy: string | null
  monitoringNotified: boolean
  lastChangedAt: number
}

export type ValveState = 'open' | 'closing' | 'closed' | 'opening'
export type WaterStatus = 'normal' | 'warning' | 'leak'
export type WaterScenario = 'none' | 'burst-pipe' | 'slow-leak'

export interface LeakSensor {
  id: string
  name: string
  location: string
  wet: boolean
  battery: number
}

export interface FlowSample {
  t: number
  gpm: number
}

export interface WaterFixtureUse {
  name: string
  gpm: number
  endsAt: number
}

export interface WaterSettings {
  autoShutoff: boolean
  maxFlowGpm: number
  maxContinuousMinutes: number
  notifyOps: boolean
}

export interface WaterState {
  valve: ValveState
  valveTransitionEndsAt: number | null
  flowGpm: number
  pressurePsi: number
  temperatureF: number
  todayGallons: number
  monthGallons: number
  history: FlowSample[]
  status: WaterStatus
  leakCause: string | null
  leakDetectedAt: number | null
  continuousFlowMinutes: number
  highFlowSeconds: number
  scenario: WaterScenario
  activeFixture: WaterFixtureUse | null
  settings: WaterSettings
  leakSensors: LeakSensor[]
  dailyUsage: { day: string; gallons: number }[]
  shutoffCount: number
  gallonsSaved: number
}

export type OntStatus = 'online' | 'degraded' | 'los' | 'offline'

export interface MeshNode {
  id: string
  name: string
  online: boolean
  clients: number
  signal: number
}

export type ClientKind = 'phone' | 'laptop' | 'tv' | 'iot' | 'console' | 'tablet'

export interface ConnectedClient {
  id: string
  name: string
  kind: ClientKind
  nodeId: string
  mbps: number
}

export interface SpeedTestResult {
  down: number
  up: number
  latency: number
  at: number
}

export interface HomeNetwork {
  ontId: string
  status: OntStatus
  rxPowerDbm: number | null
  txPowerDbm: number
  downMbps: number
  upMbps: number
  latencyMs: number
  packetLoss: number
  planName: string
  planDownMbps: number
  planUpMbps: number
  backupActive: boolean
  onlineSince: number
  meshNodes: MeshNode[]
  clients: ConnectedClient[]
  speedTest: {
    running: boolean
    startedAt: number | null
    result: SpeedTestResult | null
  }
}

export type SceneIcon = 'sunrise' | 'moon' | 'plane' | 'film' | 'home'

export interface Scene {
  id: string
  name: string
  icon: SceneIcon
  description: string
}

export type AutomationKey =
  | 'leak-shutoff'
  | 'away-lockdown'
  | 'outage-backup'
  | 'sunset-porch'
  | 'motion-hallway'
  | 'night-check'

export interface Automation {
  id: AutomationKey
  name: string
  trigger: string
  actions: string[]
  enabled: boolean
  lastRunAt: number | null
  critical: boolean
}

export interface HomeState {
  residentName: string
  address: string
  propertyId: string
  unit: string
  rooms: Room[]
  lights: Light[]
  doors: Door[]
  windows: ContactSensor[]
  motion: MotionSensor[]
  cameras: Camera[]
  thermostat: Thermostat
  security: SecurityState
  water: WaterState
  network: HomeNetwork
  scenes: Scene[]
  automations: Automation[]
  lastSceneId: string | null
}

export type PropertyType = 'MDU' | 'SFH Community' | 'Commercial'
export type SmartPackage = 'Essentials' | 'Secure' | 'Complete'

export interface Property {
  id: string
  name: string
  type: PropertyType
  address: string
  city: string
  units: number
  smartHomeUnits: number
  package: SmartPackage
  contract: 'Bulk' | 'Retail'
  oltId: string
  manager: string
  monthlyContract: number
}

export interface Olt {
  id: string
  name: string
  location: string
  ponPorts: number
  usedPorts: number
}

export type SplitterRatio = '1:4' | '1:8' | '1:16' | '1:32'

export interface Splitter {
  id: string
  name: string
  oltId: string
  parentId: string | null
  ratio: SplitterRatio
  cabinet: string
  propertyId: string
  lossDb: number
}

export interface Ont {
  id: string
  serial: string
  splitterId: string
  propertyId: string
  unit: string
  resident: string
  status: OntStatus
  rxPowerDbm: number | null
  lastTestAt: number | null
  smartHome: boolean
  isDemoHome: boolean
}

export type TechnicianStatus = 'available' | 'en-route' | 'on-site' | 'off-duty'

export interface Technician {
  id: string
  name: string
  initials: string
  status: TechnicianStatus
  skills: string[]
  zone: string
  activeWorkOrderId: string | null
}

export type WorkOrderType = 'trouble' | 'emergency' | 'maintenance' | 'install' | 'support'
export type Priority = 'P1' | 'P2' | 'P3'
export type WorkOrderSource = 'ISP Dispatch' | 'Auto-detect' | 'Resident' | 'Scheduled' | 'Property Manager'
export type IncidentKind = 'fiber-cut' | 'signal-degradation' | 'leak-followup'

export interface WorkOrderStageEntry {
  stage: string
  at: number
  by: string
  note?: string
}

export interface WorkOrderPhoto {
  id: string
  url: string
  caption: string
  at: number
}

export interface WorkOrderNote {
  id: string
  at: number
  by: string
  text: string
}

export interface WorkOrder {
  id: string
  number: string
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
  createdAt: number
  dueAt: number
  scheduledFor?: number
  stage: string
  history: WorkOrderStageEntry[]
  assigneeId: string | null
  photos: WorkOrderPhoto[]
  notes: WorkOrderNote[]
  incident?: IncidentKind
  closedAt?: number
  package?: SmartPackage
  billable: number
}

export type AssetKind = 'cabinet' | 'pedestal' | 'riser' | 'slack-storage'
export type AssetCondition = 'good' | 'fair' | 'poor'

export interface Asset {
  id: string
  kind: AssetKind
  name: string
  propertyId: string
  lastInspectedAt: number
  condition: AssetCondition
}

export interface LightLevelReading {
  id: string
  ontId: string
  point: 'ONT' | 'Splitter'
  dbm: number
  at: number
  pass: boolean
  by: string
}

export interface RevenueMonth {
  month: string
  retainer: number
  troubleCalls: number
  emergency: number
  smartHome: number
  bulk: number
}

export interface OpsState {
  properties: Property[]
  olts: Olt[]
  splitters: Splitter[]
  onts: Ont[]
  technicians: Technician[]
  workOrders: WorkOrder[]
  assets: Asset[]
  lightLevels: LightLevelReading[]
  revenue: RevenueMonth[]
  nextWorkOrderNumber: number
}

export type PartnerId = 'hotwire' | 'att' | 'frontier' | 'summit' | 'comcast'

export interface Settings {
  partnerId: PartnerId
  demoPin: string
}

export interface Toast {
  id: string
  severity: Severity
  title: string
  message?: string
  createdAt: number
  scope?: EventScope
}

export type AlertKind = 'leak' | 'intrusion' | 'outage' | 'degradation'

export interface CriticalAlert {
  id: string
  kind: AlertKind
  title: string
  message: string
  at: number
}

export interface SimState {
  running: boolean
  tickCount: number
  lastTickAt: number
}

export type ScenarioKey =
  | 'burst-pipe'
  | 'slow-leak'
  | 'sensor-wet'
  | 'intrusion'
  | 'entry-door'
  | 'fiber-cut'
  | 'signal-degradation'
  | 'install-request'
  | 'isp-trouble-ticket'

export interface AppData {
  settings: Settings
  home: HomeState
  ops: OpsState
  events: ActivityEvent[]
  toasts: Toast[]
  alert: CriticalAlert | null
  sim: SimState
}
