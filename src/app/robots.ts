import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().origin

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // El panel y las pantallas de sesión no aportan nada a un buscador
          // y sólo generan rastreo inútil sobre rutas que devuelven redirect.
          '/dashboard',
          '/super-admin',
          '/sign-in',
          '/sign-up',
          '/invitacion/',
          '/api/',
          // El modo embebido es la misma página sin chrome: indexarla sería
          // contenido duplicado compitiendo contra la original.
          '/*?embed=1',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
