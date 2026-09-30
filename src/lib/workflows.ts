import type { OntStatus, Priority, Severity, TechnicianStatus, WorkOrder, WorkOrderType } from '@/types'

export interface WorkflowStage {
  key: string
  label: string
}

const FIELD_REPAIR: WorkflowStage[] = [
  { key: 'dispatched', label: 'Dispatched by ISP' },
  { key: 'assigned', label: 'Technician assigned' },
  { key: 'en-route', label: 'En route' },
  { key: 'diagnosing', label: 'On site · Diagnosing' },
  { key: 'repairing', label: 'Repair & test' },
  { key: 'documenting', label: 'Photo documentation' },
  { key: 'closed', label: 'Closed' },
]

export const WORKFLOWS: Record<WorkOrderType, WorkflowStage[]> = {
  emergency: FIELD_REPAIR,
  trouble: FIELD_REPAIR,
  maintenance: [
    { key: 'scheduled', label: 'Scheduled inspection' },
    { key: 'inspecting', label: 'Cabinet / pedestal check' },
    { key: 'light-level', label: 'Light-level testing' },
    { key: 'documenting', label: 'Documentation update' },
    { key: 'closed', label: 'Closed' },
  ],
  install: [
    { key: 'scheduled', label: 'Resident scheduled' },
    { key: 'installing', label: 'In-unit installation' },
    { key: 'wifi', label: 'WiFi optimization' },
    { key: 'onboarding', label: 'App onboarding' },
    { key: 'closed', label: 'Ticket closed' },
  ],
  support: [
    { key: 'received', label: 'Request received' },
    { key: 'assigned', label: 'Technician assigned' },
    { key: 'diagnosing', label: 'Remote diagnosis' },
    { key: 'resolving', label: 'Resolution' },
    { key: 'closed', label: 'Closed' },
  ],
}

export const WORK_ORDER_TYPE_LABEL: Record<WorkOrderType, string> = {
  emergency: 'Emergency repair',
  trouble: 'Trouble call',
  maintenance: 'Maintenance',
  install: 'Smart-home install',
  support: 'Resident support',
}

export const SLA_HOURS: Record<WorkOrderType, Record<Priority, number>> = {
  emergency: { P1: 4, P2: 8, P3: 12 },
  trouble: { P1: 8, P2: 24, P3: 48 },
  maintenance: { P1: 72, P2: 168, P3: 336 },
  install: { P1: 48, P2: 120, P3: 168 },
  support: { P1: 12, P2: 48, P3: 72 },
}

export function stagesFor(type: WorkOrderType): WorkflowStage[] {
  return WORKFLOWS[type]
}

export function stageIndex(wo: WorkOrder): number {
  return WORKFLOWS[wo.type].findIndex((s) => s.key === wo.stage)
}

export function stageLabel(wo: WorkOrder): string {
  return WORKFLOWS[wo.type].find((s) => s.key === wo.stage)?.label ?? wo.stage
}

export function nextStage(wo: WorkOrder): WorkflowStage | null {
  const stages = WORKFLOWS[wo.type]
  const idx = stages.findIndex((s) => s.key === wo.stage)
  return idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null
}

export function isOpen(wo: WorkOrder): boolean {
  return wo.stage !== 'closed'
}

export function stageProgress(wo: WorkOrder): number {
  const stages = WORKFLOWS[wo.type]
  const idx = Math.max(0, stages.findIndex((s) => s.key === wo.stage))
  return idx / (stages.length - 1)
}

export type SlaState = 'met' | 'missed' | 'on-track' | 'at-risk' | 'breached'

export function slaState(wo: WorkOrder, now = Date.now()): SlaState {
  if (wo.closedAt) return wo.closedAt <= wo.dueAt ? 'met' : 'missed'
  const remaining = wo.dueAt - now
  if (remaining < 0) return 'breached'
  const total = wo.dueAt - wo.createdAt
  if (total > 0 && remaining / total < 0.25) return 'at-risk'
  return 'on-track'
}

export type Tone = 'neutral' | 'info' | 'accent' | 'good' | 'warning' | 'serious' | 'critical'

export const SLA_TONE: Record<SlaState, Tone> = {
  met: 'good',
  missed: 'critical',
  'on-track': 'good',
  'at-risk': 'warning',
  breached: 'critical',
}

export const SEVERITY_TONE: Record<Severity, Tone> = {
  info: 'info',
  success: 'good',
  warning: 'warning',
  critical: 'critical',
}

export const PRIORITY_TONE: Record<Priority, Tone> = {
  P1: 'critical',
  P2: 'warning',
  P3: 'neutral',
}

export const ONT_STATUS_TONE: Record<OntStatus, Tone> = {
  online: 'good',
  degraded: 'warning',
  los: 'critical',
  offline: 'neutral',
}

export const ONT_STATUS_LABEL: Record<OntStatus, string> = {
  online: 'Online',
  degraded: 'Low light',
  los: 'LOS',
  offline: 'Offline',
}

export const TECH_STATUS_TONE: Record<TechnicianStatus, Tone> = {
  available: 'good',
  'en-route': 'info',
  'on-site': 'accent',
  'off-duty': 'neutral',
}

export const TECH_STATUS_LABEL: Record<TechnicianStatus, string> = {
  available: 'Available',
  'en-route': 'En route',
  'on-site': 'On site',
  'off-duty': 'Off duty',
}

export const WORK_ORDER_TYPE_TONE: Record<WorkOrderType, Tone> = {
  emergency: 'critical',
  trouble: 'warning',
  maintenance: 'info',
  install: 'accent',
  support: 'neutral',
}
