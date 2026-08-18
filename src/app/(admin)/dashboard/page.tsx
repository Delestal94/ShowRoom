import type { Metadata } from 'next'
import Link from 'next/link'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { listProjects } from '@/modules/projects/project-service'
import { getLeadStats } from '@/modules/leads/lead-service'
import { StatCard } from '@/components/dashboard/stat-card'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Panel' }

export default async function DashboardHomePage() {
  const tenant = await requireCurrentTenant()
  const [projects, leadStats] = await Promise.all([
    listProjects(tenant.tenantId),
    getLeadStats(tenant.tenantId),
  ])

  const unitCount = projects.reduce((sum, p) => sum + (p.units?.length ?? 0), 0)
  const published = projects.filter((p) => p.status === 'published').length

  // The checklist reflects what's actually missing, so it stops showing
  // steps the user already completed.
  const steps = [
    {
      done: projects.length > 0,
      title: 'Creá tu primer proyecto',
      body: 'Nombre, dirección y el slug de su URL pública.',
      href: '/dashboard/projects/new',
      cta: 'Crear proyecto',
    },
    {
      done: unitCount > 0,
      title: 'Cargá las unidades',
      body: 'Una por una, o pegando varias de golpe desde una planilla.',
      href: projects[0] ? `/dashboard/projects/${projects[0].id}/units` : '/dashboard/projects',
      cta: 'Cargar unidades',
    },
    {
      done: published > 0,
      title: 'Publicá y compartí el link',
      body: 'Mientras esté en borrador, la página pública no es visible.',
      href: projects[0] ? `/dashboard/projects/${projects[0].id}` : '/dashboard/projects',
      cta: 'Ir al proyecto',
    },
  ]

  const pending = steps.filter((s) => !s.done)

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Panel</p>
        <h1 className="mt-3 text-headline font-semibold text-gradient">{tenant.tenantName}</h1>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-4">
        <StatCard label="Proyectos" value={projects.length} />
        <StatCard label="Publicados" value={published} />
        <StatCard label="Unidades" value={unitCount} />
        <StatCard label="Leads" value={leadStats.total} />
      </div>

      {pending.length > 0 && (
        <section className="mt-12">
          <h2 className="text-title font-semibold text-fg">Próximos pasos</h2>
          <ol className="mt-5 space-y-3">
            {pending.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/40 p-6 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-fg">{step.title}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{step.body}</p>
                  </div>
                </div>
                <ButtonLink href={step.href} variant="outline" size="sm" className="shrink-0">
                  {step.cta}
                </ButtonLink>
              </li>
            ))}
          </ol>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-title font-semibold text-fg">Tus proyectos</h2>
            <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="mt-5 space-y-2">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface/40 p-5 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-fg">{project.name}</h3>
                  <p className="mt-0.5 text-sm text-fg-muted">
                    {project.units?.length ?? 0} unidades
                  </p>
                </div>
                <span
                  className={
                    project.status === 'published'
                      ? 'shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success'
                      : 'shrink-0 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning'
                  }
                >
                  {project.status === 'published' ? 'Publicado' : 'Borrador'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
