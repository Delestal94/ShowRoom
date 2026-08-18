# Configurar Mercado Pago

Stripe no opera en Argentina, así que el cobro de suscripciones va por Mercado Pago. El código ya está implementado; falta cargar tus credenciales.

---

## 1. Conseguir las credenciales

1. Entrá a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel) con tu cuenta.
2. **Tus integraciones → Crear aplicación**. Elegí "Pagos online" y "Suscripciones".
3. En **Credenciales de producción** copiá el **Access Token**.

Para probar sin cobrar plata real, usá primero las **Credenciales de prueba** y las [tarjetas de test](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/test/cards).

---

## 2. Cargar las variables

En **Vercel → Settings → Environment Variables** (y en tu `.env.local` para desarrollo):

```
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
```

`MP_WEBHOOK_SECRET` sale del paso siguiente.

---

## 3. Configurar el webhook

En el panel de tu aplicación, **Webhooks → Configurar notificaciones**:

- **URL**: `https://show-room-ten.vercel.app/api/webhooks/mercadopago`
- **Eventos**: marcá **Suscripciones** (`subscription_preapproval`)

Al guardar, Mercado Pago te muestra una **clave secreta**. Esa es `MP_WEBHOOK_SECRET`.

> El webhook valida la firma HMAC de cada notificación. Sin `MP_WEBHOOK_SECRET` cargada, **rechaza todo** — es deliberado: sin esa validación cualquiera podría mandar un evento falso de "authorized" y habilitarse un plan pago sin pagar.

---

## 4. Publicar los planes

Con `MP_ACCESS_TOKEN` ya en `.env.local`:

```bash
npm run seed:plans
```

Crea (o actualiza) los tres planes en la base y los publica en Mercado Pago como `preapproval_plan`. Es re-ejecutable: si un plan ya está publicado, no lo duplica.

Los precios están en `scripts/seed-plans.mjs` — editalos ahí y volvé a correr el script.

| Plan | Precio | Proyectos | Unidades |
|---|---|---|---|
| Solo | ARS 29.000/mes | 1 | 40 |
| Lite | ARS 89.000/mes | 5 | 300 |
| Pro | ARS 239.000/mes | sin tope | sin tope |

Sin suscripción, un tenant queda en el plan gratuito: **1 proyecto y 10 unidades**.

---

## Cómo funciona el flujo

1. El usuario elige un plan en `/dashboard/billing`.
2. Creamos un `preapproval` en Mercado Pago con `external_reference = tenantId` y lo redirigimos al `init_point`.
3. Autoriza el débito automático en Mercado Pago.
4. MP nos notifica al webhook. Verificamos la firma, **re-consultamos la API** (la notificación sólo avisa que algo cambió, no a qué cambió) y guardamos el estado.
5. Recién cuando el estado es `authorized` se habilitan los límites del plan. Una suscripción `pending` sigue contando como plan gratuito.

Los límites se aplican en `checkCanCreate()`, que corre antes de crear proyectos y unidades — incluida la importación masiva, que valida el lote completo antes de insertar nada.

---

## Verificar que quedó bien

```bash
npm run seed:plans     # debe decir "publicado en MP" en las tres filas
npm run test:isolation # el aislamiento entre tenants no debe romperse
```

En la app, `/dashboard/billing` deja de mostrar el aviso de "Mercado Pago no está configurado" y los botones de suscripción quedan habilitados.
