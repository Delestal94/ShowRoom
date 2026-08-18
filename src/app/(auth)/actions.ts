'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

export interface AuthState {
  error?: string
  notice?: string
}

/** Supabase returns English messages; surface Spanish ones the user can act on. */
function translate(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos.',
    'Email not confirmed': 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada.',
    'User already registered': 'Ya existe una cuenta con este email.',
    'Password should be at least 6 characters':
      'La contraseña debe tener al menos 6 caracteres.',
    'Email rate limit exceeded': 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.',
    'Signup requires a valid password': 'Ingresá una contraseña válida.',
  }
  return map[message] ?? message
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  }
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  const redirectTo = String(formData.get('redirectTo') ?? '') || '/dashboard'

  if (!email || !password) {
    return { error: 'Completá email y contraseña.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: translate(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (!email || !password) {
    return { error: 'Completá email y contraseña.' }
  }
  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }
  if (password !== confirm) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const origin = headers().get('origin') ?? getSiteUrl().origin
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    return { error: translate(error.message) }
  }

  // With email confirmation enabled Supabase returns a user but no session.
  if (data.user && !data.session) {
    return {
      notice: `Te enviamos un mail a ${email} para confirmar la cuenta.`,
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOutAction() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
