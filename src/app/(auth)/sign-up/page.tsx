import type { Metadata } from 'next'
import { signUpAction } from '../actions'
import { SignUpForm } from '@/components/auth/auth-form'

export const metadata: Metadata = { title: 'Crear cuenta' }

export default function SignUpPage() {
  return <SignUpForm action={signUpAction} />
}
