import { getUser } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/site/header'
import { SiteFooter } from '@/components/site/footer'
import { Hero } from '@/components/marketing/hero'
import { Features } from '@/components/marketing/features'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { Pricing } from '@/components/marketing/pricing'
import { CallToAction } from '@/components/marketing/cta'

export default async function HomePage() {
  const user = await getUser()

  return (
    <>
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
