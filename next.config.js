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
}

module.exports = nextConfig
