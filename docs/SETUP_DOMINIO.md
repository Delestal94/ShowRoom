# Dominio propio

Cómo poner ShowRoom (o el showroom de una inmobiliaria) en tu propio dominio.

---

## Estado

Lo que **ya está**: el campo en Ajustes guarda el dominio del tenant y el middleware resuelve el tenant a partir del host.

Lo que **falta y depende de vos**: comprar el dominio y conectarlo en Vercel. No es algo que se pueda automatizar desde el código sin un token de la API de Vercel con permisos sobre el proyecto.

---

## Dos escenarios distintos

### 1. El dominio de ShowRoom

Reemplaza `show-room-ten.vercel.app` por algo tuyo.

1. Comprá el dominio (Vercel, NIC.ar, o donde prefieras).
2. **Vercel → tu proyecto → Settings → Domains → Add**, cargá el dominio.
3. Vercel te da los registros DNS. Si lo compraste en Vercel, ya está; si no, cargalos donde lo compraste.
4. Actualizá `NEXT_PUBLIC_APP_URL` en las variables de entorno.

Con esto ganás además el remitente para los avisos por mail (ver `SETUP_MERCADOPAGO.md` y la sección de Resend).

### 2. El dominio de una inmobiliaria cliente

Que `showroom.inmobiliariaperez.com` muestre sus proyectos.

1. El cliente carga el dominio en **Ajustes → Dominio propio**.
2. Vos lo agregás en **Vercel → Settings → Domains**.
3. El cliente apunta un `CNAME` de ese subdominio a `cname.vercel-dns.com`.
4. Vercel emite el certificado solo.

El middleware ya resuelve el tenant desde el host, así que al llegar el tráfico por ese dominio se sirve el contenido de esa inmobiliaria.

---

## Detalle técnico

`resolveTenantSlug()` en `src/middleware.ts` ignora a propósito `*.vercel.app` y `localhost`: sin eso, `show-room-ten.vercel.app` se interpretaría como un tenant llamado "show-room-ten" — que es exactamente el bug que rompió el panel al principio del proyecto.

Para subdominios del tipo `perez.tudominio.com` hay que setear `NEXT_PUBLIC_ROOT_DOMAIN=tudominio.com`. Sin esa variable sólo funcionan los dominios cargados explícitamente en `tenants.custom_domain`.

---

## Costos

Un `.com` ronda los US$ 11–15 al año; un `.com.ar` en [NIC Argentina](https://nic.ar) bastante menos. Vercel no cobra por dominios conectados ni por los certificados.
