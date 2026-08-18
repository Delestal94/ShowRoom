import { Reveal } from '@/components/ui/reveal'

const STEPS = [
  {
    n: '01',
    title: 'Cargá el proyecto',
    body: 'Creás el proyecto, sumás las unidades con precio, m² y orientación, y subís el modelo 3D o las panorámicas 360°. La subida va directo al storage, sin límites de tamaño.',
  },
  {
    n: '02',
    title: 'Publicá el link',
    body: 'Cada proyecto tiene su propia URL pública. La compartís por WhatsApp, la ponés en el aviso o le generás un link con tracking a cada broker.',
  },
  {
    n: '03',
    title: 'Recibí los leads',
    body: 'Las consultas entran al pipeline con la unidad que estaban mirando, el broker que la originó y el recorrido completo de la sesión.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-20 border-y border-border bg-surface/30 py-24 sm:py-32">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Cómo funciona</p>
          <h2 className="mt-4 text-headline font-semibold text-gradient">De la maqueta al lead</h2>
          <p className="mt-5 text-lead text-fg-muted">
            Tres pasos. No necesitás equipo técnico ni saber nada de 3D.
          </p>
        </Reveal>

        <ol className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 110}>
              <li className="relative h-full list-none">
                {/* Connector between steps */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[calc(100%+0.5rem)] top-6 hidden h-px w-[calc(2rem-1rem)] bg-gradient-to-r from-border-strong to-transparent md:block"
                  />
                )}
                <span className="inline-grid h-12 w-12 place-items-center rounded-full border border-border bg-surface font-mono text-sm font-medium text-primary">
                  {step.n}
                </span>
                <h3 className="mt-6 text-title font-semibold text-fg">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-fg-muted">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
