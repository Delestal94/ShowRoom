import { ButtonLink } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'
import { cn } from '@/lib/cn'

const PLANS = [
  {
    name: 'Solo',
    price: '49',
    tagline: 'Para un proyecto puntual',
    features: [
      '1 proyecto activo',
      'Hasta 40 unidades',
      'Visor 3D + 360°',
      'Formulario de leads',
      'Subdominio showroom.app',
    ],
    cta: 'Empezar',
    highlight: false,
  },
  {
    name: 'Lite',
    price: '149',
    tagline: 'Para desarrolladoras en crecimiento',
    features: [
      '5 proyectos activos',
      'Hasta 300 unidades',
      'CRM con pipeline Kanban',
      'Links de broker con tracking',
      'Analytics de recorrido',
      'Soporte prioritario',
    ],
    cta: 'Empezar',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '399',
    tagline: 'Para operaciones con varias torres',
    features: [
      'Proyectos ilimitados',
      'Unidades ilimitadas',
      'Dominio propio',
      'Heatmaps por unidad',
      'Reportes segregados por broker',
      'Múltiples usuarios y roles',
    ],
    cta: 'Hablar con ventas',
    highlight: false,
  },
]

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Pricing() {
  return (
    <section id="precios" className="relative scroll-mt-20 py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Precios</p>
          <h2 className="mt-4 text-headline font-semibold text-gradient">
            Elegí según tu inventario
          </h2>
          <p className="mt-5 text-lead text-fg-muted">
            Todos los planes incluyen visor 3D, hosting de assets y actualizaciones. Sin costo por
            visita.
          </p>
        </Reveal>

        <div className="mt-16 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90}>
              <div
                className={cn(
                  'relative h-full rounded-2xl border p-8 transition-colors',
                  plan.highlight
                    ? 'border-primary/50 bg-surface glow-primary lg:-mt-4 lg:pb-12'
                    : 'border-border bg-surface/40 hover:border-border-strong'
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-fg">
                    Más elegido
                  </span>
                )}

                <h3 className="text-lg font-semibold text-fg">{plan.name}</h3>
                <p className="mt-1 text-sm text-fg-subtle">{plan.tagline}</p>

                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-sm text-fg-muted">USD</span>
                  <span className="text-4xl font-semibold tracking-tight text-fg">{plan.price}</span>
                  <span className="text-sm text-fg-muted">/mes</span>
                </p>

                <ButtonLink
                  href="/sign-up"
                  variant={plan.highlight ? 'primary' : 'outline'}
                  className="mt-7 w-full"
                >
                  {plan.cta}
                </ButtonLink>

                <ul className="mt-8 space-y-3 border-t border-border pt-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-fg-muted">
                      <Check />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
