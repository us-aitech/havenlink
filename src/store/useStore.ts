import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { DEMO, getPartner } from '@/config'
import { createInitialData } from '@/data/seed'
import {
  addEvent,
  addToast,
  advanceWorkOrder,
  armSecurity,
  assignWorkOrder,
  createResidentRequest,
  createWorkOrder,
  disarmSecurity,
  moveGarage,
  resolveLeak,
  runScenario,
  setDoorOpen,
  setValve,
  setWindowOpen,
  tick,
  type NewWorkOrder,
  type ResidentRequest,
} from '@/sim/engine'
import { round, uid } from '@/lib/random'
import type {
  AppData,
  AutomationKey,
  PartnerId,
  ScenarioKey,
  SecurityMode,
  ThermostatMode,
  WaterSettings,
  WorkOrder,
} from '@/types'

export interface Actions {
  tick: () => void
  setRunning: (running: boolean) => void
  resetDemo: () => void
  setPartner: (id: PartnerId) => void
  runScenario: (key: ScenarioKey) => void
  dismissToast: (id: string) => void
  dismissAlert: () => void

  toggleLight: (id: string) => void
  setBrightness: (id: string, value: number) => void
  setRoomLights: (roomId: string, on: boolean) => void
  allLightsOff: () => void
  setLock: (id: string, locked: boolean) => void
  lockAll: () => void
  setGarage: (id: string, open: boolean) => void
  setDoorOpen: (id: string, open: boolean) => void
  setWindowOpen: (id: string, open: boolean) => void
  setThermostatTarget: (value: number) => void
  setThermostatMode: (mode: ThermostatMode) => void
  setCameraRecording: (id: string, recording: boolean) => void
  armSecurity: (mode: Exclude<SecurityMode, 'disarmed'>) => void
  disarmSecurity: (pin: string) => boolean
  setValve: (open: boolean) => void
  resolveLeak: () => void
  updateWaterSettings: (patch: Partial<WaterSettings>) => void
  setLeakSensorWet: (id: string, wet: boolean) => void
  runScene: (sceneId: string) => void
  toggleAutomation: (id: AutomationKey) => void
  startSpeedTest: () => void
  createResidentRequest: (req: ResidentRequest) => WorkOrder

  advanceWorkOrder: (id: string, note?: string) => void
  assignWorkOrder: (id: string, techId: string) => void
  addWorkOrderNote: (id: string, text: string, by?: string) => void
  addWorkOrderPhoto: (id: string, url: string, caption: string) => void
  createWorkOrder: (input: NewWorkOrder) => WorkOrder
  runLightLevelTest: (ontId: string) => void
}

export type Store = AppData & Actions

const DATA_KEYS: Array<keyof AppData> = ['settings', 'home', 'ops', 'events', 'alert', 'sim']

export const SYNC_KEYS: Array<keyof AppData> = [...DATA_KEYS, 'toasts']

let pendingWrite: { key: string; value: string } | null = null
let writeTimer: ReturnType<typeof setTimeout> | null = null

const throttledStorage: StateStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => {
    pendingWrite = { key, value }
    if (writeTimer) return
    writeTimer = setTimeout(() => {
      if (pendingWrite) {
        try {
          localStorage.setItem(pendingWrite.key, pendingWrite.value)
        } catch {
          localStorage.removeItem(pendingWrite.key)
        }
      }
      pendingWrite = null
      writeTimer = null
    }, 1500)
  },
  removeItem: (key) => localStorage.removeItem(key),
}

export const useStore = create<Store>()(
  persist(
    immer((set, get) => ({
      ...createInitialData(),

      tick: () =>
        set((d) => {
          if (d.sim.running) tick(d)
        }),
      setRunning: (running) =>
        set((d) => {
          d.sim.running = running
          d.sim.lastTickAt = Date.now()
        }),
      resetDemo: () => {
        const partnerId = get().settings.partnerId
        set(createInitialData(partnerId))
      },
      setPartner: (id) =>
        set((d) => {
          const partner = getPartner(id)
          d.settings.partnerId = id
          d.home.network.planName = partner.planName
          d.home.network.planDownMbps = partner.down
          d.home.network.planUpMbps = partner.up
        }),
      runScenario: (key) => set((d) => runScenario(d, key)),
      dismissToast: (id) =>
        set((d) => {
          d.toasts = d.toasts.filter((t) => t.id !== id)
        }),
      dismissAlert: () =>
        set((d) => {
          d.alert = null
        }),

      toggleLight: (id) =>
        set((d) => {
          const l = d.home.lights.find((x) => x.id === id)
          if (l) l.on = !l.on
        }),
      setBrightness: (id, value) =>
        set((d) => {
          const l = d.home.lights.find((x) => x.id === id)
          if (l) {
            l.brightness = Math.max(1, Math.min(100, Math.round(value)))
            l.on = true
          }
        }),
      setRoomLights: (roomId, on) =>
        set((d) => {
          for (const l of d.home.lights) if (l.roomId === roomId) l.on = on
        }),
      allLightsOff: () =>
        set((d) => {
          for (const l of d.home.lights) l.on = false
          addEvent(d, { severity: 'info', category: 'lighting', scope: 'home', title: 'All lights turned off', detail: 'From the app' })
        }),
      setLock: (id, locked) =>
        set((d) => {
          const door = d.home.doors.find((x) => x.id === id)
          if (!door) return
          door.locked = locked
          if (locked) door.open = false
          addEvent(d, { severity: 'info', category: 'access', scope: 'home', title: `${door.name} ${locked ? 'locked' : 'unlocked'}`, detail: `By ${d.home.residentName.split(' ')[0]} from the app` })
        }),
      lockAll: () =>
        set((d) => {
          for (const door of d.home.doors) {
            if (door.kind === 'lock') {
              door.locked = true
              door.open = false
            }
          }
          addEvent(d, { severity: 'info', category: 'access', scope: 'home', title: 'All doors locked', detail: 'From the app' })
        }),
      setGarage: (id, open) => set((d) => moveGarage(d, id, open)),
      setDoorOpen: (id, open) => set((d) => setDoorOpen(d, id, open)),
      setWindowOpen: (id, open) => set((d) => setWindowOpen(d, id, open)),
      setThermostatTarget: (value) =>
        set((d) => {
          d.home.thermostat.target = Math.max(60, Math.min(86, Math.round(value)))
        }),
      setThermostatMode: (mode) =>
        set((d) => {
          d.home.thermostat.mode = mode
        }),
      setCameraRecording: (id, recording) =>
        set((d) => {
          const c = d.home.cameras.find((x) => x.id === id)
          if (c) c.recording = recording
        }),
      armSecurity: (mode) => set((d) => armSecurity(d, mode)),
      disarmSecurity: (pin) => {
        let ok = false
        set((d) => {
          ok = disarmSecurity(d, pin)
        })
        return ok
      },
      setValve: (open) => set((d) => setValve(d, open)),
      resolveLeak: () => set((d) => resolveLeak(d)),
      updateWaterSettings: (patch) =>
        set((d) => {
          Object.assign(d.home.water.settings, patch)
          if (patch.autoShutoff !== undefined) {
            const a = d.home.automations.find((x) => x.id === 'leak-shutoff')
            if (a) a.enabled = patch.autoShutoff
          }
        }),
      setLeakSensorWet: (id, wet) =>
        set((d) => {
          const s = d.home.water.leakSensors.find((x) => x.id === id)
          if (s) s.wet = wet
        }),
      runScene: (sceneId) =>
        set((d) => {
          const h = d.home
          const light = (id: string, on: boolean, brightness?: number) => {
            const l = h.lights.find((x) => x.id === id)
            if (!l) return
            l.on = on
            if (brightness !== undefined) l.brightness = brightness
          }
          const scene = h.scenes.find((s) => s.id === sceneId)
          if (!scene) return
          if (sceneId === 'scene-morning') {
            light('l-kitchen-main', true, 100)
            light('l-living-main', true, 70)
            light('l-primary-bedside', false)
            for (const l of h.lights) if (l.outdoor) l.on = false
            if (h.security.mode !== 'disarmed') {
              h.security.mode = 'disarmed'
              h.security.status = 'ready'
              h.security.deadline = null
            }
            h.thermostat.target = 74
          }
          if (sceneId === 'scene-away') {
            for (const door of h.doors) if (door.kind === 'lock') door.locked = true
            for (const l of h.lights) if (!l.outdoor) l.on = false
            if (h.security.status === 'ready') armSecurity(d, 'away')
            h.thermostat.target = 78
          }
          if (sceneId === 'scene-night') {
            for (const door of h.doors) {
              if (door.kind === 'lock') door.locked = true
              if (door.kind === 'garage' && door.open) {
                door.moving = 'closing'
                door.movingEndsAt = Date.now() + DEMO.garageTravelSeconds * 1000
              }
            }
            for (const l of h.lights) l.on = false
            light('l-hallway', true, 10)
            light('l-porch', true, 40)
            if (h.security.status === 'ready') armSecurity(d, 'home')
            h.thermostat.target = 72
          }
          if (sceneId === 'scene-movie') {
            light('l-living-main', false)
            light('l-living-lamp', true, 20)
            light('l-kitchen-main', true, 15)
            light('l-kitchen-island', false)
          }
          if (sceneId === 'scene-home') {
            if (h.security.mode !== 'disarmed') {
              h.security.mode = 'disarmed'
              h.security.status = 'ready'
              h.security.deadline = null
            }
            light('l-foyer', true, 80)
            light('l-kitchen-main', true, 100)
            light('l-living-main', true, 80)
            h.thermostat.target = 74
          }
          h.lastSceneId = sceneId
          addEvent(d, { severity: 'info', category: 'automation', scope: 'home', title: `Scene "${scene.name}" activated`, detail: scene.description })
        }),
      toggleAutomation: (id) =>
        set((d) => {
          const a = d.home.automations.find((x) => x.id === id)
          if (!a) return
          a.enabled = !a.enabled
          if (id === 'leak-shutoff') d.home.water.settings.autoShutoff = a.enabled
          addEvent(d, { severity: a.critical && !a.enabled ? 'warning' : 'info', category: 'automation', scope: 'home', title: `Automation "${a.name}" ${a.enabled ? 'enabled' : 'disabled'}` })
        }),
      startSpeedTest: () =>
        set((d) => {
          const st = d.home.network.speedTest
          if (st.running || d.home.network.status === 'los') return
          st.running = true
          st.startedAt = Date.now()
        }),
      createResidentRequest: (req) => {
        let created: WorkOrder | undefined
        set((d) => {
          created = { ...createResidentRequest(d, req) }
        })
        return created as WorkOrder
      },

      advanceWorkOrder: (id, note) => set((d) => advanceWorkOrder(d, id, note)),
      assignWorkOrder: (id, techId) => set((d) => assignWorkOrder(d, id, techId)),
      addWorkOrderNote: (id, text, by = 'Dispatcher') =>
        set((d) => {
          const wo = d.ops.workOrders.find((w) => w.id === id)
          if (wo) wo.notes.push({ id: uid('note'), at: Date.now(), by, text })
        }),
      addWorkOrderPhoto: (id, url, caption) =>
        set((d) => {
          const wo = d.ops.workOrders.find((w) => w.id === id)
          if (wo) wo.photos.push({ id: uid('photo'), url, caption, at: Date.now() })
        }),
      createWorkOrder: (input) => {
        let created: WorkOrder | undefined
        set((d) => {
          const wo = createWorkOrder(d, input)
          addEvent(d, { severity: 'info', category: 'work-order', scope: 'ops', title: `${wo.number} created`, detail: wo.title, propertyId: wo.propertyId })
          addToast(d, { scope: 'ops', severity: 'success', title: `${wo.number} created`, message: wo.title })
          created = { ...wo }
        })
        return created as WorkOrder
      },
      runLightLevelTest: (ontId) =>
        set((d) => {
          const ont = d.ops.onts.find((o) => o.id === ontId)
          if (!ont) return
          const now = Date.now()
          const value = ont.rxPowerDbm === null ? -40 : round(ont.rxPowerDbm + (Math.random() - 0.5) * 0.4, 1)
          const pass = ont.rxPowerDbm !== null && value > -27
          ont.lastTestAt = now
          d.ops.lightLevels.unshift({ id: uid('ll'), ontId, point: 'ONT', dbm: value, at: now, pass, by: 'NOC remote test' })
          if (d.ops.lightLevels.length > 80) d.ops.lightLevels.length = 80
          addToast(d, {
            scope: 'ops',
            severity: pass ? 'success' : 'warning',
            title: `Light-level test ${pass ? 'passed' : 'failed'}`,
            message: `${ont.unit} · ${ont.rxPowerDbm === null ? 'no light detected' : `${value} dBm`}`,
          })
        }),
    })),
    {
      name: 'havenlink-poc',
      version: 4,
      storage: createJSONStorage(() => throttledStorage),
      partialize: (s) => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as Partial<Store>,
      migrate: () => createInitialData() as unknown as Store,
    },
  ),
)
