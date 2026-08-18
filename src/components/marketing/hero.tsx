import { ButtonLink } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'

const STATS = [
  { value: '3D + 360°', label: 'Recorridos navegables' },
  { value: '−40%', label: 'Tiempo de decisión del comprador' },
  { value: '24/7', label: 'Showroom siempre abierto' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-lines mask-fade-b opacity-40" />
        <div className="absolute left-1/2 top-[-10%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute right-[8%] top-[35%] h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="container-page">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-fg-muted backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Vendé en pozo sin una sola pared construida
          </span>

          <h1 className="mt-7 text-display font-semibold">
            <span className="text-gradient">Tu proyecto,</span>
            <br />
            <span className="text-gradient-brand">recorrido en 3D</span>
          </h1>

          <p className="mx-auto mt-7 max-w-prose text-lead text-fg-muted">
            Subís el modelo y ShowRoom hace el resto: recorridos interactivos, buscador de unidades
            con precios en vivo, captura de leads y métricas de qué se mira realmente.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/sign-up" size="lg">
              Crear mi showroom
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </ButtonLink>
            <ButtonLink href="#producto" variant="outline" size="lg">
              Ver una demo
            </ButtonLink>
          </div>

          <p className="mt-5 text-sm text-fg-subtle">
            Sin tarjeta de crédito · Configurás tu primer proyecto en minutos
          </p>
        </Reveal>

        {/* Product preview */}
        <Reveal delay={140} className="mt-20">
          <ViewerPreview />
        </Reveal>

        <Reveal delay={220}>
          <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-surface/70 px-6 py-8 text-center backdrop-blur">
                <dt className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                  {stat.value}
                </dt>
                <dd className="mt-1.5 text-sm text-fg-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}

/** Static chrome that frames what the storefront looks like in use. */
function ViewerPreview() {
  return (
    <div className="glow-primary mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Window bar */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-2/60 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-full bg-bg/70 px-4 py-1 font-mono text-[11px] text-fg-subtle">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
          </svg>
          torre-almagro.showroom.app
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_15rem]">
        {/* Canvas area */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-surface-2 via-surface to-bg">
          <div aria-hidden className="absolute inset-0 grid-lines opacity-30" />
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl"
          />

          {/* Stand-in for the rendered building */}
          <svg
            viewBox="0 0 200 200"
            className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 animate-float"
            fill="none"
          >
            <g stroke="oklch(0.72 0.18 275)" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M100 24 168 60v80l-68 36-68-36V60l68-36Z" opacity="0.9" />
              <path d="M32 60l68 36 68-36M100 96v80" opacity="0.55" />
              <path d="M32 86l68 36 68-36M32 112l68 36 68-36" opacity="0.3" />
            </g>
          </svg>

          {/* Lighting mode toggle */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-bg/80 p-1 backdrop-blur">
            {['Día', 'Atardecer', 'Noche'].map((mode, i) => (
              <span
                key={mode}
                className={
                  i === 1
                    ? 'rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-medium text-primary-fg'
                    : 'rounded-full px-3.5 py-1.5 text-[11px] text-fg-muted'
                }
              >
                {mode}
              </span>
            ))}
          </div>
        </div>

        {/* Unit sidebar */}
        <aside className="hidden border-l border-border bg-surface-2/40 p-4 md:block">
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
            Unidades disponibles
          </p>
          <div className="mt-3 space-y-2">
            {[
              { code: '8°B', m2: '72 m²', price: 'USD 148.000', status: 'ok' },
              { code: '9°A', m2: '86 m²', price: 'USD 179.500', status: 'ok' },
              { code: '9°C', m2: '58 m²', price: 'Reservada', status: 'hold' },
              { code: '10°A', m2: '94 m²', price: 'USD 205.000', status: 'ok' },
            ].map((unit) => (
              <div key={unit.code} className="rounded-md border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-fg">{unit.code}</span>
                  <span
                    className={
                      unit.status === 'ok'
                        ? 'h-1.5 w-1.5 rounded-full bg-success'
                        : 'h-1.5 w-1.5 rounded-full bg-warning'
                    }
                  />
                </div>
                <p className="mt-0.5 text-[11px] text-fg-subtle">{unit.m2}</p>
                <p className="mt-1.5 font-mono text-xs text-fg-muted">{unit.price}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
