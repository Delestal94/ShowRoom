import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { getUser } from '@/lib/supabase/server'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { withTenant } from '@/server/db/tenant-db'
import { tenants } from '@/server/db/schema'
import { SettingsForm } from './settings-form'

export const metadata: Metadata = { title: 'Ajustes' }

export default async function SettingsPage() {
  const [user, tenant] = await Promise.all([getUser(), requireCurrentTenant()])

  const row = await withTenant(tenant.tenantId, (tx) =>
    tx.query.tenants.findFirst({ where: eq(tenants.id, tenant.tenantId) })
  )

  return (
    <div className="max-w-lg">
      <h1 className="text-title font-semibold text-fg">Ajustes</h1>
      <p className="mt-1 text-fg-muted">Datos de tu cuenta y tu inmobiliaria</p>

      <div className="mt-8 rounded-2xl border border-border bg-surface/50 p-6">
        <SettingsForm
          defaults={{
            name: row?.name ?? tenant.tenantName,
            whatsapp: row?.contactWhatsapp ?? '',
          }}
        />
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-medium text-fg-muted">Cuenta</h2>
          <p className="mt-2 text-fg">{user?.email}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-medium text-fg-muted">Identificador</h2>
          <p className="mt-2 font-mono text-sm text-fg-subtle">{tenant.tenantSlug}</p>
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
