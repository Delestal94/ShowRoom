/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    // Los assets de los tours viven en Supabase Storage. Sin este host,
    // next/image rechaza la URL con INVALID_IMAGE_OPTIMIZE_REQUEST y la
    // imagen queda rota. (Antes acá sólo estaba Cloudflare, de cuando el
    // storage era R2.)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    // Orígenes externos que la app carga de verdad. Cualquier otro queda
    // bloqueado, así que si mañana se suma un CDN hay que listarlo acá.
    //
    // script-src incluye 'unsafe-inline' porque Next.js inyecta scripts
    // inline para la hidratación; sacarlo requiere pasar a nonces. Aun así
    // la lista de orígenes corta el vector más común: cargar un script de un
    // dominio ajeno.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https://*.supabase.co https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://picsum.photos https://fastly.picsum.photos https://unpkg.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.basemaps.cartocdn.com",
      "media-src 'self' https://*.supabase.co",
      "worker-src 'self' blob:",
      // Sin plugins ni <base> inyectable: dos vectores clásicos que la app
      // no necesita para nada.
      "object-src 'none'",
      "base-uri 'self'",
      // Los formularios sólo pueden postear al propio sitio.
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ')

    return [
      {
        // El storefront público está pensado para embeberse en la web del
        // cliente, así que no se restringe el framing.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      {
        // El panel sí: embeberlo permitiría clickjacking sobre acciones
        // autenticadas (borrar un proyecto, cambiar un precio).
        source: '/dashboard/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: `${csp}; frame-ancestors 'none'` },
        ],
      },
      {
        source: '/sign-in',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
      {
        source: '/sign-up',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
    ]
  },
}

module.exports = nextConfig
