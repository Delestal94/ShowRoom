import type { Metadata } from 'next'
import { getUser } from '@/lib/supabase/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'

export const metadata: Metadata = { title: 'Ajustes' }

export default async function SettingsPage() {
  const [user, tenant] = await Promise.all([getUser(), requireCurrentTenant()])

  return (
    <div className="max-w-lg">
      <h1 className="text-title font-semibold text-fg">Ajustes</h1>
      <p className="mt-1 text-fg-muted">Datos de tu cuenta y tu inmobiliaria</p>

      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-medium text-fg-muted">Cuenta</h2>
          <p className="mt-2 text-fg">{user?.email}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-medium text-fg-muted">Inmobiliaria</h2>
          <p className="mt-2 text-fg">{tenant.tenantName}</p>
          <p className="mt-1 font-mono text-xs text-fg-subtle">{tenant.tenantSlug}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-medium text-fg-muted">Rol</h2>
          <p className="mt-2 text-fg">
            {tenant.role === 'tenant_admin' ? 'Administrador' : tenant.role}
          </p>
        </div>
      </div>
    </div>
  )
}
