# Qué tiene Urbania que nosotros no

Análisis hecho sobre la transcripción del video de presentación de Urbania (su fundador enumerando el producto), contrastado contra el estado real de ShowRoom al 2026-08-18.

Es la fuente más confiable que tuvimos hasta ahora sobre su alcance: no es lo que se ve navegando el sitio, es lo que ellos eligen destacar como propuesta de valor.

---

## Lo que ya tenemos cubierto

| Feature de Urbania | Nuestro estado |
|---|---|
| Showroom compartible por enlace | ✅ Cada proyecto publicado tiene su URL |
| Recorridos 360° | ✅ Visor Pannellum |
| Buscador de unidades con filtros | ⚠️ Tenemos 9 filtros; ellos dicen "decenas" |
| Disponibilidad de unidades | ✅ Estados disponible/reservada/vendida |
| Gestión de prospectos | ✅ CRM con pipeline Kanban |
| Métricas del showroom | ✅ Analytics con heatmap por unidad |
| Panel de cliente | ✅ Dashboard |

---

## Lo que nos falta, ordenado por valor sobre esfuerzo

### 1. Ficha técnica por unidad con contenido propio
Ellos: *"puedo ingresar a cada una y ver su ficha técnica junto a todo el contenido como renders interiores, planos 3D, recorridos 360 de la unidad puntual, tomas con dron"*.

Hoy nuestros tours son a nivel proyecto. `tours.unitId` **ya existe en el schema** pero no hay UI que lo use ni página de detalle de unidad en el storefront. Es la brecha más grande respecto de ellos, y buena parte de la base ya está puesta.

### 2. Avances de obra + aviso automático a inversores
Ellos: *"poder ver y cargar avances de obra"* y *"cargar avances de obra y [enviar] un correo automático a tus inversores sobre los avances"*.

**No estaba en ninguna de nuestras listas.** Es específico de la preventa: una obra dura 3 a 5 años y esto es lo que sostiene el vínculo con el comprador en el medio. Requiere tabla nueva (avances con fecha, fotos, descripción) y un canal de envío de mails.

### 3. Mapa de ubicación y puntos de interés
Ellos: *"ver la ubicación del proyecto y puntos de interés cercanos"*.

`projects.geo` **ya existe** en el schema, sin usar. Es de los ítems más baratos con más impacto visible en la página pública.

### 4. Embeber el showroom en la web del cliente
Ellos: *"se comparten mediante un enlace o se integran en tu propia página web, se comparte por redes sociales, por QR, se utiliza con pantallas táctiles"*.

Nos falta el modo embed (iframe) y el QR. Poco esfuerzo. Lo de pantallas táctiles es un modo kiosco: pantalla completa, sin scroll de página.

### 5. Navegación piso por piso
Ellos: *"en el menú de secciones puedo elegir navegar piso por piso"*.

Ya estaba en nuestra lista de pendientes. Hoy el visor 3D es un modelo único navegable en órbita, sin lógica de piso seleccionado.

### 6. Archivos descargables
Ellos: *"ver videos, archivos y planos"*. Brochure en PDF, planos, fichas. Parcialmente cubierto por el ítem de PDF con QR que ya teníamos anotado.

### 7. Más filtros
`units.attrsJson` ya existe justamente para esto: filtros dinámicos (cochera, baulera, balcón, amenities) sin migraciones por cada atributo nuevo.

---

## Lo que NO conviene copiar

Esto es tan importante como la lista de arriba.

**La producción del contenido visual.** Ellos dicen: *"todo el contenido visual de los proyectos lo hace nuestro propio equipo de forma interna, por lo cual nuestros clientes pueden centralizar en un único proveedor"*. Ese es su verdadero diferencial — y **no es software, es un negocio de servicios** con equipo de artistas 3D. Ya lo excluimos del alcance desde el plan original, y sigue siendo la decisión correcta para un proyecto mantenido por una persona.

**El generador de piezas para redes.** *"Todo el contenido del showroom se transforma automáticamente en otras piezas: historias, publicaciones, carruseles, presentaciones, documentos, videos… miles de plantillas"*. Es un producto entero en sí mismo, un Canva acotado al rubro. Y sólo tiene sentido cuando ya sos dueño del contenido, que es el punto anterior.

**Landing pages y brochures ilimitados desde plantillas.** Ellos los regalan porque su costo marginal es cero: ya tienen el contenido y las plantillas armadas. Para nosotros sería construir dos productos más desde cero.

**Soporte 24/7 y tutoriales.** Operativo, no software.

---

## Conclusión

El video confirma que el núcleo del producto lo tenemos: showroom compartible, 360, inventario con filtros, CRM y métricas.

La diferencia real está en **profundidad de contenido por unidad** (ítem 1) y en **acompañar la obra en el tiempo** (ítem 2) — que es lo que hace que el comprador vuelva al showroom durante años en vez de visitarlo una vez.

Su ventaja competitiva más fuerte —producir ellos el contenido— no es replicable con software, y tratar de copiarla nos sacaría del negocio que elegimos.
