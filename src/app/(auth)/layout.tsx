import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

const HIGHLIGHTS = [
  'Recorridos 3D y 360° sin plugins',
  'Inventario con precios en tiempo real',
  'Leads atribuidos a cada broker',
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-fg-muted transition-colors hover:text-fg">
            ← Volver
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm animate-fade-up">{children}</div>
        </div>

        <p className="text-center text-xs text-fg-subtle">
          Al continuar aceptás los términos y la política de privacidad.
        </p>
      </div>

      {/* Brand column */}
      <aside className="relative hidden overflow-hidden border-l border-border bg-surface/40 lg:block">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 grid-lines opacity-40" />
          <div className="absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[10%] h-64 w-64 rounded-full bg-accent/10 blur-[90px]" />
        </div>

        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <svg viewBox="0 0 200 200" className="h-40 w-40 animate-float" fill="none" aria-hidden>
            <g stroke="oklch(0.72 0.18 275)" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M100 24 168 60v80l-68 36-68-36V60l68-36Z" />
              <path d="M32 60l68 36 68-36M100 96v80" opacity="0.55" />
              <path d="M32 86l68 36 68-36M32 112l68 36 68-36" opacity="0.3" />
            </g>
          </svg>

          <h2 className="mt-10 max-w-md text-headline font-semibold text-gradient">
            El showroom que nunca cierra
          </h2>
          <p className="mt-5 max-w-md text-lead text-fg-muted">
            Compradores recorriendo tus unidades a cualquier hora, desde cualquier dispositivo.
          </p>

          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-fg-muted">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10">
                  <svg viewBox="0 0 20 20" className="h-3 w-3 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
