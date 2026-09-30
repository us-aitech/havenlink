# HavenLink — Smart Property Platform (POC)

Front-end–only proof of concept for the **Infrastructure Maintenance & Smart-Home Services** partner expansion proposal: a field-services company that already builds fiber/GPON for an ISP (Hotwire, AT&T Fiber, Frontier, Summit, Xfinity…) now also maintains the network, answers trouble calls, repairs emergencies and installs/supports smart homes on top of that fiber.

There is **no back-end**. All devices, the GPON network, technicians and work orders are simulated in the browser (zustand store + a 1-second simulation tick) and persisted to `localStorage`.

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4
- zustand v5 (+ immer, persist)
- react-router, lucide-react

## Running

```bash
npm install
npm run dev
```

Open http://localhost:5173. Build with `npm run build` (output in `dist/`).

## What's inside

| Portal | Route | Highlights |
| --- | --- | --- |
| Landing | `/` | Proposal summary, ISP partner selector, architecture, demo scenarios |
| Resident app | `/home` | Lights, locks, garage, alarm (Home/Away, entry/exit delay, PIN), cameras, thermostat, **water leak detection with automatic valve shut-off**, fiber/WiFi status, speed test, automations, support requests |
| Operations console | `/ops` | KPIs, live alerts, GPON topology (OLT → splitters → ONTs), work orders with SLA + workflow + photo documentation, preventive maintenance and light-level testing, smart-home install pipeline, properties, revenue model |

## Water protection logic

The flow sensor and motorized valve on the main line close the water automatically when any of these rules fire:

1. **Abnormal flow**: flow above the limit (default 6 GPM) for 3 seconds (burst pipe).
2. **Continuous flow**: water running longer than the limit (default 30 min) (hidden leak, running toilet). *Demo clock: 1 second = 1 minute.*
3. **Leak sensor wet**: any of the 5 sensors (sink, water heater, washer, bathroom, A/C drain pan).

When a rule fires: the valve closes (3 s travel), the resident gets a critical alert, the event appears in the Ops console, and a follow-up work order is opened automatically. The limits can be changed on the Water page.

## Demo script (≈5 minutes)

Use the purple **Demo simulator** button (bottom-right, available in both portals).

1. **Burst pipe**: open `/home/water` → simulator → *Burst pipe*. Flow spikes to ~10 GPM, the valve closes, the alert appears. Open `/ops` to see the alert and the auto-created leak follow-up work order. Back on Water, click *Fixed — restore water*.
2. **Fiber cut**: simulator → *Fiber cut in the street*. The resident sees the outage, LTE backup and repair tracking. In `/ops`, the P1 banner, the LOS splitter on *GPON network* and the emergency work order show up. Advance the work order to *Closed* and service comes back for all 8 homes.
3. **Break-in**: simulator → *Break-in via lanai door*. Siren, cameras recording, monitoring center notified. Disarm with PIN **1234**.
4. **ISP trouble ticket / install request**: they arrive in the Ops work-order queue and install pipeline in real time.

*Reset demo* in the simulator restores the initial state.

**Two-screen presentation:** open the Resident app in one tab/window and the Ops console in another (same browser). State syncs between tabs in real time (BroadcastChannel), and only one tab runs the simulation (Web Locks), so everything triggered on one side shows up on the other instantly.

## Structure

```
src/
  config.ts            brand, ISP partners, demo timings
  types.ts             domain model
  data/seed.ts         demo home + 6 SW-Florida properties, ~500 ONTs, techs, work orders
  sim/engine.ts        business rules (leak detection, alarm, fiber incidents, work-order workflow)
  store/useStore.ts    zustand store + actions
  components/          UI kit, charts, layouts, simulator
  pages/resident/*     resident app
  pages/ops/*          operations console
```

Swapping the simulation for a real back-end means replacing the store actions with API calls and the `tick` with websocket/MQTT events. The pages only consume the store.
