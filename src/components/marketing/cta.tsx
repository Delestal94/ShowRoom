import { ButtonLink } from '@/components/ui/button'
import { Reveal } from '@/components/ui/reveal'

export function CallToAction() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-16 text-center sm:px-16 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 grid-lines opacity-30" />
              <div className="absolute left-1/2 top-full h-80 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[110px]" />
            </div>

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-headline font-semibold text-gradient">
                Tu próxima torre ya se puede recorrer
              </h2>
              <p className="mx-auto mt-5 max-w-prose text-lead text-fg-muted">
                Creá tu cuenta, cargá un proyecto y compartí el link hoy mismo.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/sign-up" size="lg">
                  Crear cuenta gratis
                </ButtonLink>
                <ButtonLink href="/sign-in" variant="ghost" size="lg">
                  Ya tengo cuenta
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
