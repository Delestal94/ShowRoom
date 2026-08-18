import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import {
  previewInvitation,
  acceptInvitation,
} from '@/modules/tenancy/invitation-service'
import { ROLE_LABEL } from '@/modules/tenancy/invitation-constants'
import { Logo } from '@/components/ui/logo'
import { ButtonLink } from '@/components/ui/button'
import { AcceptButton } from './accept-button'

export const metadata: Metadata = { title: 'Invitación' }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-lines mask-fade-b opacity-30" />
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <Logo />
      <div className="mt-10 w-full max-w-md rounded-2xl border border-border bg-surface/60 p-8 text-center">
        {children}
      </div>
    </div>
  )
}

export default async function InvitationPage({
  params,
}: {
  params: { token: string }
}) {
  const preview = await previewInvitation(params.token)

  if (!preview) {
    return (
      <Shell>
        <h1 className="text-title font-semibold text-fg">Invitación no encontrada</h1>
        <p className="mt-3 text-sm text-fg-muted">
          El link puede estar mal copiado o haber sido revocado.
        </p>
        <ButtonLink href="/" variant="outline" className="mt-6">
          Ir al inicio
        </ButtonLink>
      </Shell>
    )
  }

  if (preview.used) {
    return (
      <Shell>
        <h1 className="text-title font-semibold text-fg">Esta invitación ya se usó</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Si ya sos parte del equipo, entrá con tu cuenta.
        </p>
        <ButtonLink href="/sign-in" className="mt-6">
          Iniciar sesión
        </ButtonLink>
      </Shell>
    )
  }

  if (preview.expired) {
    return (
      <Shell>
        <h1 className="text-title font-semibold text-fg">La invitación venció</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Pedile a {preview.tenantName} que te mande una nueva.
        </p>
      </Shell>
    )
  }

  const user = await getUser()

  // Sin sesión no se puede crear la membresía. Se manda a registrarse y se
  // vuelve acá con redirectTo, para no perder la invitación en el camino.
  if (!user) {
    const back = `/invitacion/${params.token}`
    return (
      <Shell>
        <h1 className="text-title font-semibold text-fg">
          Te invitaron a {preview.tenantName}
        </h1>
        <p className="mt-3 text-sm text-fg-muted">
          Vas a entrar como <strong className="text-fg">{ROLE_LABEL[preview.role] ?? preview.role}</strong>.
          Creá tu cuenta o iniciá sesión para aceptar.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <ButtonLink href={`/sign-up?redirectTo=${encodeURIComponent(back)}`}>
            Crear cuenta
          </ButtonLink>
          <ButtonLink
            href={`/sign-in?redirectTo=${encodeURIComponent(back)}`}
            variant="outline"
          >
            Ya tengo cuenta
          </ButtonLink>
        </div>
      </Shell>
    )
  }

  async function accept() {
    'use server'
    const current = await getUser()
    if (!current) redirect(`/sign-in?redirectTo=/invitacion/${params.token}`)

    const result = await acceptInvitation(
      params.token,
      current.id,
      current.email ?? ''
    )

    if (result.ok || result.reason === 'already_member') {
      redirect('/dashboard')
    }
    redirect(`/invitacion/${params.token}?error=${result.reason}`)
  }

  return (
    <Shell>
      <h1 className="text-title font-semibold text-fg">
        Te invitaron a {preview.tenantName}
      </h1>
      <p className="mt-3 text-sm text-fg-muted">
        Vas a entrar como{' '}
        <strong className="text-fg">{ROLE_LABEL[preview.role] ?? preview.role}</strong>, con la
        cuenta <strong className="text-fg">{user.email}</strong>.
      </p>

      <form action={accept} className="mt-6">
        <AcceptButton />
      </form>

      <Link href="/dashboard" className="mt-4 inline-block text-xs text-fg-subtle hover:text-fg">
        No, gracias
      </Link>
    </Shell>
  )
}
