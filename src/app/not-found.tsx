import { ButtonLink } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-lines mask-fade-b opacity-30" />
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <Logo />

      <p className="mt-14 font-mono text-sm tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-4 text-headline font-semibold text-gradient">Esta página no existe</h1>
      <p className="mt-5 max-w-prose text-lead text-fg-muted">
        Puede que el proyecto todavía no esté publicado, que el link haya cambiado, o que la
        dirección tenga un error.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" size="lg">
          Volver al inicio
        </ButtonLink>
        <ButtonLink href="/dashboard" variant="outline" size="lg">
          Ir al panel
        </ButtonLink>
      </div>
    </div>
  )
}
