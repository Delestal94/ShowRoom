import type { Metadata } from 'next'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { listLeadsByTenant, getLeadStats } from '@/modules/leads/lead-service'
import { StatCard } from '@/components/dashboard/stat-card'
import { LeadsBoard } from './leads-board'

export const metadata: Metadata = { title: 'Leads' }

export default async function CRMPage() {
  const tenant = await requireCurrentTenant()
  const [leads, stats] = await Promise.all([
    listLeadsByTenant(tenant.tenantId),
    getLeadStats(tenant.tenantId),
  ])

  return (
    <div>
      <h1 className="text-title font-semibold text-fg">Leads</h1>
      <p className="mt-1 text-fg-muted">Gestioná y hacé seguimiento de tu pipeline de ventas</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Nuevos" value={stats.new} />
        <StatCard label="Contactados" value={stats.contacted} />
        <StatCard label="Calificados" value={stats.qualified} />
        <StatCard label="Ganados" value={stats.won} />
      </div>

      <div className="mt-8">
        <LeadsBoard leads={leads as any} />
      </div>
    </div>
  )
}
