# Bitácora de auditoría UX/UI

Registro de las iteraciones del agente `ux-critic`. Sirve para dos cosas: no
volver a revisar lo mismo, y no re-abrir decisiones que ya se tomaron a
conciencia.

Formato de cada entrada:

```
## AAAA-MM-DD — <área>

**Hallazgos**
- [alta|media|baja] descripción — archivo:línea

**Arreglado**
- qué cambió y por qué

**Pendiente / decidido dejar así**
- con el motivo
```

## Áreas a rotar

- [ ] Landing (`src/app/page.tsx`)
- [x] Storefront de proyecto (`src/app/(public)/[projectSlug]`) — 2026-09-09
- [x] Detalle de unidad — 2026-09-09
- [ ] Visor 3D / 360 (`src/components/tour-viewer.tsx`)
- [ ] Listado y alta de proyectos
- [ ] Tabla de unidades
- [ ] CRM / leads
- [ ] Ajustes e invitaciones
- [ ] Auth (sign-in / sign-up / invitación)
- [ ] Facturación

---

## 2026-09-09 — Storefront de proyecto y detalle de unidad (mobile-first)

**Hallazgos**
- [alta] El formulario de contacto se renderizaba entre el visor y la grilla de
  unidades. En mobile el comprador que llega por WhatsApp tiene que scrollear
  cuatro campos antes de ver un solo precio — `storefront-client.tsx`
- [alta] No había ninguna vía de contacto persistente en mobile: una vez que
  scrolleás a las unidades, WhatsApp queda fuera de pantalla —
  `storefront-client.tsx`, `unit-detail-client.tsx`
- [alta] "Ver ficha →" estaba en `opacity-0` hasta el hover. En un celular no
  hay hover: las tarjetas de unidad no daban ninguna señal de ser clickeables
  — `unit-grid.tsx`
- [alta] En el detalle de unidad, "Otras unidades" vivía dentro de la columna
  izquierda, así que en mobile aparecía **antes** que el precio y las
  superficies de la unidad que el usuario acababa de elegir —
  `unit-detail-client.tsx`
- [media] Si `/units/search` fallaba, el catch sólo hacía `console.error` y la
  grilla mostraba "No hay unidades que coincidan". Le miente al comprador: el
  proyecto sí tiene unidades, falló la consulta — `storefront-client.tsx`
- [media] El formulario no anunciaba errores ni el éxito a un lector de
  pantalla, y los inputs no tenían `autoComplete`/`inputMode`: teclado
  equivocado y cero autocompletado en el celular — `contact-form.tsx`
- [baja] Foco no visible en las tarjetas de unidad ni en los chips de unidades
  hermanas — `unit-grid.tsx`, `unit-detail-client.tsx`

**Arreglado**
- El formulario del hero pasa a `hidden lg:block` y se repite como sección
  `#contacto` después de las unidades. En mobile el orden ahora es
  visor → precios → contacto, que es el orden de la decisión de compra.
- Nuevo `mobile-contact-bar.tsx`: barra fija al pie sólo en mobile, con
  "Dejar mis datos" (ancla al formulario) y WhatsApp. Respeta
  `safe-area-inset-bottom` y va acompañada de un spacer para no tapar el pie.
  Se usa en storefront y en detalle de unidad, y se oculta si la unidad está
  vendida. Verde de WhatsApp con texto oscuro fijo para no depender del tema.
- "Ver ficha y consultar →" siempre visible, con foco visible en la tarjeta.
- "Otras unidades" salió de la columna izquierda a una sección propia debajo
  de la grilla: en mobile el precio y la ficha vienen primero.
- Estado de error real en `UnitGrid` (`error` + `onRetry`), con "Reintentar";
  el contador de resultados deja de mostrar un número falso.
- `role="alert"` en el error, `role="status"` en el éxito, `aria-busy` en el
  botón, y `autoComplete`/`inputMode`/`enterKeyHint` en nombre, email y
  teléfono. Aviso `sr-only` en el link de PDF que abre pestaña nueva.

**Pendiente / decidido dejar así**
- Los filtros en mobile ocupan una tarjeta entera arriba de la grilla y empujan
  las unidades hacia abajo. Debería ser un panel colapsable o un bottom sheet;
  queda para la iteración de la grilla de unidades.
- El precio no se repite en el header sticky del detalle de unidad. Se dejó
  así: la spec card es lo primero después del visor en mobile, y duplicarlo
  competía con el código de unidad.
- `formatPrice` está duplicado en `unit-grid.tsx` y `unit-spec-card.tsx` con
  redondeos distintos (`maximumFractionDigits: 0` vs `toLocaleString`). No se
  unificó para no tocar formato de precios en la misma pasada que el layout.
- `TourViewer` recibe `tours as any` en ambas pantallas: los tipos de tour
  están duplicados por componente. Es deuda de tipos, fuera del alcance de
  presentación.

---

## 2026-09-09 — Repaso de la iteración mobile (code-review)

Revisión del diff `01a5532~1..HEAD` con `/code-review`. No es una iteración
nueva de diseño: son los defectos que dejó la pasada anterior.

**Hallazgos**
- [alta] El storefront monta `ContactForm` dos veces (aside desktop + sección
  mobile, ambas siempre en el DOM) y los ids estaban hardcodeados
  (`cf-name`, `cf-email`…). En el celular cada etiqueta visible resolvía al
  input de la copia oculta: tocar el label no enfocaba nada y el lector de
  pantalla asociaba mal — `contact-form.tsx`
- [alta] `MobileContactBar` se renderizaba también con `embed=1`. Es una barra
  `fixed` dentro de un iframe que puede ser más bajo que ella, así que tapaba
  el contenido embebido para siempre, y su link de WhatsApp se llevaba al
  visitante fuera del sitio anfitrión — `storefront-client.tsx`
- [media] El spacer `h-24` quedó **antes** del `<footer>`, así que la barra
  seguía tapando el pie al final de la página — `storefront-client.tsx`,
  `unit-detail-client.tsx`
- [media] `loadError` sólo se limpiaba al tener éxito, así que el contador
  seguía diciendo "No pudimos cargar el listado" mientras el reintento ya
  estaba buscando — `storefront-client.tsx`
- [media] En la ficha PDF, `decodeURIComponent(params.unitCode)` quedó fuera
  del try/catch nuevo: un código con `%` suelto tiraba un URIError sin
  manejar — `ficha/route.ts`

**Arreglado**
- Los ids del formulario derivan de `useId()`: dos copias montadas no chocan.
- La barra fija y su spacer quedan detrás de `!embed`, igual que el footer.
- El spacer pasa después del footer en ambas pantallas.
- `setLoadError(false)` al arrancar cada búsqueda.
- El decode del código de unidad va adentro del try, con fallback al valor
  crudo.
- Verificado con `npx tsc --noEmit` y `npm run build` (verde con env dummy).

**Pendiente / decidido dejar así**
- Cuando la búsqueda falla, `UnitGrid` reemplaza la grilla por el panel de
  error y se pierden las unidades que ya estaban en pantalla. Se dejó así:
  mostrar unidades que no corresponden a los filtros aplicados también engaña.
  Si se cambia, hay que aclarar en la UI que el listado está desactualizado.
- `/api/uploads/presign` crea el cliente de Supabase en el scope del módulo,
  así que `next build` se cae en "Collecting page data" si faltan las env vars.
  En Vercel están, pero vuelve el build irreproducible en local. Fuera del
  alcance de presentación.

## 2026-09-09 — Endpoint público de analytics (code-review)

Revisión del commit `b1ffd27` con `/code-review`, el único cambio reciente
que no había pasado por ninguna pasada de revisión. No es UX: queda acá para
no volver a revisarlo.

**Hallazgos**
- [alta] `metadata` se spreadeaba *después* de `unit_id`/`tour_id` en el
  payload. Viene de un cliente público sin auth y el schema permite claves
  arbitrarias, así que se podían pisar las dos claves reservadas con las que
  después agrupa el heatmap — `analytics/collect/route.ts`
- [alta] `dwell_time_ms` se aceptaba como string; el `+=` de `getHeatmapData`
  concatenaba en vez de sumar y el total del panel salía NaN —
  `analytics-service.ts:164`
- [media] `metadataSchema` acotaba el largo del valor pero no el de la clave:
  el tope de tamaño que promete el comentario no era tal —
  `analytics/collect/route.ts`

**Arreglado**
- El spread de `metadata` va antes que las claves reservadas.
- `dwell_time_ms` se fuerza a número y se descartan los no finitos.
- Largo máximo de clave en `metadataSchema`.
- Verificado con `tsc --noEmit` y `npm run build` (verde con env dummy).

**Pendiente / decidido dejar así**
- La validación es todo-o-nada por lote: un solo evento inválido devuelve 400
  y tira el lote entero. Como `flushEvents` ya vació la cola con `splice(0)` y
  sólo reencola si el fetch *tira*, un 400 pierde en silencio hasta 10 eventos,
  incluidos los válidos. Arreglarlo es una decisión de contrato cliente/server
  (filtrar por evento y devolver 200 parcial, o reencolar ante 4xx), no un
  bug puntual: queda para una pasada propia.
- El `package-lock.json` está desincronizado de `package.json` (`picomatch`),
  así que `npm ci` falla y hay que usar `npm install`. Fuera del alcance.

## Próxima iteración sugerida

Visor 3D / 360 (`tour-viewer.tsx`, `viewer3d/`, `viewer360/`): es el
diferencial del producto y es la única área núcleo sin auditar. Interesa sobre
todo el GLB que no carga, el estado de carga en 4G y el visor en vertical.
