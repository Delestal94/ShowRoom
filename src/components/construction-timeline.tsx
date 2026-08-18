export interface ConstructionUpdate {
  id: string
  title: string
  body: string | null
  progressPercent: number | null
  imagesJson: { cdnUrl: string }[] | null
  publishedAt: Date | string | null
}

function formatDate(value: Date | string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ConstructionTimeline({ updates }: { updates: ConstructionUpdate[] }) {
  if (updates.length === 0) return null

  // The newest update carries the headline percentage; older ones keep their
  // own so the reader can see how it moved.
  const latestProgress = updates.find((u) => typeof u.progressPercent === 'number')
    ?.progressPercent

  return (
    <div>
      {typeof latestProgress === 'number' && (
        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-fg-muted">Avance de obra</p>
            <p className="font-mono text-2xl font-semibold text-fg">{latestProgress}%</p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, latestProgress))}%` }}
            />
          </div>
        </div>
      )}

      <ol className="mt-6 space-y-6">
        {updates.map((update, i) => {
          const images = update.imagesJson ?? []

          return (
            <li key={update.id} className="relative flex gap-5">
              {/* Connector line, skipped on the last item */}
              <div className="flex flex-col items-center">
                <span
                  className={
                    i === 0
                      ? 'mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary ring-4 ring-primary/20'
                      : 'mt-1.5 h-3 w-3 shrink-0 rounded-full bg-border-strong'
                  }
                />
                {i < updates.length - 1 && (
                  <span aria-hidden className="mt-1 w-px flex-1 bg-border" />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-2">
                <p className="text-xs text-fg-subtle">{formatDate(update.publishedAt)}</p>
                <h3 className="mt-1 font-semibold text-fg">{update.title}</h3>

                {typeof update.progressPercent === 'number' && (
                  <p className="mt-1 font-mono text-xs text-primary">
                    {update.progressPercent}% de avance
                  </p>
                )}

                {update.body && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                    {update.body}
                  </p>
                )}

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {images.map((img, idx) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={idx}
                        src={img.cdnUrl}
                        alt={`Avance: ${update.title}`}
                        loading="lazy"
                        className="aspect-[4/3] w-full rounded-md border border-border object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
