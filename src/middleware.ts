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

const PROTECTED_PREFIXES = ['/dashboard', '/super-admin']
const AUTH_ROUTES = ['/sign-in', '/sign-up']

/** Si Supabase no responde en esto, se sigue sin bloquear la request. */
const AUTH_TIMEOUT_MS = 3000

function needsAuthCheck(pathname: string): boolean {
  return (
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    AUTH_ROUTES.includes(pathname)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const requestHeaders = new Headers(request.headers)
  const tenantSlug = resolveTenantSlug(request.headers.get('host') ?? '')

  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug)
  } else {
    requestHeaders.delete('x-tenant-slug')
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  // Atribución por broker: el código llega en ?ref= al aterrizar, pero el
  // visitante navega varias páginas antes de dejar sus datos. Es sólo una
  // cookie, sin viaje de red, así que corre en todas las rutas.
  const ref = request.nextUrl.searchParams.get('ref')
  if (ref && /^[A-Z0-9]{4,16}$/.test(ref)) {
    response.cookies.set('sr_ref', ref, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }

  // El chequeo de sesión es un viaje de red a Supabase. Hacerlo en TODAS las
  // rutas — landing, storefront, sitemap, imágenes OG — agregaba esa latencia
  // a páginas que no necesitan sesión, y cuando Supabase tardaba el
  // middleware se colgaba entero (MIDDLEWARE_INVOCATION_TIMEOUT).
  if (!needsAuthCheck(pathname)) {
    return response
  }

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

  let user = null
  try {
    // Con tope de tiempo: si Supabase no contesta, es preferible dejar pasar
    // y que el layout del panel resuelva el acceso —hace su propio getUser()—
    // antes que devolver un 504 a todo el sitio.
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
    ])
    user = result?.data?.user ?? null
  } catch {
    user = null
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
     * Se excluyen estáticos, imágenes y /api: las rutas de API hacen su
     * propia autenticación y no leen el header de tenant, así que pasar por
     * el middleware sólo les agrega latencia. Eso importa sobre todo en la
     * ingesta de analytics, que es el endpoint de más tráfico.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|glb|hdr)$).*)',
  ],
}
