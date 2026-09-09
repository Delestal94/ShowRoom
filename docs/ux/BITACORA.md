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
