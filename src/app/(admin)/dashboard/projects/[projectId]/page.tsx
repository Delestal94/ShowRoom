import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { listToursByProject } from '@/modules/tours/tour-service'
import { getSiteUrl } from '@/lib/site-url'
import { StatCard } from '@/components/dashboard/stat-card'
import { ButtonLink } from '@/components/ui/button'
import { CopyLinkButton } from './copy-link-button'

export const metadata: Metadata = { title: 'Proyecto' }

const TOUR_KIND_LABEL: Record<string, string> = {
  '360': 'Panorámica 360°',
  'glb-model': 'Modelo 3D',
  image: 'Foto',
  'drone-video': 'Video drone',
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { projectId: string }
}) {
  const tenant = await requireCurrentTenant()
  const project = await getProject(tenant.tenantId, params.projectId)
  if (!project) notFound()

  const tours = await listToursByProject(tenant.tenantId, params.projectId)
  const publicUrl = new URL(`/${project.slug}`, getSiteUrl()).toString()
  const availableUnits = project.units?.filter((u) => u.status === 'available').length ?? 0

  return (
    <div>
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver a proyectos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-fg">{project.name}</h1>
          <p className="mt-1 text-fg-muted">{project.address || 'Sin dirección'}</p>
        </div>
        <span
          className={
            project.status === 'published'
              ? 'rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success'
              : 'rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning'
          }
        >
          {project.status === 'published' ? 'Publicado' : 'Borrador'}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Unidades totales" value={project.units?.length ?? 0} />
        <StatCard label="Disponibles" value={availableUnits} />
        <StatCard label="Tours subidos" value={tours.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg">Unidades</h2>
          </div>

          {!project.units || project.units.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">Todavía no hay unidades cargadas.</p>
          ) : (
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {project.units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <span className="font-medium text-fg">{unit.code}</span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                    {unit.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-fg">Tours</h2>
            <ButtonLink href={`/dashboard/projects/${project.id}/tours/new`} size="sm" variant="outline">
              + Subir tour
            </ButtonLink>
          </div>

          {tours.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">Todavía no subiste ningún tour.</p>
          ) : (
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {tours.map((tour) => (
                <div key={tour.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-fg">
                      {TOUR_KIND_LABEL[tour.kind] ?? tour.kind}
                    </span>
                    <span
                      className={
                        tour.status === 'ready'
                          ? 'shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success'
                          : 'shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning'
                      }
                    >
                      {tour.status === 'ready' ? 'Listo' : 'Procesando'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-fg-subtle">{tour.storageKey}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <h3 className="font-semibold text-fg">Link público</h3>
        <p className="mt-1 text-sm text-fg-muted">
          Compartilo con compradores para que recorran el proyecto.
          {project.status !== 'published' && ' Publicalo para que sea visible.'}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface px-4 py-2.5 font-mono text-sm text-fg">
            {publicUrl}
          </div>
          <CopyLinkButton url={publicUrl} />
        </div>
      </section>
    </div>
  )
}
