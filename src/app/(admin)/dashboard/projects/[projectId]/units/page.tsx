import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { listUnitsByProject } from '@/modules/units/unit-service'
import { StatCard } from '@/components/dashboard/stat-card'
import { AddUnitsPanel } from './add-units-panel'
import { UnitsTable, type UnitRow } from './units-table'

export const metadata: Metadata = { title: 'Unidades' }

export default async function UnitsPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const units = await listUnitsByProject(tenant.tenantId, params.projectId)

  const available = units.filter((u) => u.status === 'available').length
  const reserved = units.filter((u) => u.status === 'reserved').length
  const sold = units.filter((u) => u.status === 'sold').length

  return (
    <div>
      <Link
        href={`/dashboard/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver al proyecto
      </Link>

      <div className="mt-4">
        <h1 className="text-title font-semibold text-fg">Unidades</h1>
        <p className="mt-1 text-fg-muted">
          Inventario de <span className="font-medium text-fg">{project.name}</span>
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={units.length} />
        <StatCard label="Disponibles" value={available} />
        <StatCard label="Reservadas" value={reserved} />
        <StatCard label="Vendidas" value={sold} />
      </div>

      <div className="mt-8">
        <AddUnitsPanel projectId={params.projectId} />
      </div>

      <div className="mt-6">
        <UnitsTable units={units as UnitRow[]} projectId={params.projectId} />
      </div>
    </div>
  )
}
