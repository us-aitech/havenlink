import { CalendarPlus, Check, Droplets } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { currency, num } from '@/lib/format'
import type { Tone } from '@/lib/workflows'
import type { Property, SmartPackage } from '@/types'

export interface PackageDef {
  id: SmartPackage
  install: number
  monthly: number
  tagline: string
  builds?: SmartPackage
  items: string[]
  highlight?: string
}

export const PACKAGES: PackageDef[] = [
  {
    id: 'Essentials',
    install: 180,
    monthly: 19.99,
    tagline: 'Smart access and basic leak alerts',
    items: ['Smart hub', 'Smart lock', '2 leak sensors', '2 smart bulbs'],
  },
  {
    id: 'Secure',
    install: 290,
    monthly: 39.99,
    tagline: 'Self-monitored security with video',
    builds: 'Essentials',
    items: ['Alarm keypad', '5 door / window sensors', 'Doorbell camera', '2 cameras'],
  },
  {
    id: 'Complete',
    install: 380,
    monthly: 59.99,
    tagline: 'Security, water protection and comfort',
    builds: 'Secure',
    items: ['Motorized main water shut-off valve with flow sensor', '5 leak sensors', 'Smart thermostat', 'Mesh WiFi', 'Lighting automation'],
    highlight: 'Includes automatic leak shut-off',
  },
]

export const PACKAGE_TONE: Record<SmartPackage, Tone> = {
  Essentials: 'neutral',
  Secure: 'info',
  Complete: 'accent',
}

export function packageDef(id: SmartPackage): PackageDef {
  return PACKAGES.find((p) => p.id === id) ?? PACKAGES[0]
}

export function monthlyPrice(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InstPackages({ properties, onSchedule }: { properties: Property[]; onSchedule: (pkg: SmartPackage) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PACKAGES.map((p) => {
        const onPackage = properties.filter((prop) => prop.package === p.id)
        const units = onPackage.reduce((sum, prop) => sum + prop.smartHomeUnits, 0)
        const featured = Boolean(p.highlight)
        return (
          <div
            key={p.id}
            className={cn(
              'relative flex flex-col rounded-xl border bg-surface p-5',
              featured ? 'border-accent-line' : 'border-border',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-fg">{p.id}</h3>
                  <Badge tone={PACKAGE_TONE[p.id]}>{p.id === 'Complete' ? 'Flagship' : p.id === 'Secure' ? 'Most installed' : 'Entry'}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-fg-3">{p.tagline}</p>
              </div>
            </div>
            {p.highlight && (
              <div className="mt-3 inline-flex items-center gap-2 self-start rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent-fg ring-1 ring-inset ring-accent-line">
                <Droplets className="size-3.5" />
                {p.highlight}
              </div>
            )}
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tracking-tight text-fg">{monthlyPrice(p.monthly)}</span>
              <span className="text-sm text-fg-3">/ mo</span>
            </div>
            <div className="text-xs text-fg-3">{currency(p.install)} one-time install</div>
            <div className="mt-4 border-t border-border pt-4">
              {p.builds && <div className="mb-2 text-xs font-medium text-fg-2">Everything in {p.builds}, plus:</div>}
              <ul className="flex flex-col gap-2">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-fg-2">
                    <Check className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-accent-fg' : 'text-good-fg')} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto pt-5">
              <div className="flex items-end justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-border">
                <div>
                  <div className="text-lg font-semibold text-fg">≈ {num(units)}</div>
                  <div className="text-[11px] text-fg-3">
                    units · {onPackage.length} {onPackage.length === 1 ? 'property' : 'properties'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-fg">{currency(units * p.monthly)}</div>
                  <div className="text-[11px] text-fg-3">est. package fees / mo</div>
                </div>
              </div>
              <Button size="sm" variant={featured ? 'primary' : 'secondary'} icon={CalendarPlus} className="mt-3 w-full" onClick={() => onSchedule(p.id)}>
                Schedule {p.id} install
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
