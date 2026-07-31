import { headers } from 'next/headers'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">No tenant found in request</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6">
          <Link href={`/dashboard/${tenantSlug}`} className="text-lg font-bold text-gray-900">
            ShowRoom
          </Link>
          <p className="text-xs text-gray-500 mt-1">{tenantSlug}</p>
        </div>

        <nav className="space-y-1 px-3 py-6">
          <NavLink href={`/dashboard/${tenantSlug}`} label="Dashboard" />
          <NavLink href={`/dashboard/${tenantSlug}/projects`} label="Projects" />
          <NavLink href={`/dashboard/${tenantSlug}/leads`} label="Leads" />
          <NavLink href={`/dashboard/${tenantSlug}/analytics`} label="Analytics" />
          <NavLink href={`/dashboard/${tenantSlug}/settings`} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
    >
      {label}
    </Link>
  )
}
