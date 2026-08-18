import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Hosts that never carry a tenant subdomain: local dev and Vercel-generated
 * deployment URLs. Without this, `show-room-ten.vercel.app` would resolve
 * "show-room-ten" as a tenant slug.
 */
function resolveTenantSlug(hostname: string): string | null {
  const host = hostname.split(':')[0]

  if (host === 'localhost' || host.endsWith('.vercel.app') || host === 'vercel.app') {
    return null
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  if (rootDomain && host.endsWith(`.${rootDomain}`)) {
    const slug = host.slice(0, -(rootDomain.length + 1))
    return slug && slug !== 'www' ? slug : null
  }

  return null
}

const PROTECTED_PREFIXES = ['/dashboard']
const AUTH_ROUTES = ['/sign-in', '/sign-up']

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const tenantSlug = resolveTenantSlug(request.headers.get('host') ?? '')

  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug)
  } else {
    requestHeaders.delete('x-tenant-slug')
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: requestHeaders } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: requestHeaders } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refreshes the auth token and keeps cookies in sync.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Atribución por broker: el código llega en ?ref= al aterrizar, pero el
  // visitante navega varias páginas antes de dejar sus datos. Se guarda en
  // una cookie para que el lead siga atribuido al broker que lo trajo.
  const ref = request.nextUrl.searchParams.get('ref')
  if (ref && /^[A-Z0-9]{4,16}$/.test(ref)) {
    response.cookies.set('sr_ref', ref, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }

  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never need
     * session refresh and skipping them keeps middleware cost down.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|hdr)$).*)',
  ],
}
