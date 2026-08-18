import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'ShowRoom — Vendé en pozo con tours 3D interactivos',
    template: '%s · ShowRoom',
  },
  description:
    'Plataforma para desarrolladoras inmobiliarias: tours 3D navegables, recorridos 360°, buscador de unidades, CRM de leads y analytics — todo en un mismo lugar.',
  keywords: ['tours 3D', 'inmobiliaria', 'preventa', 'real estate', 'recorridos virtuales', '360'],
  openGraph: {
    type: 'website',
    title: 'ShowRoom — Vendé en pozo con tours 3D interactivos',
    description:
      'Tours 3D navegables, buscador de unidades, CRM y analytics para desarrolladoras inmobiliarias.',
    siteName: 'ShowRoom',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: '#0d0e14',
  colorScheme: 'dark light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
