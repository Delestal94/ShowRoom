import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

const COLUMNS = [
  {
    title: 'Producto',
    links: [
      { href: '#producto', label: 'Tours 3D' },
      { href: '#producto', label: 'Buscador de unidades' },
      { href: '#producto', label: 'CRM de leads' },
      { href: '#producto', label: 'Analytics' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { href: '#como-funciona', label: 'Cómo funciona' },
      { href: '#precios', label: 'Precios' },
      { href: '/sign-up', label: 'Crear cuenta' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Términos' },
      { href: '#', label: 'Privacidad' },
      { href: '#', label: 'Cookies' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
              Mostrá tus proyectos antes de construirlos. Tours 3D, inventario y CRM en una sola
              plataforma.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-fg">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-fg-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-fg-subtle">
            © {new Date().getFullYear()} ShowRoom. Todos los derechos reservados.
          </p>
          <p className="font-mono text-xs text-fg-subtle">Hecho con Next.js · Supabase · Three.js</p>
        </div>
      </div>
    </footer>
  )
}
