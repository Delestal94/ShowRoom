import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCurrentTenant } from '@/modules/tenancy/current-tenant'
import { getLead, getLeadActivities } from '@/modules/leads/lead-service'
import { LeadStatusPicker, AddNoteForm } from './lead-client'

export const metadata: Metadata = { title: 'Lead' }

const STATUS_LABEL: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  won: 'Ganado',
  lost: 'Perdido',
}

function ActivityIcon({ type }: { type: string }) {
  const path =
    type === 'status_change'
      ? 'M4 12h10m0 0-3-3m3 3-3 3'
      : type === 'note'
        ? 'M5 4h9l4 4v12H5V4Zm9 0v4h4'
        : 'M12 8v8m-4-4h8'

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-fg-muted">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={path} />
      </svg>
    </span>
  )
}

function describe(type: string, payload: Record<string, any> | null) {
  if (type === 'status_change') {
    const from = STATUS_LABEL[payload?.from] ?? payload?.from ?? '—'
    const to = STATUS_LABEL[payload?.to] ?? payload?.to ?? '—'
    return `Estado: ${from} → ${to}`
  }
  if (type === 'note') return payload?.note ?? ''
  return type
}

export default async function LeadDetailPage({
  params,
}: {
  params: { leadId: string }
}) {
  const tenant = await requireCurrentTenant()
  const lead = await getLead(tenant.tenantId, params.leadId)
  if (!lead) notFound()

  const activities = await getLeadActivities(tenant.tenantId, params.leadId)

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/crm"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        ← Volver a leads
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-fg">{lead.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Ingresó el {new Date(lead.createdAt).toLocaleDateString('es-AR')} vía {lead.source}
          </p>
        </div>
        <LeadStatusPicker leadId={lead.id} status={lead.status} />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-medium text-fg-muted">Contacto</h2>
          <div className="mt-3 space-y-2 text-sm">
            {lead.email && (
              <p>
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                  {lead.email}
                </a>
              </p>
            )}
            {lead.phone && (
              <p className="text-fg">
                {lead.phone}{' '}
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-xs text-success hover:underline"
                >
                  WhatsApp ↗
                </a>
              </p>
            )}
            {!lead.email && !lead.phone && (
              <p className="text-fg-subtle">Sin datos de contacto</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/50 p-6">
          <h2 className="text-sm font-medium text-fg-muted">Proyecto</h2>
          <p className="mt-3 text-fg">{lead.project?.name ?? '—'}</p>
          {lead.project?.slug && (
            <Link
              href={`/${lead.project.slug}`}
              target="_blank"
              className="mt-1 inline-block text-xs text-primary hover:underline"
            >
              Ver página pública ↗
            </Link>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-title font-semibold text-fg">Historial</h2>

        <div className="mt-5">
          <AddNoteForm leadId={lead.id} />
        </div>

        {activities.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
            Todavía no hay actividad registrada. Los cambios de estado se anotan solos.
          </p>
        ) : (
          <ol className="mt-6 space-y-4">
            {activities.map((activity) => (
              <li key={activity.id} className="flex gap-4">
                <ActivityIcon type={activity.type} />
                <div className="min-w-0 flex-1 border-b border-border pb-4">
                  <p className="text-sm text-fg">
                    {describe(activity.type, activity.payloadJson as Record<string, any>)}
                  </p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    {new Date(activity.createdAt).toLocaleString('es-AR')}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
