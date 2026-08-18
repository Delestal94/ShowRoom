import type { Metadata } from 'next'
import { signUpAction } from '../actions'
import { SignUpForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Crear cuenta' }

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string }
}) {
  const raw = searchParams.redirectTo ?? ''
  const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'

  return <SignUpForm action={signUpAction} redirectTo={redirectTo} />
}
