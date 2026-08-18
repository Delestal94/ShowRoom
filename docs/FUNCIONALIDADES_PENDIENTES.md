# Funcionalidades pendientes

Estado real del producto al 2026-08-18 (commit `45f284c`), organizado por impacto. "Pendiente" incluye tanto lo que no se empezó como lo que tiene servicio/schema pero ninguna forma de usarlo desde la UI.

---

## 🔴 Bloqueante — sin esto el producto no cumple su propósito

### Gestión de unidades desde el panel
**No existe ninguna pantalla para crear, editar o borrar unidades.** `unit-service.ts` tiene el CRUD completo (`createUnit`, `updateUnit`, `deleteUnit`, `listUnitsByProject`) pero no hay ni una página ni una API route que lo exponga en `/dashboard`. Hoy el flujo real es: creás un proyecto → no hay forma de cargarle unidades → el storefront público lo muestra sin inventario.

Esto es más urgente que cualquier otra cosa de esta lista: es el corazón del producto (mostrar unidades disponibles con precio/m²/orientación) y ahora mismo está totalmente ausente del admin.

Falta:
- `POST/PATCH/DELETE /api/dashboard/projects/[projectId]/units[/unitId]`
- Página `dashboard/projects/[projectId]/units/new` y edición inline o `[unitId]/page.tsx`
- Carga individual y, idealmente, importación masiva (CSV) — cargar unidad por unidad para un edificio de 80 departamentos no escala

### Procesamiento de tours subidos
Un tour subido queda con `status: 'processing'` para siempre — no hay ningún job que lo pase a `'ready'`. `Inngest`, la pieza que el plan original preveía para esto, nunca se instaló. Hoy `createTour()` debería directamente insertar con `status: 'ready'` (no hay transcodificación real pasando), o hay que definir qué procesamiento se espera y quién lo hace.

---

## 🟠 Alto impacto — el producto "casi" funciona sin esto

### Billing real
- No hay checkout de Stripe en ningún lado (`stripe.checkout.sessions.create` no se llama desde nada). El webhook (`/api/webhooks/stripe`) *recibe* eventos pero no hay forma de que un tenant efectivamente elija un plan y pague.
- `plans` es una tabla vacía sin seed; los precios que se ven en la landing están hardcodeados en `pricing.tsx`, sin conexión a Stripe Price IDs reales.
- No hay enforcement de `unit_limit` por plan — un tenant en el plan gratuito podría cargar unidades ilimitadas.
- `.env.local` tiene claves de Stripe de placeholder (`sk_test_1234567890`), así que ni siquiera está configurado para probar en modo test.

### Aislamiento multi-tenant (RLS)
Documentado en detalle en `CODIGO_MUERTO.md` sección 6. Resumen: las políticas RLS están escritas pero deshabilitadas en la base real, y la app depende 100% de que cada query tenga `tenantId` en el `where`. Sin esto, un bug de un desarrollador (olvidar un filtro) expone datos de otro tenant sin ninguna red de contención. Es el ítem de seguridad más importante del roadmap.

### Publicar / despublicar proyecto
`projects.status` soporta `'draft' | 'published'`, y el storefront público sólo muestra proyectos publicados — pero no hay ningún botón en el admin para cambiar ese estado. Todo proyecto creado queda en `draft` para siempre a menos que se edite directo en la base.

### Editar proyecto ya creado
Hay creación (`/dashboard/projects/new`) pero no edición. Si te equivocaste en el nombre, la dirección o querés cambiar el slug, no hay dónde hacerlo.

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
- CRUD de proyectos (crear, listar, ver detalle) — **falta editar**
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

## Orden sugerido si hay que priorizar

1. **Gestión de unidades** — sin esto no hay producto que mostrar.
2. **Publicar/despublicar + editar proyecto** — completa el loop básico de "cargar → publicar → compartir".
3. **RLS real** — antes de tener un segundo tenant pagando, no después.
4. **Billing** — checkout + enforcement de límites, recién ahí tiene sentido cobrar.
5. Todo lo demás (brokers, PDF, edificios, super-admin) es valor agregado sobre una base que ya vende.
