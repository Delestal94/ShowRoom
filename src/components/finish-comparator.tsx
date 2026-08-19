'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'

export interface Finish {
  id: string
  category: string
  name: string
  description: string | null
  imageUrl: string | null
}

/**
 * Comparador de terminaciones: se elige una opción por categoría y se ve el
 * conjunto elegido. Es la sección que ayuda a decidir entre variantes, no un
 * catálogo suelto.
 */
export function FinishComparator({ finishes }: { finishes: Finish[] }) {
  const categories = Array.from(new Set(finishes.map((f) => f.category)))

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const category of categories) {
      const first = finishes.find((f) => f.category === category)
      if (first) initial[category] = first.id
    }
    return initial
  })

  if (finishes.length === 0) return null

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const options = finishes.filter((f) => f.category === category)
        const activeId = selected[category]
        const active = options.find((o) => o.id === activeId) ?? options[0]

        return (
          <div key={category}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-semibold text-fg">{category}</h3>
              {options.length > 1 && (
                <p className="text-xs text-fg-subtle">
                  {options.length} opciones
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_16rem]">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface/50">
                {active?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.imageUrl}
                    alt={active.name}
                    className="aspect-[16/9] w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid aspect-[16/9] w-full place-items-center text-sm text-fg-subtle">
                    Sin imagen
                  </div>
                )}
                <div className="p-5">
                  <p className="font-medium text-fg">{active?.name}</p>
                  {active?.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                      {active.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-row gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
                {options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setSelected((prev) => ({ ...prev, [category]: option.id }))
                    }
                    aria-pressed={option.id === active?.id}
                    className={cn(
                      'flex shrink-0 items-center gap-3 rounded-md border p-2.5 text-left transition-colors sm:shrink',
                      option.id === active?.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border-strong'
                    )}
                  >
                    {option.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={option.imageUrl}
                        alt=""
                        className="h-10 w-14 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="h-10 w-14 shrink-0 rounded bg-surface-2" />
                    )}
                    <span
                      className={cn(
                        'text-sm',
                        option.id === active?.id ? 'font-medium text-fg' : 'text-fg-muted'
                      )}
                    >
                      {option.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
