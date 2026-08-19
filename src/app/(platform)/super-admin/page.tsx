import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  isSuperAdmin,
  getPlatformStats,
  listTenantSummaries,
} from '@/modules/platform/platform-service'
import { StatCard } from '@/components/dashboard/stat-card'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = { title: 'Plataforma' }

export default async function SuperAdminPage() {
  // notFound() en vez de un "acceso denegado": para quien no es super-admin,
  // la existencia misma del panel es información que no necesita.
  if (!(await isSuperAdmin())) notFound()

  const [stats, tenants] = await Promise.all([
    getPlatformStats(),
    listTenantSummaries(),
  ])

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/40">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Plataforma
            </span>
          </div>
          <Link href="/dashboard" className="text-sm text-fg-muted hover:text-fg">
            Ir a mi panel
          </Link>
        </div>
      </header>

      <main className="container-page py-10">
        <h1 className="text-title font-semibold text-fg">Resumen de la plataforma</h1>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatCard label="Inmobiliarias" value={stats.tenants} />
          <StatCard label="Suscripciones" value={stats.activeSubscriptions} />
          <StatCard label="Proyectos" value={stats.projects} />
          <StatCard label="Publicados" value={stats.publishedProjects} />
          <StatCard label="Unidades" value={stats.units} />
          <StatCard label="Leads" value={stats.leads} />
        </div>

        <section className="mt-10">
          <h2 className="text-title font-semibold text-fg">Inmobiliarias</h2>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-surface/50">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-subtle">
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">Proyectos</th>
                  <th className="p-3 font-medium">Unidades</th>
                  <th className="p-3 font-medium">Leads</th>
                  <th className="p-3 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <p className="font-medium text-fg">{t.name}</p>
                      <p className="font-mono text-xs text-fg-subtle">{t.slug}</p>
                    </td>
                    <td className="p-3">
                      {t.plan ? (
                        <span
                          className={
                            t.subscriptionStatus === 'authorized'
                              ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success'
                              : 'rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning'
                          }
                        >
                          {t.plan}
                        </span>
                      ) : (
                        <span className="text-fg-subtle">Gratis</span>
                      )}
                    </td>
                    <td className="p-3 text-fg-muted">{t.projects}</td>
                    <td className="p-3 text-fg-muted">{t.units}</td>
                    <td className="p-3 text-fg-muted">{t.leads}</td>
                    <td className="p-3 text-fg-subtle">
                      {t.createdAt.toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-fg-subtle">
            Sólo conteos agregados. El panel no expone leads ni datos de contacto de los
            clientes de cada inmobiliaria.
          </p>
        </section>
      </main>
    </div>
  )
}
