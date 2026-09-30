import { CalendarPlus, Check, Droplets } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { currency, num } from '@/lib/format'
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

export function packageDef(id: SmartPackage): PackageDef {
  return PACKAGES.find((p) => p.id === id) ?? PACKAGES[0]
}

export function monthlyPrice(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InstPackages({ properties, onSchedule }: { properties: Property[]; onSchedule: (pkg: SmartPackage) => void }) {
  const footprint = PACKAGES.map((p) => {
    const onPackage = properties.filter((prop) => prop.package === p.id)
    return { id: p.id, properties: onPackage.length, units: onPackage.reduce((sum, prop) => sum + prop.smartHomeUnits, 0) }
  })
  const mostInstalled = footprint.reduce((best, f) => (f.units > best.units ? f : best), footprint[0])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PACKAGES.map((p, i) => {
        const { units, properties: propertyCount } = footprint[i]
        const featured = Boolean(p.highlight)
        return (
          <Card key={p.id} className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-fg">{p.id}</h3>
              {mostInstalled.units > 0 && mostInstalled.id === p.id && <Badge>Most installed</Badge>}
            </div>
            <p className="mt-0.5 text-[13px] text-fg-3">{p.tagline}</p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl leading-9 font-semibold tracking-[-0.02em] text-fg">{monthlyPrice(p.monthly)}</span>
              <span className="text-[13px] text-fg-3">/ month</span>
            </div>
            <div className="mt-0.5 text-xs text-fg-3">
              <span className="tabular">{currency(p.install)}</span> one-time install
            </div>

            {featured && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent-fg">
                <Droplets className="size-4 shrink-0" />
                {p.highlight}
              </div>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <div className="mb-2.5 text-xs font-medium text-fg-3">{p.builds ? `Everything in ${p.builds}, plus` : 'Includes'}</div>
              <ul className="flex flex-col gap-2">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] leading-5 text-fg-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-fg" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-5">
              <dl className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div>
                  <dt className="text-xs text-fg-3">Installed units</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-fg tabular">≈ {num(units)}</dd>
                  <dd className="text-xs text-fg-3">
                    {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="text-xs text-fg-3">Package fees</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-fg tabular">{currency(units * p.monthly)}</dd>
                  <dd className="text-xs text-fg-3">est. per month</dd>
                </div>
              </dl>
              <Button variant={featured ? 'primary' : 'secondary'} icon={CalendarPlus} className="mt-4 w-full" onClick={() => onSchedule(p.id)}>
                Schedule {p.id} install
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
