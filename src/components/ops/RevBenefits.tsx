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
  { icon: Headset, title: 'Reduced support load', detail: 'Resident tech support, WiFi optimization and app onboarding are handled by our field team.' },
  { icon: Activity, title: 'Better uptime', detail: 'Preventive inspections and light-level testing catch degradation before it becomes an outage.' },
  { icon: Building2, title: 'Turnkey MDU technology', detail: 'Bulk contracts bundle fiber, access control and leak protection for property owners.' },
  { icon: Sparkles, title: 'Smart-property ISP', detail: 'Stand apart from cable and fixed-wireless competitors with a managed smart-home experience.' },
]

export function RevBenefits() {
  const partner = usePartner()
  return (
    <Card>
      <CardHeader title={`Strategic benefits for ${partner.short}`} subtitle="Why the expanded partnership pays off beyond the invoice" className="mb-5" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex items-start gap-3">
            <b.icon className="mt-0.5 size-4 shrink-0 text-fg-3" />
            <div className="min-w-0">
              <div className="text-[13px] leading-5 font-medium text-fg">{b.title}</div>
              <div className="mt-0.5 text-xs leading-5 text-fg-3">{b.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
