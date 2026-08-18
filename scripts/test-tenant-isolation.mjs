// The test that decides whether RLS is real: connect as the APP role
// (showroom_app) and try to reach another tenant's data.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const rows = []
const add = (s, n, d = '') => rows.push([s, n, d])

// Seed with the OWNER connection (bypasses RLS) so we control the fixture.
const owner = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await owner.connect()

const stamp = Date.now()
const { rows: [tA] } = await owner.query(
  `insert into tenants (name, slug) values ('Tenant A', $1) returning id`, [`iso-a-${stamp}`])
const { rows: [tB] } = await owner.query(
  `insert into tenants (name, slug) values ('Tenant B', $1) returning id`, [`iso-b-${stamp}`])

const { rows: [pA] } = await owner.query(
  `insert into projects (tenant_id,name,slug,status) values ($1,'Proyecto A',$2,'draft') returning id`,
  [tA.id, `iso-pa-${stamp}`])
const { rows: [pB] } = await owner.query(
  `insert into projects (tenant_id,name,slug,status) values ($1,'Proyecto B',$2,'draft') returning id`,
  [tB.id, `iso-pb-${stamp}`])
const { rows: [pubB] } = await owner.query(
  `insert into projects (tenant_id,name,slug,status) values ($1,'Publicado B',$2,'published') returning id`,
  [tB.id, `iso-pub-${stamp}`])

await owner.query(
  `insert into units (tenant_id,project_id,code,status) values ($1,$2,'A-1','available')`, [tA.id, pA.id])
await owner.query(
  `insert into units (tenant_id,project_id,code,status) values ($1,$2,'B-1','available')`, [tB.id, pB.id])
await owner.query(
  `insert into units (tenant_id,project_id,code,status) values ($1,$2,'PUB-1','available')`, [tB.id, pubB.id])
await owner.query(
  `insert into leads (tenant_id,project_id,name,email,source,status) values ($1,$2,'Lead B','b@x.com','website','new')`,
  [tB.id, pB.id])

// Now switch to the APP role — this is what production uses.
const app = new pg.Client({ connectionString: env.DATABASE_URL_APP, ssl: { rejectUnauthorized: false } })
await app.connect()

const { rows: [who] } = await app.query(`select current_user`)
add(who.current_user === 'showroom_app' ? 'PASS' : 'FAIL', 'conectado como rol de app', who.current_user)

const { rows: [bp] } = await app.query(
  `select rolbypassrls from pg_roles where rolname=current_user`)
add(bp.rolbypassrls === false ? 'PASS' : 'FAIL', 'rol NO puede saltarse RLS', `bypassrls=${bp.rolbypassrls}`)

async function asTenant(tenantId, fn) {
  await app.query('begin')
  await app.query(`select set_config('app.tenant_id', $1, true)`, [tenantId])
  try { return await fn() } finally { await app.query('commit') }
}

// --- Reads scoped to tenant A must not see tenant B ---
await asTenant(tA.id, async () => {
  const { rows: projs } = await app.query(`select id, name from projects`)
  const leaked = projs.filter((p) => p.id === pB.id)
  add(leaked.length === 0 ? 'PASS' : 'FAIL',
      'A no ve proyectos borrador de B', `visibles: ${projs.length}`)

  const { rows: us } = await app.query(`select code from units`)
  const leakedU = us.filter((u) => u.code === 'B-1')
  add(leakedU.length === 0 ? 'PASS' : 'FAIL', 'A no ve unidades de B')

  const { rows: ls } = await app.query(`select id from leads`)
  add(ls.length === 0 ? 'PASS' : 'FAIL', 'A no ve leads de B', `visibles: ${ls.length}`)

  // Even naming B's id explicitly must return nothing.
  const { rows: direct } = await app.query(`select id from projects where id=$1`, [pB.id])
  add(direct.length === 0 ? 'PASS' : 'FAIL', 'A no accede al proyecto de B ni por id directo')

  // Writes against B must affect zero rows.
  const { rowCount: upd } = await app.query(
    `update projects set name='hackeado' where id=$1`, [pB.id])
  add(upd === 0 ? 'PASS' : 'FAIL', 'A no puede modificar proyecto de B', `${upd} fila(s)`)

  const { rowCount: del } = await app.query(`delete from units where tenant_id=$1`, [tB.id])
  add(del === 0 ? 'PASS' : 'FAIL', 'A no puede borrar unidades de B', `${del} fila(s)`)

  // A must still see its own data.
  const { rows: own } = await app.query(`select id from projects where id=$1`, [pA.id])
  add(own.length === 1 ? 'PASS' : 'FAIL', 'A SÍ ve su propio proyecto')
})

// --- Public storefront path: no tenant context at all ---
const { rows: pubProjects } = await app.query(
  `select id, status from projects where id = any($1)`, [[pA.id, pB.id, pubB.id]])
const onlyPublished = pubProjects.every((p) => p.status === 'published')
add(pubProjects.length === 1 && onlyPublished ? 'PASS' : 'FAIL',
    'sin contexto: sólo proyectos publicados', `visibles: ${pubProjects.length}`)

const { rows: pubUnits } = await app.query(`select code from units where code='PUB-1'`)
add(pubUnits.length === 1 ? 'PASS' : 'FAIL', 'sin contexto: unidades de proyecto publicado visibles')

const { rows: draftUnits } = await app.query(`select code from units where code='B-1'`)
add(draftUnits.length === 0 ? 'PASS' : 'FAIL', 'sin contexto: unidades de borrador ocultas')

const { rows: anyLeads } = await app.query(`select id from leads`)
add(anyLeads.length === 0 ? 'PASS' : 'FAIL', 'sin contexto: leads ocultos', `visibles: ${anyLeads.length}`)

// Public contact form must still be able to insert.
try {
  await app.query(
    `insert into leads (tenant_id,project_id,name,email,source,status)
     values ($1,$2,'Público','p@x.com','website','new')`, [tB.id, pubB.id])
  add('PASS', 'sin contexto: formulario público puede crear lead')
} catch (e) {
  add('FAIL', 'sin contexto: formulario público puede crear lead', e.message.slice(0, 70))
}

// Public analytics ingest must still work.
try {
  await app.query(
    `insert into analytics_events (tenant_id,project_id,session_id,event_type)
     values ($1,$2,'sess-1','unit_view')`, [tB.id, pubB.id])
  add('PASS', 'sin contexto: ingesta de analytics permitida')
} catch (e) {
  add('FAIL', 'sin contexto: ingesta de analytics permitida', e.message.slice(0, 70))
}

await app.end()

// Cleanup with the owner connection.
await owner.query(`delete from tenants where id in ($1,$2)`, [tA.id, tB.id])
await owner.end()

console.log('\n' + '='.repeat(84))
for (const [s, n, d] of rows) console.log(`${s.padEnd(5)} │ ${n.padEnd(52)} │ ${d}`)
console.log('='.repeat(84))
const f = rows.filter((r) => r[0] === 'FAIL').length
console.log(`${rows.filter((r) => r[0] === 'PASS').length} pass · ${f} fail`)
process.exit(f > 0 ? 1 : 0)
