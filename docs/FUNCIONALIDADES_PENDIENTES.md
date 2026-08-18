# Funcionalidades pendientes

Estado real del producto al 2026-08-18 (commit `45f284c`), organizado por impacto. "Pendiente" incluye tanto lo que no se empezó como lo que tiene servicio/schema pero ninguna forma de usarlo desde la UI.

---

## 🔴 Bloqueante — sin esto el producto no cumple su propósito

### ~~Gestión de unidades desde el panel~~ — HECHO (2026-08-18)
Implementado: alta individual, importación masiva pegando desde Excel/Sheets, tabla con edición inline y borrado. Ver `/dashboard/projects/[projectId]/units`.

<details><summary>Diagnóstico original</summary>

**No existía ninguna pantalla para crear, editar o borrar unidades.** `unit-service.ts` tiene el CRUD completo (`createUnit`, `updateUnit`, `deleteUnit`, `listUnitsByProject`) pero no hay ni una página ni una API route que lo exponga en `/dashboard`. Hoy el flujo real es: creás un proyecto → no hay forma de cargarle unidades → el storefront público lo muestra sin inventario.

Esto es más urgente que cualquier otra cosa de esta lista: es el corazón del producto (mostrar unidades disponibles con precio/m²/orientación) y ahora mismo está totalmente ausente del admin.

Falta:
- `POST/PATCH/DELETE /api/dashboard/projects/[projectId]/units[/unitId]`
- Página `dashboard/projects/[projectId]/units/new` y edición inline o `[unitId]/page.tsx`
- Carga individual y, idealmente, importación masiva (CSV) — cargar unidad por unidad para un edificio de 80 departamentos no escala

</details>

### ~~Procesamiento de tours subidos~~ — RESUELTO (2026-08-18)
Se resolvió por la vía simple: como no hay ningún paso de transcodificación real, `createTour()` ahora inserta directamente con `status: 'ready'`. El archivo ya está subido y servible cuando se escribe la fila. Si más adelante se agrega procesamiento real (compresión Draco, generación de thumbnails), ahí sí hará falta Inngest.

<details><summary>Diagnóstico original</summary>

Un tour subido quedaba con `status: 'processing'` para siempre — no hay ningún job que lo pase a `'ready'`. `Inngest`, la pieza que el plan original preveía para esto, nunca se instaló. Hoy `createTour()` debería directamente insertar con `status: 'ready'`, o hay que definir qué procesamiento se espera y quién lo hace.

</details>

---

## 🟠 Alto impacto — el producto "casi" funciona sin esto

### ~~Billing real~~ — HECHO (2026-08-18), falta cargar credenciales

Se migró de Stripe a **Mercado Pago**: Stripe no opera en Argentina (46 países soportados, Argentina no está), así que la única alternativa con Stripe habría sido armar una LLC en EE.UU.

Implementado:
- Cliente de la API de suscripciones de Mercado Pago (`preapproval_plan` + `preapproval`).
- Página `/dashboard/billing`: plan actual, uso contra los límites, planes disponibles, cancelación.
- Webhook en `/api/webhooks/mercadopago` con **verificación de firma HMAC** — sin eso cualquiera podría mandar un evento falso de "authorized" y habilitarse un plan pago gratis.
- Enforcement real de límites: `checkCanCreate()` corre antes de crear proyectos y unidades, incluida la importación masiva (chequea el lote completo, no fila por fila).
- Plan gratuito por defecto (1 proyecto, 10 unidades) para tenants sin suscripción.
- Una suscripción `pending` **no** habilita límites pagos: sólo `authorized` cuenta.
- Seed de planes (`npm run seed:plans`) que además los publica en Mercado Pago.
- La landing ahora lee precios de la base en vez de tenerlos hardcodeados.

**Pendiente (requiere tu cuenta de Mercado Pago):** cargar `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`, y volver a correr `npm run seed:plans` para publicar los planes. Hasta entonces la página muestra los planes pero no deja suscribirse.

### ~~Aislamiento multi-tenant (RLS)~~ — HECHO (2026-08-18)
Implementado con un rol de DB dedicado sin `BYPASSRLS`, políticas reescritas para no romper el storefront público, y helpers `withTenant()`/`withUser()`. Verificado con `scripts/test-tenant-isolation.mjs` (15/15): el rol de la app no puede leer ni escribir datos de otro tenant ni nombrando el id directamente. Detalle completo en `CODIGO_MUERTO.md` sección 6.

### ~~Publicar / despublicar proyecto~~ — HECHO (2026-08-18)
Botón en la página del proyecto. Publicar con 0 unidades y 0 tours se bloquea con explicación, para no dejar una página vacía detrás de un link que el usuario está por compartir.

### ~~Editar proyecto ya creado~~ — HECHO (2026-08-18)
`/dashboard/projects/[projectId]/edit` — nombre, slug y dirección. También se agregó borrado con confirmación.

---

## 🟡 Del plan original, todavía no empezado

Reproduciendo las fases del plan (`wiggly-percolating-marble.md`) contra lo que existe:

| Feature del plan | Estado |
|---|---|
| Comparador de terminaciones (`finishOptions`) | Tabla en schema, cero implementación |
| Ficha técnica en PDF con QR | No empezado. `@react-pdf/renderer` no está instalado |
| Navegación piso por piso en el visor 3D | No implementada — el visor GLB actual es un modelo único navegable en órbita, sin lógica de "piso seleccionado" |
| Links de broker con tracking (`brokerLinks`) | Tabla en schema, cero implementación. `analyticsEvents.brokerMemberId` existe pero nunca se escribe |
| Reportes de leads/analytics segregados por broker | Depende de lo anterior — no empezado |
| Timeline de actividad del lead (`leadActivities`) | Servicio existe (`addLeadActivity`, `getLeadActivities`), sin UI. Hoy el Kanban sólo mueve estados, no registra ni muestra historial |
| Dominios custom por tenant | Campo `tenants.customDomain` existe en schema, sin UI para configurarlo ni integración con la API de dominios de Vercel |
| Panel super-admin (tenants, planes, impersonation) | No existe ninguna ruta `/super-admin` ni similar |
| WhatsApp click-to-chat real | El link existe pero con número hardcodeado falso; falta campo de teléfono en `tenants` y cablearlo |
| Invitar usuarios a un tenant con rol | `memberships` soporta roles (`tenant_admin`, `editor`, `broker`) pero hoy sólo se crea automáticamente un membership admin en el primer login. No hay forma de invitar a un segundo usuario al mismo tenant |
| Edificios/torres (`buildings`) | Tabla en schema, cero implementación — hoy todas las unidades cuelgan directo del proyecto, sin agrupación por edificio |
| Cache de resolución de tenant (Edge Config) | Se usa un `Map` en memoria que no persiste entre invocaciones serverless — en la práctica no cachea nada |
| Rate limiting | No implementado (Upstash Redis nunca se instaló) |

---

## 🟢 Ya funciona (para no repetir trabajo)

Para que quede claro qué **no** hay que tocar:

- Auth completa con Supabase (sign-up, sign-in, confirmación por mail, sign-out, protección de rutas)
- Auto-provisioning de tenant en el primer login
- Gestión de unidades: alta individual, importación masiva desde planilla, edición inline, borrado
- Ficha pública por unidad con contenido propio y URL compartible
- Mapa de ubicación con puntos de interés (Leaflet + tiles sin API key)
- Timeline del lead, con los cambios de estado registrados automáticamente
- QR descargable, modo embebido para iframe/pantalla táctil, y headers que impiden embeber el panel
- Aislamiento multi-tenant real con RLS a nivel de Postgres
- Planes y suscripciones con Mercado Pago, con límites aplicados de verdad
- CRUD de proyectos completo: crear, listar, ver, editar, publicar/despublicar, borrar
- Subida de tours (GLB, 360°, foto, video) vía URL firmada directa a Supabase Storage
- Visor 3D (GLB) con toggle día/atardecer/noche
- Visor 360° (Pannellum)
- Buscador de unidades público con filtros (precio, m², orientación, dormitorios, piso)
- Formulario de contacto público → creación de lead
- CRM con Kanban funcional (mueve estado real vía API, con chequeo de tenant)
- Analytics: ingesta de eventos, stats agregados, ranking de unidades más vistas, heatmap de engagement — con las queries SQL corregidas
- 404 real en proyectos inexistentes
- Diseño completo (landing, auth, dashboard) con sistema de tokens propio

---

## Del análisis de Urbania (ver `ANALISIS_URBANIA.md`)

Contrastando su video de presentación contra lo que tenemos, aparecieron dos huecos que no estaban en ninguna lista previa:

- ~~**Ficha técnica por unidad con contenido propio**~~ — HECHO (2026-08-18). `/[proyecto]/unidad/[código]` con URL propia compartible, precio por m², contenido propio de la unidad y fallback avisado al recorrido del proyecto. Admin en `/dashboard/projects/[id]/units/[unitId]`.
- **Avances de obra + aviso automático a inversores.** Específico de la preventa: la obra dura años y esto es lo que sostiene el vínculo con el comprador mientras tanto. Requiere tabla nueva y envío de mails.

Más baratos y con impacto visible:
- **Mapa de ubicación y puntos de interés** — `projects.geo` ya existe sin usar.
- **Embed en la web del cliente (iframe) + QR + modo kiosco** para pantallas táctiles.
- **Más filtros** vía `units.attrsJson`, que existe justamente para eso (cochera, baulera, amenities) sin migraciones por atributo.

---

## Orden sugerido si hay que priorizar

Los tres primeros ítems de la lista original ya están hechos (unidades, publicar/editar, RLS), más billing. Lo que sigue:

Hechos el 2026-08-18: ~~mapa de ubicación~~, ~~timeline del lead~~, ~~embed + QR + modo kiosco~~.

1. **Avances de obra + aviso a inversores** — lo que hace que el comprador vuelva durante los años de obra. Requiere tabla nueva y un proveedor de mail (Resend o similar).
2. **Links de broker con tracking** — desbloquea los reportes segregados.
3. **Navegación piso por piso** en el visor 3D. Depende de cómo esté estructurado el modelo GLB: sin nodos por piso en el archivo, no hay nada que seleccionar.
4. **Invitar usuarios al tenant** — hoy es un solo usuario por inmobiliaria.
5. El resto (PDF de ficha, edificios, terminaciones, super-admin, dominios custom, más filtros vía `attrs_json`) es valor agregado sobre una base que ya vende.
