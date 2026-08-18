import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) {
    redirect('/sign-in?redirectTo=/dashboard')
  }

  // Present only when served from a tenant subdomain; null on the apex host.
  const tenantSlug = headers().get('x-tenant-slug')

  return (
    <DashboardShell email={user.email ?? ''} tenantSlug={tenantSlug}>
      {children}
    </DashboardShell>
  )
}
