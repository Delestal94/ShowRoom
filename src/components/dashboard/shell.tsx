'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { signOutAction } from '@/app/(auth)/actions'
import { cn } from '@/lib/cn'

const ICONS = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z',
  projects: 'M4 7.5A1.5 1.5 0 0 1 5.5 6h3.2l1.8 2h8A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-10Z',
  leads: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35',
  analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  billing: 'M3 9.5h18M5 6h14a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0119 18H5a1.5 1.5 0 01-1.5-1.5v-9A1.5 1.5 0 015 6ZM7 14h3',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a8 8 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.1-1.2L15 3H9l-.5 2.7a8 8 0 0 0-2.1 1.2l-2.3-1-2 3.4 2 1.5a8 8 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 2.1 1.2L9 21h6l.5-2.7a8 8 0 0 0 2.1-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z',
}

function NavIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path d={path} />
    </svg>
  )
}

export function DashboardShell({
  email,
  tenantName,
  isSuperAdmin = false,
  children,
}: {
  email: string
  tenantName: string
  isSuperAdmin?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const base = '/dashboard'
  const nav = [
    { href: base, label: 'Resumen', icon: ICONS.home },
    { href: `${base}/projects`, label: 'Proyectos', icon: ICONS.projects },
    { href: `${base}/crm`, label: 'Leads', icon: ICONS.leads },
    { href: `${base}/analytics`, label: 'Analytics', icon: ICONS.analytics },
    { href: `${base}/billing`, label: 'Plan', icon: ICONS.billing },
    { href: `${base}/settings`, label: 'Ajustes', icon: ICONS.settings },
  ]

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface/80 backdrop-blur-xl transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 flex-col justify-center border-b border-border px-5">
          <Logo href={base} />
          <p className="mt-0.5 truncate pl-9 text-xs text-fg-subtle">{tenantName}</p>
        </div>

        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const active =
              item.href === base
                ? pathname === base
                : pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/12 font-medium text-primary'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                )}
              >
                <NavIcon path={item.icon} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-border p-3">
          <div className="rounded-md bg-surface-2/60 p-3">
            <p className="truncate text-xs text-fg-muted" title={email}>
              {email}
            </p>
            {isSuperAdmin && (
              <Link
                href="/super-admin"
                className="mt-1 block text-xs font-medium text-primary hover:underline"
              >
                Panel de plataforma
              </Link>
            )}
            <form action={signOutAction} className="mt-2">
              <button
                type="submit"
                className="text-xs font-medium text-fg-subtle transition-colors hover:text-danger"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-bg/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-5 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="grid h-10 w-10 place-items-center rounded-md border border-border"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Logo href={base} />
        </header>

        <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  )
}
