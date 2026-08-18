'use client'

import { forwardRef, useId, useState } from 'react'
import { cn } from '@/lib/cn'

const inputBase =
  'h-12 w-full rounded-md border border-border bg-surface-2/60 px-4 text-[0.95rem] text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus:border-primary focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50'

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, className, id, type, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    const [revealed, setRevealed] = useState(false)
    const isPassword = type === 'password'

    return (
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={fieldId} className="text-sm font-medium text-fg">
            {label}
          </label>
          {hint}
        </div>

        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={isPassword && revealed ? 'text' : type}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={cn(
              inputBase,
              isPassword && 'pr-12',
              error && 'border-danger focus:border-danger focus:ring-danger/25',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-3 py-2 text-xs font-medium text-fg-subtle transition-colors hover:text-fg"
            >
              {revealed ? 'Ocultar' : 'Ver'}
            </button>
          )}
        </div>

        {error && (
          <p id={`${fieldId}-error`} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Field.displayName = 'Field'
