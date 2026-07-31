import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/(public)(.*)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
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

  // If not a public route and no tenant, redirect
  if (!isPublicRoute(req) && !tenantSlug) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  // Protected routes: enforce auth
  if (!isPublicRoute(req)) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
