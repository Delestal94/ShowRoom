import type { Metadata } from 'next'
import Link from 'next/link'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { listProjects } from '@/modules/projects/project-service'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Proyectos' }

const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', published: 'Publicado' }

export default async function ProjectsPage() {
  const tenant = await requireCurrentTenant()
  const projects = await listProjects(tenant.tenantId)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-fg">Proyectos</h1>
          <p className="mt-1 text-fg-muted">Gestioná todos tus proyectos inmobiliarios</p>
        </div>
        <ButtonLink href="/dashboard/projects/new" size="sm">
          + Nuevo proyecto
        </ButtonLink>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
          <h3 className="font-semibold text-fg">Todavía no hay proyectos</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
            Creá tu primer proyecto para empezar a cargar unidades y tours.
          </p>
          <ButtonLink href="/dashboard/projects/new" className="mt-6">
            Crear proyecto
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="rounded-2xl border border-border bg-surface/50 p-6 transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-fg">{project.name}</h3>
                  <p className="mt-1 truncate text-sm text-fg-muted">
                    {project.address || 'Sin dirección'}
                  </p>
                </div>
                <span
                  className={
                    project.status === 'published'
                      ? 'shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success'
                      : 'shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning'
                  }
                >
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-fg-muted">{project.units?.length ?? 0} unidades</span>
                <span className="text-fg-subtle">
                  {new Date(project.createdAt).toLocaleDateString('es-AR')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
