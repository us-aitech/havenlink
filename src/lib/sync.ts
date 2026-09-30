import { DEMO } from '@/config'
import { SYNC_KEYS, useStore } from '@/store/useStore'
import type { AppData } from '@/types'

const LOCK_NAME = 'havenlink-sim-leader'
const CHANNEL_NAME = 'havenlink-sync'

type SyncMessage = { type: 'state'; data: Partial<AppData> }

function pickSynced(): Partial<AppData> {
  const state = useStore.getState()
  return Object.fromEntries(SYNC_KEYS.map((k) => [k, state[k]])) as Partial<AppData>
}

export function startSimulationRuntime(): () => void {
  let stopTicking: (() => void) | null = null
  let releaseLock: (() => void) | null = null
  let holding = false
  let disposed = false
  let applyingRemote = false
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

  const startTicking = () => {
    stopTicking?.()
    const id = setInterval(() => useStore.getState().tick(), DEMO.tickMs)
    stopTicking = () => {
      clearInterval(id)
      stopTicking = null
    }
  }

  const acquire = (steal: boolean) => {
    if (holding || disposed) return
    if (!('locks' in navigator)) {
      holding = true
      startTicking()
      return
    }
    holding = true
    const options: LockOptions = steal ? { steal: true } : { ifAvailable: true }
    navigator.locks
      .request(LOCK_NAME, options, (lock) => {
        if (!lock || disposed) return undefined
        startTicking()
        return new Promise<void>((resolve) => {
          releaseLock = resolve
          window.addEventListener('pagehide', () => resolve(), { once: true })
        })
      })
      .catch(() => undefined)
      .finally(() => {
        stopTicking?.()
        releaseLock = null
        holding = false
      })
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') acquire(true)
  }

  const unsubscribe = useStore.subscribe(() => {
    if (applyingRemote || !channel) return
    const message: SyncMessage = { type: 'state', data: pickSynced() }
    channel.postMessage(message)
  })

  if (channel) {
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data?.type !== 'state') return
      applyingRemote = true
      useStore.setState(event.data.data)
      applyingRemote = false
    }
  }

  const watchdog = setInterval(() => {
    if (holding || disposed) return
    const sim = useStore.getState().sim
    if (sim.running && Date.now() - sim.lastTickAt > DEMO.tickMs * 3) acquire(document.visibilityState === 'visible')
  }, DEMO.tickMs * 2)

  document.addEventListener('visibilitychange', onVisibility)
  acquire(document.visibilityState === 'visible')

  return () => {
    disposed = true
    clearInterval(watchdog)
    stopTicking?.()
    releaseLock?.()
    unsubscribe()
    channel?.close()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
