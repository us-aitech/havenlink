import { useEffect, useState } from 'react'
import { getPartner, type Partner } from '@/config'
import { startSimulationRuntime } from './sync'
import { useStore } from '@/store/useStore'

export function useSimulation() {
  useEffect(() => startSimulationRuntime(), [])
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function usePartner(): Partner {
  return getPartner(useStore((s) => s.settings.partnerId))
}
