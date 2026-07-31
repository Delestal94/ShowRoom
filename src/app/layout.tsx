import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShowRoom - Immobiliary Tours 3D',
  description: 'Interactive 3D tours for real estate sales',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Pannellum CSS for 360 viewer */}
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.css"
          />
          {/* Pannellum JS for 360 viewer */}
          <script
            async
            src="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.js"
          ></script>
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
