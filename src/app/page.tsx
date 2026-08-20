import type { Metadata } from 'next'
import { getUser } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'
import { OrganizationJsonLd } from '@/components/json-ld'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { Hero } from '@/components/marketing/hero'
import { Features } from '@/components/marketing/features'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Pricing } from '@/components/marketing/pricing'
import { CallToAction } from '@/components/marketing/cta'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default async function HomePage() {
  const user = await getUser()

  const base = getSiteUrl().origin

  return (
    <>
      <OrganizationJsonLd
        name="ShowRoom"
        url={base}
        description="Plataforma para desarrolladoras inmobiliarias: tours 3D navegables, buscador de unidades, CRM de leads y analytics."
      />
      <SiteHeader isAuthed={Boolean(user)} />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  )
}
