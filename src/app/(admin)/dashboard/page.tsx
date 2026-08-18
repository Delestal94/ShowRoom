import type { Metadata } from 'next'
import Link from 'next/link'
import { getUser } from '@/lib/supabase/server'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Panel' }

const NEXT_STEPS = [
  {
    title: 'Creá tu primer proyecto',
    body: 'Cargá nombre, dirección y estado. Después sumás las unidades.',
    href: '/dashboard/projects',
    cta: 'Crear proyecto',
  },
  {
    title: 'Subí un modelo 3D',
    body: 'Un archivo GLB o un set de panorámicas 360°. Se sube directo al storage.',
    href: '/dashboard/projects',
    cta: 'Ir a proyectos',
  },
  {
    title: 'Compartí el link público',
    body: 'Cada proyecto publicado tiene su propia URL lista para mandar.',
    href: '/dashboard/projects',
    cta: 'Ver proyectos',
  },
]

export default async function DashboardHomePage() {
  const user = await getUser()
  const name = user?.email?.split('@')[0] ?? 'de nuevo'

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Panel</p>
        <h1 className="mt-3 text-headline font-semibold text-gradient">Hola, {name}</h1>
        <p className="mt-4 max-w-prose text-lead text-fg-muted">
          Tu cuenta está lista. Empezá cargando un proyecto para publicar tu primer showroom.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Proyectos', value: '0' },
          { label: 'Unidades', value: '0' },
          { label: 'Leads', value: '0' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface/50 p-6">
            <p className="text-3xl font-semibold tracking-tight text-fg">{stat.value}</p>
            <p className="mt-1 text-sm text-fg-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-title font-semibold text-fg">Próximos pasos</h2>
        <ol className="mt-5 space-y-3">
          {NEXT_STEPS.map((step, i) => (
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

      <p className="mt-10 text-sm text-fg-subtle">
        ¿Buscás la vista pública?{' '}
        <Link href="/" className="text-primary hover:underline">
          Volver al sitio
        </Link>
      </p>
    </div>
  )
}
