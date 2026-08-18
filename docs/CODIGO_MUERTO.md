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

- ~~**`getScopedDbClient()`**~~ — resuelto. `src/server/db/client.ts` entero se borró: su reemplazo es `withTenant()`/`withUser()` en `src/server/db/tenant-db.ts`, que sí se usa en todos los servicios.
- **`getTenantFromRequestHost()`** — `src/modules/tenancy/tenant-context.ts`. Pensada para resolver tenant por subdominio/dominio custom en el storefront público. El middleware ya inyecta `x-tenant-slug`, pero ningún Server Component la lee todavía — el storefront público resuelve todo por slug de proyecto, no por tenant.
- **`getUnitPopularity`, `getEventStats`, `getHeatmapData`** — se llaman desde `/dashboard/analytics`, así que estas sí están vivas (se arreglaron sus bugs de SQL el 2026-08-18).

---

## 3. Rutas API huérfanas

- ~~**`POST /api/tenants`**~~ — borrada (2026-08-18). No la llamaba nadie; la creación de tenant es automática en `getCurrentTenant()` al primer login.

---

## 4. UI con placeholders o datos falsos

- **Link de WhatsApp en `contact-form.tsx:159`** — apunta a `https://wa.me/1234567890`, número hardcodeado y falso. No lee ningún dato del tenant. Para que sirva necesita un campo de teléfono de contacto en `tenants` (no existe en el schema) y pasarlo como prop.
- **`ContactForm` recibe `projectId={projectSlug}`** en `storefront-client.tsx:150` — le está pasando el *slug* donde se espera un *id*. La API pública de leads ignora ese campo del body y vuelve a resolver el proyecto por slug internamente, así que hoy no rompe nada — pero es una prop mal cableada que puede confundir a quien la use en otro lado.
- **Planes de precios en la landing** (`pricing.tsx`) — hardcodeados en el componente. No hay Stripe Price IDs reales detrás (`.env.local` tiene claves de test falsas: `pk_test_51234567890`).

---

## 5. Infraestructura declarada pero no instalada

Del plan original (`wiggly-percolating-marble.md`), estas piezas de stack **nunca se instalaron**, aunque el `.env.local` tiene variables para una de ellas:

- **Inngest** (jobs en background) — `.env.local` tiene `INNGEST_EVENT_KEY=dummy_key`, pero el paquete no está en `package.json`. Nada corre en background. El síntoma visible (tours colgados en `processing` para siempre) se resolvió creándolos directamente en `ready`, ya que no hay procesamiento real que esperar. Inngest recién haría falta si se agrega compresión Draco, thumbnails o similar.
- **Upstash Redis** (cache/rate limiting) — no instalado, no usado. El middleware no tiene rate limiting.
- **Vercel Edge Config** (cache de resolución de tenant) — el plan lo proponía para no pegarle a Postgres en cada request; hoy `getTenantFromSlug()` tiene un cache en memoria simple (`Map`) que se resetea en cada cold start de la función serverless, así que en la práctica no cachea nada entre requests.

---

## 6. RLS — RESUELTO (2026-08-18)

Estaba listado como la deuda más grande del proyecto. Ya está implementado y verificado.

Al implementarlo apareció algo que no estaba en el diagnóstico original y que era peor de lo que parecía: **aplicar `rls-policies.sql` tal como estaba escrito no habría protegido nada**. El rol con el que se conectaba la app (`neondb_owner`) tiene `BYPASSRLS` y además es dueño de las 14 tablas — dos razones independientes por las que Postgres ignora las políticas. Las policies habrían quedado creadas, `rowsecurity` habría dicho `true`, y cada query habría seguido viendo todos los tenants.

Lo que se hizo:

- Rol dedicado `showroom_app`, sin `BYPASSRLS` y sin ser dueño de las tablas (Neon no permite quitarle `BYPASSRLS` al rol dueño, así que un rol nuevo era la única vía). La app runtime se conecta con este rol vía `DATABASE_URL_APP`; `DATABASE_URL` queda sólo para migraciones.
- `FORCE ROW LEVEL SECURITY` en las 12 tablas tenant-scoped.
- Políticas reescritas: las originales habrían roto el storefront público, la captura de leads, la ingesta de analytics y el login. Ahora modelan la realidad — un proyecto publicado *es* público, y el formulario de contacto *es* anónimo.
- `withTenant()` / `withUser()` en `src/server/db/tenant-db.ts`: cada operación corre en una transacción con `set_config(..., true)`, que es transaction-local y por lo tanto no se filtra entre requests que reusan la misma conexión del pool.
- Todos los servicios migrados a estos helpers.
- `scripts/test-tenant-isolation.mjs`: suite que se conecta con el rol de la app e intenta activamente cruzar datos entre tenants. 15/15.

Si `DATABASE_URL_APP` no está seteada, la app cae al rol dueño y sigue funcionando, pero **sin RLS** — ese caso emite un warning explícito en producción.

## 7. Archivos de documentación desactualizados

- `PHASE_0_STATUS.md`, `PHASE_1_STATUS.md`, `SETUP_GUIDE.md`, `R2_SETUP.md` — describen el estado del proyecto con Clerk y R2, ninguno de los dos sigue en uso. `R2_SETUP.md` en particular documenta un proveedor de storage que se reemplazó por Supabase Storage hace varias iteraciones. Convendría archivarlos o borrarlos para que no confundan a quien lea el repo.
