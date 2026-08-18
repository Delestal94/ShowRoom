import { Reveal } from '@/components/ui/reveal'
import { cn } from '@/lib/cn'

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5', className)}
      aria-hidden
    >
      <path d={path} />
    </svg>
  )
}

const ICONS = {
  cube: 'M12 2.5 21 7.5v9L12 21.5 3 16.5v-9L12 2.5ZM3 7.5l9 5 9-5M12 12.5v9',
  panorama: 'M12 21a9 4.5 0 100-9 9 4.5 0 000 9ZM3 8.5v7M21 8.5v7M12 3v3.5',
  filter: 'M4 6h16M7 12h10M10 18h4',
  users: 'M16 19v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 17.5V19M10 10.5a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5ZM20 19v-1.5a3.5 3.5 0 00-2.5-3.35M15.5 4.2a3.25 3.25 0 010 6.3',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  shield: 'M12 2.5l8 3v5.5c0 5-3.4 9.3-8 10.5-4.6-1.2-8-5.5-8-10.5V5.5l8-3ZM9 12l2 2 4-4',
}

const PRIMARY = [
  {
    icon: ICONS.cube,
    title: 'Visor 3D navegable',
    body: 'Modelos GLB con órbita libre, navegación piso por piso y tres modos de iluminación —día, atardecer y noche— para que el comprador vea cómo entra la luz en su unidad.',
    tag: 'Three.js',
  },
  {
    icon: ICONS.panorama,
    title: 'Recorridos 360°',
    body: 'Panorámicas inmersivas con hotspots entre ambientes. Se cargan en el navegador, sin apps ni plugins.',
    tag: 'Pannellum',
  },
]

const SECONDARY = [
  {
    icon: ICONS.filter,
    title: 'Buscador de unidades',
    body: 'Filtros por precio, m², orientación, dormitorios y piso, sobre inventario en tiempo real.',
  },
  {
    icon: ICONS.users,
    title: 'CRM de leads',
    body: 'Pipeline Kanban, timeline de actividad y links por broker para atribuir cada consulta.',
  },
  {
    icon: ICONS.chart,
    title: 'Analytics del recorrido',
    body: 'Qué unidad se mira más, cuánto tiempo y dónde se abandona. Datos, no intuiciones.',
  },
  {
    icon: ICONS.shield,
    title: 'Aislamiento multi-tenant',
    body: 'Cada desarrolladora con sus datos separados a nivel de base de datos, no sólo de la app.',
  },
]

export function Features() {
  return (
    <section id="producto" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Producto</p>
          <h2 className="mt-4 text-headline font-semibold text-gradient">
            Todo lo que necesita una preventa
          </h2>
          <p className="mt-5 text-lead text-fg-muted">
            Dejá de mandar PDFs y renders sueltos por WhatsApp. Un solo link donde el comprador
            recorre, filtra, compara y te deja los datos.
          </p>
        </Reveal>

        {/* Bento grid */}
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {PRIMARY.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 90}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface/60 p-8 transition-colors hover:border-border-strong">
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/20 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-md border border-border bg-surface-2 text-primary">
                      <Icon path={feature.icon} />
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 font-mono text-[11px] text-fg-subtle">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="mt-6 text-title font-semibold text-fg">{feature.title}</h3>
                  <p className="mt-3 leading-relaxed text-fg-muted">{feature.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECONDARY.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 70}>
              <article className="h-full rounded-2xl border border-border bg-surface/40 p-6 transition-colors hover:border-border-strong hover:bg-surface/70">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-border bg-surface-2 text-accent">
                  <Icon path={feature.icon} />
                </span>
                <h3 className="mt-5 font-semibold text-fg">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
