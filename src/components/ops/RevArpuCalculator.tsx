import { useState } from 'react'
import { Calculator, RotateCcw } from 'lucide-react'
import { Button, Card, CardHeader, Slider } from '@/components/ui'
import { currency, num } from '@/lib/format'

export interface ArpuInputs {
  units: number
  adoption: number
  price: number
  share: number
}

const PRICE_MIN = 19.99
const PRICE_MAX = 59.99
const PRICE_STEP = 0.5

const DEFAULTS: ArpuInputs = { units: 1000, adoption: 35, price: 39.99, share: 30 }

function cents(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function snapPrice(value: number): number {
  const snapped = PRICE_MIN + Math.round((value - PRICE_MIN) / PRICE_STEP) * PRICE_STEP
  return Math.round(Math.min(PRICE_MAX, Math.max(PRICE_MIN, snapped)) * 100) / 100
}

function SliderRow({ label, value, min, max, step, onChange, display, minLabel, maxLabel }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string; minLabel: string; maxLabel: string }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-fg-3">{label}</span>
        <span className="text-sm font-semibold text-fg tabular">{display}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} label={label} />
      <div className="mt-1 flex justify-between text-[10px] text-fg-4 tabular">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

export function RevArpuCalculator({ portfolio }: { portfolio: Omit<ArpuInputs, 'share'> }) {
  const [inputs, setInputs] = useState<ArpuInputs>(DEFAULTS)
  const set = (patch: Partial<ArpuInputs>) => setInputs((prev) => ({ ...prev, ...patch }))

  const homes = Math.round((inputs.units * inputs.adoption) / 100)
  const packageRevenue = homes * inputs.price
  const partnerShare = (packageRevenue * inputs.share) / 100
  const ispShare = packageRevenue - partnerShare
  const arpu = inputs.units ? ispShare / inputs.units : 0
  const ispRatio = packageRevenue ? ispShare / packageRevenue : 0

  function loadPortfolio() {
    setInputs((prev) => ({
      ...prev,
      units: Math.min(5000, Math.max(100, portfolio.units)),
      adoption: Math.min(80, Math.max(5, Math.round(portfolio.adoption))),
      price: snapPrice(portfolio.price),
    }))
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CardHeader title="ARPU uplift calculator" subtitle="What smart-home packages add to the ISP’s revenue per subscriber" icon={Calculator} className="mb-0!" />
        <div className="flex gap-1.5 self-start">
          <Button size="xs" variant="secondary" onClick={loadPortfolio}>
            Use current portfolio
          </Button>
          <Button size="xs" variant="ghost" icon={RotateCcw} onClick={() => setInputs(DEFAULTS)} aria-label="Reset calculator">
            Reset
          </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <SliderRow label="Subscribers (units)" value={inputs.units} min={100} max={5000} step={1} onChange={(v) => set({ units: v })} display={num(inputs.units)} minLabel="100" maxLabel="5,000" />
          <SliderRow label="Smart-home adoption" value={inputs.adoption} min={5} max={80} step={1} onChange={(v) => set({ adoption: v })} display={`${inputs.adoption}%`} minLabel="5%" maxLabel="80%" />
          <SliderRow
            label="Average package price"
            value={inputs.price}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            onChange={(v) => set({ price: snapPrice(v) })}
            display={`${cents(inputs.price)}/mo`}
            minLabel="$19.99 Essentials"
            maxLabel="$59.99 Complete"
          />
          <SliderRow label="Partner revenue share" value={inputs.share} min={10} max={50} step={1} onChange={(v) => set({ share: v })} display={`${inputs.share}%`} minLabel="10%" maxLabel="50%" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-accent-soft p-4 ring-1 ring-inset ring-accent-line">
            <div className="text-xs font-medium text-accent-fg">Added ISP ARPU</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight text-fg">+{cents(arpu)}</span>
              <span className="text-sm text-fg-3">per subscriber / mo</span>
            </div>
            <div className="mt-1 text-xs text-fg-3">
              Averaged across all {num(inputs.units)} subscribers · {num(homes)} smart-home homes
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between text-xs">
              <span className="text-fg-3">Monthly package revenue</span>
              <span className="text-sm font-semibold text-fg tabular">{currency(packageRevenue)}</span>
            </div>
            <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span className="h-full bg-accent" style={{ width: `${ispRatio * 100}%` }} />
              <span className="h-full flex-1 bg-neutral" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-[3px] bg-accent" />
                <div>
                  <div className="text-fg-3">ISP share · {100 - inputs.share}%</div>
                  <div className="font-semibold text-fg tabular">{currency(ispShare)}/mo</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-[3px] bg-neutral" />
                <div>
                  <div className="text-fg-3">Partner share · {inputs.share}%</div>
                  <div className="font-semibold text-fg tabular">{currency(partnerShare)}/mo</div>
                </div>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-border">
              <dt className="text-[11px] text-fg-3">Annualized ISP revenue</dt>
              <dd className="mt-0.5 text-base font-semibold text-fg">{currency(ispShare * 12)}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-border">
              <dt className="text-[11px] text-fg-3">Annualized package revenue</dt>
              <dd className="mt-0.5 text-base font-semibold text-fg">{currency(packageRevenue * 12)}</dd>
            </div>
          </dl>
          <p className="text-[11px] leading-relaxed text-fg-3">
            ISP keeps {cents(inputs.price * (1 - inputs.share / 100))} of every {cents(inputs.price)} package per month with zero truck rolls — install, WiFi optimization, onboarding and support are
            handled by the field-services partner. Install fees excluded.
          </p>
        </div>
      </div>
    </Card>
  )
}
