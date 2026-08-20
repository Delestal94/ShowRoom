import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { publicDb } from '@/server/db/tenant-db'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Días de detalle que se conservan antes de quedar sólo con el agregado. */
const RETENTION_DAYS = 90

/**
 * Agrega los eventos del día a `analytics_daily` y descarta el detalle viejo.
 *
 * analytics_events crece sin techo — un proyecto con tráfico real genera del
 * orden de un millón de filas por mes — pero el dashboard sólo necesita
 * totales por día. Sin este trabajo la tabla termina dominando la base.
 *
 * Es idempotente: re-correrlo sobre el mismo día actualiza en vez de
 * duplicar, así que un reintento del cron no rompe nada.
 */
export async function GET(request: Request) {
  // Vercel firma sus llamadas de cron con este header. Sin la validación,
  // cualquiera podría disparar el borrado de datos históricos.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const rolled = (await publicDb.execute(sql`
      insert into analytics_daily
        (tenant_id, project_id, day, event_type, unit_id, events, sessions, dwell_ms)
      select
        tenant_id,
        project_id,
        created_at::date                                          as day,
        event_type,
        payload_json->>'unit_id'                                  as unit_id,
        count(*)::int                                             as events,
        count(distinct session_id)::int                           as sessions,
        coalesce(sum((payload_json->>'dwell_time_ms')::bigint), 0) as dwell_ms
      from analytics_events
      where created_at >= current_date - interval '2 days'
        -- Un evento sin proyecto no se puede atribuir; la FK ahora es
        -- CASCADE así que no deberían existir, pero no cuesta blindarlo.
        and project_id is not null
      group by tenant_id, project_id, created_at::date, event_type, payload_json->>'unit_id'
      on conflict (
        tenant_id,
        coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
        day,
        event_type,
        coalesce(unit_id, '')
      )
      do update set
        events   = excluded.events,
        sessions = excluded.sessions,
        dwell_ms = excluded.dwell_ms
      returning id
    `)) as any

    // El detalle viejo se borra sólo después de haberlo agregado.
    const deleted = (await publicDb.execute(sql`
      delete from analytics_events
      where created_at < current_date - (${RETENTION_DAYS} || ' days')::interval
      returning id
    `)) as any

    // El limitador de uso también acumula filas muertas.
    await publicDb.execute(sql`
      delete from rate_limits where window_start < now() - interval '2 days'
    `)

    return NextResponse.json({
      ok: true,
      rolledUp: rolled.rows?.length ?? 0,
      purged: deleted.rows?.length ?? 0,
    })
  } catch (error) {
    console.error('Error en rollup de analytics:', error)
    return NextResponse.json({ error: 'Rollup failed' }, { status: 500 })
  }
}
