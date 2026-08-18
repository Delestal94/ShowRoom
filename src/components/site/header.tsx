'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '#producto', label: 'Producto' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#precios', label: 'Precios' },
]

export function SiteHeader({ isAuthed }: { isAuthed: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-border/70 bg-bg/80 backdrop-blur-xl' : 'border-b border-transparent'
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthed ? (
            <ButtonLink href="/dashboard" size="sm">
              Ir al panel
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/sign-in" variant="ghost" size="sm">
                Iniciar sesión
              </ButtonLink>
              <ButtonLink href="/sign-up" size="sm">
                Empezar gratis
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="grid h-10 w-10 place-items-center rounded-md border border-border text-fg md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-bg/95 backdrop-blur-xl md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              {isAuthed ? (
                <ButtonLink href="/dashboard" className="w-full">
                  Ir al panel
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/sign-in" variant="outline" className="w-full">
                    Iniciar sesión
                  </ButtonLink>
                  <ButtonLink href="/sign-up" className="w-full">
                    Empezar gratis
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
