import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Extract tenant from subdomain or domain
  const hostname = req.headers.get('host') || ''

  // Handle subdomains: tenant.showroom.local or tenant.showroom.app
  const subdomainMatch = hostname.match(/^([a-z0-9-]+)\./)
  const tenantSlug = subdomainMatch ? subdomainMatch[1] : null

  // Store tenant in headers for downstream usage
  const requestHeaders = new Headers(req.headers)
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug)
  }

  // Don't require tenant for public routes and API routes
  const pathname = req.nextUrl.pathname
  const isPublic = pathname.startsWith('/sign-in') ||
                   pathname.startsWith('/sign-up') ||
                   pathname.startsWith('/(public)') ||
                   pathname.startsWith('/api/')

  // If not a public route and no tenant, redirect to sign-in
  if (!isPublic && !tenantSlug) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
