# Código muerto y deuda técnica

Relevamiento hecho leyendo el repo tal como está en `master` al 2026-08-18 (commit `45f284c`). "Muerto" acá significa: existe en el repo, compila, pero no lo llama nada del código que corre en producción — o llama a algo que no existe.

---

## 1. Tablas del schema sin ningún uso

Definidas en `src/server/db/schema.ts`, con `relations()` y todo, pero **cero** referencias fuera del propio archivo de schema:

| Tabla | Para qué era | Estado |
|---|---|---|
| `buildings` | Agrupar unidades por torre/edificio dentro de un proyecto | Sin servicio, sin UI, sin API. `projects.units` no las referencia. |
| `finishOptions` | Comparador de terminaciones (Fase 2 del plan original) | Sin servicio, sin UI, sin API. |
| `brokerLinks` | Links de tracking por broker | Sin servicio, sin UI, sin API. `analyticsEvents.brokerMemberId` existe pero nadie lo escribe. |
| `plans` | Catálogo de planes (Solo/Lite/Pro) | Sin servicio, sin seed, sin API. La landing (`pricing.tsx`) tiene los 3 planes **hardcodeados** en el componente, no leídos de esta tabla. |

**Decisión a tomar**: o se implementan, o se borran del schema hasta que haya una fase que las necesite. Tenerlas ahí sin RLS ni triggers es superficie sin ganancia.

---

## 2. Funciones que existen pero nadie llama

- **`getScopedDbClient()`** — `src/server/db/client.ts:12`. Hace `SET LOCAL app.tenant_id` para que las políticas RLS funcionen. Nadie la importa. Es la pieza que falta para que `rls-policies.sql` sirva de algo (ver sección RLS abajo).
- **`getTenantFromRequestHost()`** — `src/modules/tenancy/tenant-context.ts`. Pensada para resolver tenant por subdominio/dominio custom en el storefront público. El middleware ya inyecta `x-tenant-slug`, pero ningún Server Component la lee todavía — el storefront público resuelve todo por slug de proyecto, no por tenant.
- **`getUnitPopularity`, `getEventStats`, `getHeatmapData`** — se llaman desde `/dashboard/analytics`, así que estas sí están vivas (se arreglaron sus bugs de SQL el 2026-08-18).

---

## 3. Rutas API huérfanas

- **`POST /api/tenants`** (`src/app/api/tenants/route.ts`) — nadie la llama desde el frontend. La creación de tenant ahora es automática en `getCurrentTenant()` (primer login). Esta ruta quedó de la era en la que se pensaba crear tenants manualmente. Si no hay plan de exponerla a un super-admin, se puede borrar.

---

## 4. UI con placeholders o datos falsos

- **Link de WhatsApp en `contact-form.tsx:159`** — apunta a `https://wa.me/1234567890`, número hardcodeado y falso. No lee ningún dato del tenant. Para que sirva necesita un campo de teléfono de contacto en `tenants` (no existe en el schema) y pasarlo como prop.
- **`ContactForm` recibe `projectId={projectSlug}`** en `storefront-client.tsx:150` — le está pasando el *slug* donde se espera un *id*. La API pública de leads ignora ese campo del body y vuelve a resolver el proyecto por slug internamente, así que hoy no rompe nada — pero es una prop mal cableada que puede confundir a quien la use en otro lado.
- **Planes de precios en la landing** (`pricing.tsx`) — hardcodeados en el componente. No hay Stripe Price IDs reales detrás (`.env.local` tiene claves de test falsas: `pk_test_51234567890`).

---

## 5. Infraestructura declarada pero no instalada

Del plan original (`wiggly-percolating-marble.md`), estas piezas de stack **nunca se instalaron**, aunque el `.env.local` tiene variables para una de ellas:

- **Inngest** (jobs en background) — `.env.local` tiene `INNGEST_EVENT_KEY=dummy_key`, pero el paquete no está en `package.json`. Nada corre en background hoy: si subís un GLB de 500MB, no hay ningún paso de "procesamiento" real, el tour queda en `status: 'processing'` para siempre (nadie lo pasa a `'ready'`).
- **Upstash Redis** (cache/rate limiting) — no instalado, no usado. El middleware no tiene rate limiting.
- **Vercel Edge Config** (cache de resolución de tenant) — el plan lo proponía para no pegarle a Postgres en cada request; hoy `getTenantFromSlug()` tiene un cache en memoria simple (`Map`) que se resetea en cada cold start de la función serverless, así que en la práctica no cachea nada entre requests.

---

## 6. RLS: la deuda más grande

Esto ya se documentó en la revisión anterior pero vale repetirlo porque es el hallazgo más serio del proyecto:

- `src/server/db/rls-policies.sql` existe y define políticas para las 14 tablas tenant-scoped.
- **En la base real, RLS está deshabilitada en las 14 tablas y hay 0 políticas creadas.**
- `getScopedDbClient()` — la función que setea `app.tenant_id` para que esas políticas funcionen — nunca se llama (ver sección 2).
- Todas las queries del código (servicios en `src/modules/*/`) usan el cliente `db` plano y confían en que cada `where` incluya `tenantId` a mano.

**Por qué no se arregló todavía**: si hoy se habilita RLS sin antes migrar todo a `getScopedDbClient()`, `current_setting('app.tenant_id')` devuelve NULL en cada query y **ninguna fila se devuelve** — la app entera deja de funcionar. Es un cambio que requiere:
1. Migrar cada servicio (`project-service`, `unit-service`, `lead-service`, `tour-service`, `analytics-service`) a usar el cliente scoped en vez de `db` directo.
2. Habilitar RLS tabla por tabla, verificando después de cada una.
3. Un test automatizado de cruce entre tenants (crear tenant A y B, confirmar que A no puede leer datos de B ni con una query manual).

---

## 7. Archivos de documentación desactualizados

- `PHASE_0_STATUS.md`, `PHASE_1_STATUS.md`, `SETUP_GUIDE.md`, `R2_SETUP.md` — describen el estado del proyecto con Clerk y R2, ninguno de los dos sigue en uso. `R2_SETUP.md` en particular documenta un proveedor de storage que se reemplazó por Supabase Storage hace varias iteraciones. Convendría archivarlos o borrarlos para que no confundan a quien lea el repo.
