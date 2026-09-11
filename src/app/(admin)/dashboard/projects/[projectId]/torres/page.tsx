import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { canManageContent } from '@/modules/tenancy/permissions'
import { getProject } from '@/modules/projects/project-service'
import { listBuildings } from '@/modules/buildings/building-service'
import { BuildingsClient } from './buildings-client'

export default async function BuildingsPage({ params }: { params: { projectId: string } }) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project || !canManageContent(tenant.role)) notFound()
  const buildings = await listBuildings(tenant.tenantId, project.id)
  return <div className="mx-auto max-w-3xl"><Link href={`/dashboard/projects/${project.id}`} className="text-sm text-fg-muted hover:text-fg">← Volver al proyecto</Link><h1 className="mt-4 text-title font-semibold text-fg">Torres y edificios</h1><p className="mt-1 text-fg-muted">Agrupá las unidades y plantas de {project.name}.</p><div className="mt-8"><BuildingsClient projectId={project.id} buildings={buildings} /></div></div>
}
