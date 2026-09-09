import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Server Components cannot write cookies, so the setters are wrapped in
 * try/catch — session refresh is handled by the middleware instead.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
      },
    }
  )
}

/**
 * Returns the authenticated user, or null. Always use this instead of
 * getSession() on the server: getUser() revalidates the token with Supabase.
 *
 * Wrapped in React's cache() so the layout, page and any nested helper that
 * all need the current user within one request share a single round trip
 * to Supabase Auth instead of one each.
 */
export const getUser = cache(async () => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
