import Script from 'next/script'

/**
 * Pannellum powers the 360° viewer and attaches itself to `window`.
 * It lives here rather than in the root layout so it only loads on the
 * public storefront, not on marketing, auth or dashboard pages.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.7/build/pannellum.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  )
}
