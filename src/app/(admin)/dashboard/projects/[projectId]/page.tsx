import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getProject } from '@/modules/projects/project-service'
import { listToursByProject } from '@/modules/tours/tour-service'
import { getSiteUrl } from '@/lib/site-url'
import { UNIT_STATUS_LABEL } from '@/modules/units/unit-constants'
import { StatCard } from '@/components/dashboard/stat-card'
import { ButtonLink } from '@/components/ui/button'
import { SharePanel } from './share-panel'
import { PublishToggle, DeleteProjectButton } from './project-controls'

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
  const qrUrl = new URL(`/api/projects/${project.slug}/qr`, getSiteUrl()).toString()
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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title font-semibold text-fg">{project.name}</h1>
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
          <p className="mt-1 text-fg-muted">{project.address || 'Sin dirección'}</p>
        </div>

        <div className="flex items-start gap-2">
          <ButtonLink href={`/dashboard/projects/${project.id}/edit`} size="sm" variant="outline">
            Editar
          </ButtonLink>
          <PublishToggle projectId={project.id} status={project.status} />
        </div>
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
            <ButtonLink
              href={`/dashboard/projects/${project.id}/units`}
              size="sm"
              variant="outline"
            >
              Gestionar
            </ButtonLink>
          </div>

          {!project.units || project.units.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">
              Todavía no hay unidades cargadas. Sin inventario, la página pública se ve vacía.
            </p>
          ) : (
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {project.units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <span className="font-medium text-fg">{unit.code}</span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
                    {UNIT_STATUS_LABEL[unit.status] ?? unit.status}
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

      <section className="mt-6 rounded-2xl border border-border bg-surface/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-fg">Avances de obra</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Novedades para quienes ya consultaron por el proyecto.
            </p>
          </div>
          <ButtonLink
            href={`/dashboard/projects/${project.id}/avances`}
            size="sm"
            variant="outline"
          >
            Gestionar avances
          </ButtonLink>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-fg">Brokers</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Un link por broker para saber quién trae cada consulta.
            </p>
          </div>
          <ButtonLink
            href={`/dashboard/projects/${project.id}/brokers`}
            size="sm"
            variant="outline"
          >
            Gestionar brokers
          </ButtonLink>
        </div>
      </section>

      <div className="mt-6">
        <SharePanel
          publicUrl={publicUrl}
          qrUrl={qrUrl}
          slug={project.slug}
          published={project.status === 'published'}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-danger/25 p-6">
        <h3 className="font-semibold text-fg">Zona de riesgo</h3>
        <div className="mt-4">
          <DeleteProjectButton projectId={project.id} />
        </div>
      </section>
    </div>
  )
}
