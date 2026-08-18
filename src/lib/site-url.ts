const FALLBACK = 'https://show-room-ten.vercel.app'

/**
 * Resolves the canonical site URL from the environment.
 *
 * Env values are frequently stored without a scheme ("example.com"), which
 * `new URL()` rejects — so normalize before parsing and fall back rather than
 * throwing, since this runs at build time and would fail the whole build.
 */
export function getSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]

  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (!value) continue

    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`

    try {
      return new URL(withScheme)
    } catch {
      // Malformed entry — try the next candidate.
    }
  }

  return new URL(FALLBACK)
}
