/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/.clerk/:path*',
          destination: 'https://accounts.clerk.dev/:path*',
        },
      ],
    }
  },
}

module.exports = nextConfig
