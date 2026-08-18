/**
 * Carga dos proyectos de demostración completos: unidades, tours con assets
 * reales subidos a Supabase Storage, leads repartidos por el pipeline y
 * eventos de analytics de los últimos días.
 *
 * Re-ejecutable: borra los proyectos demo por slug antes de recrearlos.
 * No toca proyectos que no sean de la demo.
 *
 *   node scripts/seed-demo.mjs
 */
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'showroom-assets'

/* ------------------------------- assets ---------------------------------- */

const ASSETS = {
  glb: {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/VirtualCity/glTF-Binary/VirtualCity.glb',
    name: 'maqueta-3d.glb',
    contentType: 'model/gltf-binary',
    kind: 'glb-model',
    folder: 'glb',
  },
  pano: {
    url: 'https://pannellum.org/images/alma.jpg',
    name: 'panoramica-360.jpg',
    contentType: 'image/jpeg',
    kind: '360',
    folder: '360',
  },
  render1: {
    url: 'https://picsum.photos/seed/showroom-fachada/1600/900',
    name: 'render-fachada.jpg',
    contentType: 'image/jpeg',
    kind: 'image',
    folder: 'image',
  },
  render2: {
    url: 'https://picsum.photos/seed/showroom-living/1600/900',
    name: 'render-living.jpg',
    contentType: 'image/jpeg',
    kind: 'image',
    folder: 'image',
  },
  interior: {
    url: 'https://picsum.photos/seed/showroom-interior/1600/900',
    name: 'render-interior.jpg',
    contentType: 'image/jpeg',
    kind: 'image',
    folder: 'image',
  },
  plano: {
    url: 'https://picsum.photos/seed/showroom-plano/1200/1200',
    name: 'plano.jpg',
    contentType: 'image/jpeg',
    kind: 'image',
    folder: 'image',
  },
}

const cache = new Map()

async function download(asset) {
  if (cache.has(asset.url)) return cache.get(asset.url)
  const res = await fetch(asset.url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`descarga falló ${res.status} ${asset.url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  cache.set(asset.url, buf)
  return buf
}

async function upload(path, buf, contentType) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        // Las claves nuevas de Supabase (sb_secret_…) no son JWT, así que
        // van por `apikey`; con Authorization: Bearer las rechaza.
        apikey: SERVICE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buf,
    }
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`subida falló ${res.status}: ${t.slice(0, 120)}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

/* -------------------------------- datos ---------------------------------- */

const ORIENTACIONES = ['Norte', 'Sur', 'Este', 'Oeste', 'Noreste', 'Noroeste']

/** Genera un inventario coherente: pisos altos valen más, tipologías variadas. */
function generarUnidades({ pisos, porPiso, m2Base, precioBase, precioPorM2 }) {
  const letras = ['A', 'B', 'C', 'D']
  const unidades = []

  for (let piso = 1; piso <= pisos; piso++) {
    for (let i = 0; i < porPiso; i++) {
      const letra = letras[i]
      // Tipologías alternadas por posición en el piso.
      const dormitorios = i === 0 ? 1 : i === 1 ? 2 : 3
      const m2 = m2Base + dormitorios * 22 + (i % 2) * 6
      // Cada piso suma ~1.5% al valor.
      const precio = Math.round(
        (precioBase + m2 * precioPorM2) * (1 + (piso - 1) * 0.015) / 500
      ) * 500

      // Un puñado reservadas/vendidas para que el inventario se vea real.
      const seed = (piso * porPiso + i) % 9
      const status = seed === 3 ? 'reserved' : seed === 7 ? 'sold' : 'available'

      unidades.push({
        code: `${piso}${letra}`,
        floor: piso,
        m2: m2.toFixed(2),
        price: precio.toFixed(2),
        currency: 'USD',
        orientation: ORIENTACIONES[(piso + i) % ORIENTACIONES.length],
        bedrooms: dormitorios,
        status,
      })
    }
  }
  return unidades
}

const PROYECTOS = [
  {
    slug: 'torre-almagro',
    name: 'Torre Almagro',
    address: 'Av. Corrientes 4250, Almagro, CABA',
    unidades: generarUnidades({ pisos: 8, porPiso: 3, m2Base: 16, precioBase: 18000, precioPorM2: 1850 }),
    tours: ['glb', 'pano', 'render1'],
  },
  {
    slug: 'residencias-del-parque',
    name: 'Residencias del Parque',
    address: 'Av. del Libertador 8800, Nordelta, Tigre',
    unidades: generarUnidades({ pisos: 6, porPiso: 3, m2Base: 28, precioBase: 42000, precioPorM2: 2400 }),
    tours: ['pano', 'render2'],
  },
]

const NOMBRES = [
  'Martina Rodríguez', 'Joaquín Fernández', 'Camila Sosa', 'Tomás Gutiérrez',
  'Valentina Ruiz', 'Ignacio Molina', 'Sofía Herrera', 'Lucas Domínguez',
  'Julieta Castro', 'Matías Peralta', 'Agustina Vega', 'Nicolás Ibáñez',
]

const ESTADOS_LEAD = ['new', 'new', 'new', 'contacted', 'contacted', 'contacted',
                      'qualified', 'qualified', 'won', 'won', 'lost', 'new']

/* ------------------------------ ejecución -------------------------------- */

const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()

// El tenant del usuario (el más antiguo con membership).
const { rows: [tenant] } = await c.query(
  `select t.id, t.name from tenants t
   join memberships m on m.tenant_id = t.id
   order by t.created_at limit 1`)

if (!tenant) {
  console.log('No hay ningún tenant todavía. Iniciá sesión una vez en la app y volvé a correr esto.')
  process.exit(1)
}
console.log(`tenant: ${tenant.name} (${tenant.id})\n`)

// Limpieza idempotente: sólo los slugs de la demo.
const slugs = PROYECTOS.map((p) => p.slug)
const { rowCount: borrados } = await c.query(
  `delete from projects where tenant_id = $1 and slug = any($2)`, [tenant.id, slugs])
if (borrados) console.log(`proyectos demo previos borrados: ${borrados}\n`)

console.log('descargando y subiendo assets…')
const buffers = {}
for (const [key, asset] of Object.entries(ASSETS)) {
  buffers[key] = await download(asset)
  console.log(`  ${asset.name.padEnd(22)} ${(buffers[key].length / 1024).toFixed(0)} KB`)
}

for (const proy of PROYECTOS) {
  const projectId = randomUUID()

  await c.query(
    `insert into projects (id, tenant_id, name, slug, address, status)
     values ($1,$2,$3,$4,$5,'published')`,
    [projectId, tenant.id, proy.name, proy.slug, proy.address])

  // Unidades
  const unitIds = []
  for (const u of proy.unidades) {
    const { rows: [row] } = await c.query(
      `insert into units (tenant_id, project_id, code, floor, m2, price, currency, orientation, bedrooms, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [tenant.id, projectId, u.code, u.floor, u.m2, u.price, u.currency,
       u.orientation, u.bedrooms, u.status])
    unitIds.push(row.id)
  }

  // Tours, con los archivos realmente subidos al storage.
  for (const key of proy.tours) {
    const asset = ASSETS[key]
    const storageKey = `${tenant.id}/${projectId}/${asset.folder}/${asset.name}`
    const cdnUrl = await upload(storageKey, buffers[key], asset.contentType)

    await c.query(
      `insert into tours (tenant_id, project_id, kind, storage_key, cdn_url, status, metadata_json)
       values ($1,$2,$3,$4,$5,'ready',$6)`,
      [tenant.id, projectId, asset.kind, storageKey, cdnUrl,
       JSON.stringify({ seededAt: new Date().toISOString(), demo: true })])
  }

  // Contenido propio en las primeras unidades: renders interiores, plano y
  // una 360 de la unidad. El resto cae al recorrido general del proyecto,
  // que es justamente el caso que la ficha tiene que resolver bien.
  const conContenido = unitIds.slice(0, 4)
  for (let i = 0; i < conContenido.length; i++) {
    const unitId = conContenido[i]
    const código = proy.unidades[i].code
    const propios = i === 0 ? ['interior', 'plano', 'pano'] : ['interior', 'plano']

    for (const key of propios) {
      const asset = ASSETS[key]
      const storageKey = `${tenant.id}/${projectId}/unidades/${código}/${asset.folder}/${asset.name}`
      const cdnUrl = await upload(storageKey, buffers[key], asset.contentType)

      await c.query(
        `insert into tours (tenant_id, project_id, unit_id, kind, storage_key, cdn_url, status, metadata_json)
         values ($1,$2,$3,$4,$5,$6,'ready',$7)`,
        [tenant.id, projectId, unitId, asset.kind, storageKey, cdnUrl,
         JSON.stringify({ demo: true, unidad: código })])
    }
  }

  // Leads repartidos por el pipeline, fechados en los últimos 20 días.
  const cantidadLeads = proy.slug === 'torre-almagro' ? 8 : 4
  for (let i = 0; i < cantidadLeads; i++) {
    const nombre = NOMBRES[(PROYECTOS.indexOf(proy) * 8 + i) % NOMBRES.length]
    const estado = ESTADOS_LEAD[i % ESTADOS_LEAD.length]
    const diasAtras = Math.floor(Math.random() * 20)
    const email = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '.') + '@mail.com'

    await c.query(
      `insert into leads (tenant_id, project_id, name, email, phone, source, status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7, now() - ($8 || ' days')::interval)`,
      [tenant.id, projectId, nombre, email,
       `11 ${4000 + Math.floor(Math.random() * 5999)}-${1000 + Math.floor(Math.random() * 8999)}`,
       i % 3 === 0 ? 'whatsapp' : 'website', estado, String(diasAtras)])
  }

  // Eventos de analytics de los últimos 7 días, para que el dashboard tenga qué mostrar.
  const sesiones = 40
  let eventos = 0
  for (let s = 0; s < sesiones; s++) {
    const sessionId = `demo-${projectId.slice(0, 8)}-${s}`
    const diasAtras = Math.floor(Math.random() * 7)
    const ts = `now() - '${diasAtras} days'::interval - '${Math.floor(Math.random() * 20)} hours'::interval`

    await c.query(
      `insert into analytics_events (tenant_id, project_id, session_id, event_type, payload_json, created_at)
       values ($1,$2,$3,'page_view','{}'::jsonb, ${ts})`,
      [tenant.id, projectId, sessionId])
    eventos++

    // Cada sesión mira entre 1 y 5 unidades.
    const vistas = 1 + Math.floor(Math.random() * 5)
    for (let v = 0; v < vistas; v++) {
      const unitId = unitIds[Math.floor(Math.random() * unitIds.length)]
      await c.query(
        `insert into analytics_events (tenant_id, project_id, session_id, event_type, payload_json, created_at)
         values ($1,$2,$3,'unit_view',$4::jsonb, ${ts})`,
        [tenant.id, projectId, sessionId, JSON.stringify({ unit_id: unitId })])
      await c.query(
        `insert into analytics_events (tenant_id, project_id, session_id, event_type, payload_json, created_at)
         values ($1,$2,$3,'dwell_time',$4::jsonb, ${ts})`,
        [tenant.id, projectId, sessionId,
         JSON.stringify({ unit_id: unitId, dwell_time_ms: 8000 + Math.floor(Math.random() * 45000) })])
      eventos += 2
    }

    // Una parte de las sesiones convierte.
    if (s % 5 === 0) {
      const unitId = unitIds[Math.floor(Math.random() * unitIds.length)]
      await c.query(
        `insert into analytics_events (tenant_id, project_id, session_id, event_type, payload_json, created_at)
         values ($1,$2,$3,'contact_form_submit',$4::jsonb, ${ts})`,
        [tenant.id, projectId, sessionId, JSON.stringify({ unit_id: unitId })])
      eventos++
    }
    if (s % 7 === 0) {
      await c.query(
        `insert into analytics_events (tenant_id, project_id, session_id, event_type, payload_json, created_at)
         values ($1,$2,$3,'tour_view','{}'::jsonb, ${ts})`,
        [tenant.id, projectId, sessionId])
      eventos++
    }
  }

  const disponibles = proy.unidades.filter((u) => u.status === 'available').length
  console.log(`\n${proy.name}`)
  console.log(`  /${proy.slug}`)
  console.log(`  ${proy.unidades.length} unidades (${disponibles} disponibles) · ` +
              `${proy.tours.length} tours de proyecto · ${conContenido.length} unidades con contenido propio`)
  console.log(`  ${cantidadLeads} leads · ${eventos} eventos`)
}

// Los tours viejos quedaron en 'processing' porque se subieron antes del
// arreglo que los crea listos; el storefront sólo muestra los 'ready'.
const { rowCount: destrabados } = await c.query(
  `update tours set status='ready' where status='processing' and cdn_url is not null`)
if (destrabados) console.log(`\ntours destrabados de 'processing' a 'ready': ${destrabados}`)

// Suscripción Pro, para que los límites del plan no contradigan la demo.
const { rows: [pro] } = await c.query(`select id from plans where slug='pro'`)
if (pro) {
  await c.query(
    `insert into subscriptions (tenant_id, plan_id, mp_preapproval_id, status, current_period_end)
     values ($1,$2,$3,'authorized', now() + interval '30 days')
     on conflict (tenant_id) do update
       set plan_id=excluded.plan_id, status='authorized',
           current_period_end=excluded.current_period_end, updated_at=now()`,
    [tenant.id, pro.id, `demo-${tenant.id.slice(0, 8)}`])
  console.log('suscripción de demo: plan Pro activo')
}

// Número de WhatsApp para que el botón del storefront aparezca.
await c.query(
  `update tenants set contact_whatsapp = coalesce(contact_whatsapp, '5491122334455')
   where id = $1`, [tenant.id])

console.log('\nListo. Entrá a /dashboard/projects para verlos.')
await c.end()
