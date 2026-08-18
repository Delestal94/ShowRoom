'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import type { AuthState } from '@/app/(auth)/actions'

const initialState: AuthState = {}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  )
}

function Alert({ tone, children }: { tone: 'error' | 'notice'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-danger/40 bg-danger/10 text-danger'
      : 'border-success/40 bg-success/10 text-success'

  return (
    <p role="status" className={`rounded-md border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  )
}

/* -------------------------------------------------------------------------- */

export function SignInForm({
  action,
  redirectTo,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
  redirectTo: string
}) {
  const [state, formAction] = useFormState(action, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Bienvenido de vuelta</h1>
        <p className="mt-2 text-fg-muted">Entrá para gestionar tus proyectos.</p>
      </header>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <input type="hidden" name="redirectTo" value={redirectTo} />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="vos@desarrolladora.com"
        required
      />

      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />

      <SubmitButton label="Iniciar sesión" pendingLabel="Entrando…" />

      <p className="text-center text-sm text-fg-muted">
        ¿No tenés cuenta?{' '}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Creá una gratis
        </Link>
      </p>
    </form>
  )
}

/* -------------------------------------------------------------------------- */

export function SignUpForm({
  action,
  redirectTo = '/dashboard',
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
  redirectTo?: string
}) {
  const [state, formAction] = useFormState(action, initialState)

  if (state.notice) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-success/40 bg-success/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-success" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 7.5 12 13l9-5.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
          </svg>
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Revisá tu email</h1>
        <p className="text-fg-muted">{state.notice}</p>
        <Link href="/sign-in" className="inline-block text-sm font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Creá tu cuenta</h1>
        <p className="mt-2 text-fg-muted">Tu primer proyecto en minutos.</p>
      </header>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <input type="hidden" name="redirectTo" value={redirectTo} />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="vos@desarrolladora.com"
        required
      />

      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        minLength={8}
        required
      />

      <Field
        label="Repetir contraseña"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        minLength={8}
        required
      />

      <SubmitButton label="Crear cuenta" pendingLabel="Creando…" />

      <p className="text-center text-sm text-fg-muted">
        ¿Ya tenés cuenta?{' '}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </form>
  )
}
