import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/modules/tenancy/current-tenant'
import { isSuperAdmin } from '@/modules/platform/platform-service'
import { DashboardShell } from '@/components/dashboard/shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) {
    redirect('/sign-in?redirectTo=/dashboard')
  }

  // Provisions the tenant on first login — see current-tenant.ts.
  const tenant = await getCurrentTenant()
  if (!tenant) {
    redirect('/sign-in?redirectTo=/dashboard')
  }

  const superAdmin = await isSuperAdmin()

  return (
    <DashboardShell
      email={user.email ?? ''}
      tenantName={tenant.tenantName}
      isSuperAdmin={superAdmin}
    >
      {children}
    </DashboardShell>
  )
}
