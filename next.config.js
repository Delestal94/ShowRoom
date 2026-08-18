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
    return [
      {
        // El storefront público está pensado para embeberse en la web del
        // cliente, así que no se restringe el framing.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // El panel sí: embeberlo permitiría clickjacking sobre acciones
        // autenticadas (borrar un proyecto, cambiar un precio).
        source: '/dashboard/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
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
