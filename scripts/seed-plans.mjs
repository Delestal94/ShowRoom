/**
 * Seeds the plan catalogue and, when MP_ACCESS_TOKEN is present, publishes
 * each plan to Mercado Pago as a preapproval_plan.
 *
 * Re-runnable: plans are matched by slug, and the Mercado Pago plan is only
 * created when the row doesn't already carry an id.
 *
 *   node scripts/seed-plans.mjs
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const SITE_URL = (env.NEXT_PUBLIC_APP_URL || 'https://show-room-ten.vercel.app')
  .replace(/^(?!https?:\/\/)/, 'https://')

const PLANS = [
  {
    slug: 'solo',
    name: 'Solo',
    priceMonthly: 29000,
    unitLimit: 40,
    projectLimit: 1,
    sortOrder: 1,
    features: ['Visor 3D y 360°', 'Formulario de leads', 'Subdominio showroom.app'],
  },
  {
    slug: 'lite',
    name: 'Lite',
    priceMonthly: 89000,
    unitLimit: 300,
    projectLimit: 5,
    sortOrder: 2,
    features: ['Todo lo de Solo', 'CRM con pipeline', 'Analytics de recorrido', 'Soporte prioritario'],
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 239000,
    unitLimit: 100000,
    projectLimit: 1000,
    sortOrder: 3,
    features: ['Todo lo de Lite', 'Proyectos y unidades sin tope', 'Dominio propio', 'Heatmaps por unidad'],
  },
]

const MP_TOKEN = env.MP_ACCESS_TOKEN

async function createMpPlan(plan) {
  const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: `ShowRoom ${plan.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.priceMonthly,
        currency_id: 'ARS',
      },
      back_url: `${SITE_URL}/dashboard/billing`,
      payment_methods_allowed: {
        payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }],
      },
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`MP ${res.status}: ${body.message ?? res.statusText}`)
  return body.id
}

const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await c.connect()

if (!MP_TOKEN) {
  console.log('MP_ACCESS_TOKEN ausente — se cargan los planes sin publicarlos en Mercado Pago.')
  console.log('Volvé a correr el script cuando tengas el token para completarlos.\n')
}

for (const plan of PLANS) {
  const { rows: [existing] } = await c.query(
    `select id, mp_preapproval_plan_id from plans where slug = $1`, [plan.slug])

  let mpId = existing?.mp_preapproval_plan_id ?? null

  if (MP_TOKEN && !mpId) {
    try {
      mpId = await createMpPlan(plan)
      console.log(`  ${plan.slug}: plan creado en Mercado Pago (${mpId})`)
    } catch (e) {
      console.log(`  ${plan.slug}: no se pudo crear en Mercado Pago → ${e.message}`)
    }
  }

  if (existing) {
    await c.query(
      `update plans set name=$2, unit_limit=$3, project_limit=$4, price_monthly=$5,
              currency='ARS', features_json=$6, sort_order=$7, mp_preapproval_plan_id=$8
       where slug=$1`,
      [plan.slug, plan.name, plan.unitLimit, plan.projectLimit, plan.priceMonthly,
       JSON.stringify(plan.features), plan.sortOrder, mpId])
    console.log(`  ${plan.slug}: actualizado`)
  } else {
    await c.query(
      `insert into plans (slug,name,unit_limit,project_limit,price_monthly,currency,features_json,sort_order,mp_preapproval_plan_id)
       values ($1,$2,$3,$4,$5,'ARS',$6,$7,$8)`,
      [plan.slug, plan.name, plan.unitLimit, plan.projectLimit, plan.priceMonthly,
       JSON.stringify(plan.features), plan.sortOrder, mpId])
    console.log(`  ${plan.slug}: creado`)
  }
}

const { rows } = await c.query(
  `select slug, name, price_monthly, unit_limit, project_limit,
          (mp_preapproval_plan_id is not null) as en_mp
   from plans order by sort_order`)
console.log('\nplanes en la base:')
for (const r of rows) {
  console.log(`  ${r.slug.padEnd(6)} ARS ${String(r.price_monthly).padStart(10)}  ` +
              `${String(r.project_limit).padStart(4)} proy  ${String(r.unit_limit).padStart(6)} unid  ` +
              `${r.en_mp ? 'publicado en MP' : 'sin publicar'}`)
}

await c.end()
