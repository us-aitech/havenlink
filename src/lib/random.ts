export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function chance(probability: number): boolean {
  return Math.random() < probability
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

let counter = 0

export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
