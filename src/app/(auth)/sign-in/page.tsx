import type { Metadata } from 'next'
import { signInAction } from '../actions'
import { SignInForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string }
}) {
  // Only allow same-origin paths, so ?redirectTo= can't bounce users off-site.
  const raw = searchParams.redirectTo ?? ''
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'

  return <SignInForm action={signInAction} redirectTo={redirectTo} />
}
