import { Activity, Building2, Handshake, Headset, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui'
import { usePartner } from '@/lib/hooks'

interface Benefit {
  icon: LucideIcon
  title: string
  detail: string
}

const BENEFITS: Benefit[] = [
  { icon: Handshake, title: 'Single vendor', detail: 'One partner for fiber build, GPON maintenance, trouble calls, emergency repair and smart-home.' },
  { icon: TrendingUp, title: 'Higher ARPU', detail: 'Smart-home packages ride on the fiber connection and lift revenue per subscriber.' },
  { icon: Headset, title: 'Reduced support load', detail: 'Resident tech support, WiFi optimization and app onboarding handled by our field team.' },
  { icon: Activity, title: 'Better uptime', detail: 'Preventive inspections and light-level testing catch degradation before it becomes an outage.' },
  { icon: Building2, title: 'Turnkey MDU technology', detail: 'Bulk contracts bundle fiber, access control and leak protection for property owners.' },
  { icon: Sparkles, title: 'Smart-property ISP', detail: 'Differentiate from cable and fixed-wireless competitors with a managed smart-home experience.' },
]

export function RevBenefits() {
  const partner = usePartner()
  return (
    <Card className="h-full">
      <CardHeader title={`Strategic benefits for ${partner.short}`} subtitle="Why the expanded partnership pays off beyond the invoice" icon={Sparkles} />
      <ul className="flex flex-col gap-3.5">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-fg ring-1 ring-inset ring-accent-line">
              <b.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-fg">{b.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-fg-3">{b.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
