import { Navigate, Route, Routes } from 'react-router'
import { Toaster } from '@/components/Toaster'
import { OpsLayout } from '@/components/layout/OpsLayout'
import { ResidentLayout } from '@/components/layout/ResidentLayout'
import { useSimulation } from '@/lib/hooks'
import Landing from '@/pages/Landing'
import ResidentOverview from '@/pages/resident/Overview'
import ResidentDevices from '@/pages/resident/Devices'
import ResidentSecurity from '@/pages/resident/Security'
import ResidentWater from '@/pages/resident/Water'
import ResidentNetwork from '@/pages/resident/Network'
import ResidentAutomations from '@/pages/resident/Automations'
import ResidentSupport from '@/pages/resident/Support'
import OpsOverview from '@/pages/ops/Overview'
import OpsNetwork from '@/pages/ops/Network'
import OpsWorkOrders from '@/pages/ops/WorkOrders'
import OpsMaintenance from '@/pages/ops/Maintenance'
import OpsInstalls from '@/pages/ops/Installs'
import OpsProperties from '@/pages/ops/Properties'
import OpsRevenue from '@/pages/ops/Revenue'

export default function App() {
  useSimulation()
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<ResidentLayout />}>
          <Route index element={<ResidentOverview />} />
          <Route path="devices" element={<ResidentDevices />} />
          <Route path="security" element={<ResidentSecurity />} />
          <Route path="water" element={<ResidentWater />} />
          <Route path="network" element={<ResidentNetwork />} />
          <Route path="automations" element={<ResidentAutomations />} />
          <Route path="support" element={<ResidentSupport />} />
        </Route>
        <Route path="/ops" element={<OpsLayout />}>
          <Route index element={<OpsOverview />} />
          <Route path="network" element={<OpsNetwork />} />
          <Route path="work-orders" element={<OpsWorkOrders />} />
          <Route path="maintenance" element={<OpsMaintenance />} />
          <Route path="installs" element={<OpsInstalls />} />
          <Route path="properties" element={<OpsProperties />} />
          <Route path="revenue" element={<OpsRevenue />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}
