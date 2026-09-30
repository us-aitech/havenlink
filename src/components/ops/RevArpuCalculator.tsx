import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button, Card, CardHeader, KeyValue, Slider } from '@/components/ui'
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
        <span className="text-[13px] font-medium text-fg-2">{label}</span>
        <span className="text-[13px] font-semibold text-fg tabular">{display}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} label={label} />
      <div className="mt-1 flex justify-between text-xs text-fg-3 tabular">
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
  const ispRatio = packageRevenue ? ispShare / packageRevenue : 1 - inputs.share / 100

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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <CardHeader title="ARPU uplift calculator" subtitle="What smart-home packages add to the ISP’s revenue per subscriber" className="mb-0" />
        <div className="flex shrink-0 gap-2">
          <Button size="sm" onClick={loadPortfolio}>
            Use current portfolio
          </Button>
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setInputs(DEFAULTS)}>
            Reset
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-6">
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

        <div className="flex flex-col rounded-lg bg-surface-2 p-5" aria-live="polite">
          <div className="text-[13px] font-medium text-fg-3">Added ISP ARPU</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-3xl leading-9 font-semibold tracking-[-0.02em] text-fg">+{cents(arpu)}</span>
            <span className="text-[13px] text-fg-3">per subscriber / month</span>
          </div>
          <div className="mt-1 text-xs text-fg-3">
            Averaged across {num(inputs.units)} subscribers, {num(homes)} with smart home
          </div>

          <div className="mt-5">
            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
              <span className="h-full rounded-l-full bg-accent" style={{ width: `${ispRatio * 100}%` }} />
              <span className="h-full flex-1 rounded-r-full bg-neutral" />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-fg-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-accent" />
                ISP keeps {100 - inputs.share}%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-neutral" />
                Partner share {inputs.share}%
              </span>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border border-t border-border">
            <KeyValue label="Monthly package revenue" value={<span className="tabular">{currency(packageRevenue)}</span>} />
            <KeyValue label="ISP share, monthly" value={<span className="tabular">{currency(ispShare)}</span>} />
            <KeyValue label="Partner share, monthly" value={<span className="tabular">{currency(partnerShare)}</span>} />
            <KeyValue label="ISP revenue, annualized" value={<span className="tabular">{currency(ispShare * 12)}</span>} />
          </div>

          <p className="mt-auto pt-4 text-xs leading-5 text-fg-3">
            The ISP keeps {cents(inputs.price * (1 - inputs.share / 100))} of every {cents(inputs.price)} package each month with no truck rolls. Install, WiFi optimization, onboarding and support are
            handled by the field-services partner. Install fees are excluded.
          </p>
        </div>
      </div>
    </Card>
  )
}
