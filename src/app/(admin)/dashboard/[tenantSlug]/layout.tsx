import { headers } from 'next/headers'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { tenantSlug: string }
}) {
  const headersList = await headers()
  const currentPath = headersList.get('x-pathname') || ''

  const navItems = [
    { href: `/dashboard/${params.tenantSlug}`, label: 'Dashboard', icon: '📊' },
    { href: `/dashboard/${params.tenantSlug}/projects`, label: 'Projects', icon: '🏢' },
    { href: `/dashboard/${params.tenantSlug}/crm`, label: 'Leads & CRM', icon: '👥' },
    { href: `/dashboard/${params.tenantSlug}/analytics`, label: 'Analytics', icon: '📈' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">ShowRoom</h1>
          <p className="text-xs text-gray-600 mt-1">{params.tenantSlug}</p>
        </div>

        <nav className="p-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                currentPath === item.href || currentPath.startsWith(item.href.split('/').slice(0, -1).join('/'))
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200 bg-white">
          <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
