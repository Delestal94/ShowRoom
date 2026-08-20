/**
 * Datos estructurados (schema.org).
 *
 * Sin esto un buscador ve texto suelto; con esto entiende que hay inmuebles
 * en venta, con precio, superficie y ubicación. Es lo que habilita los
 * resultados enriquecidos y que la página aparezca en búsquedas del tipo
 * "2 ambientes en Almagro".
 *
 * El JSON se serializa escapando `<` para que un nombre de proyecto con
 * caracteres raros no pueda cerrar la etiqueta e inyectar markup.
 */
function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}

export function OrganizationJsonLd({
  name,
  url,
  description,
}: {
  name: string
  url: string
  description: string
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name,
        url,
        description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      }}
    />
  )
}

export function ProjectJsonLd({
  name,
  description,
  url,
  address,
  geo,
  developerName,
  imageUrl,
  priceRange,
}: {
  name: string
  description: string
  url: string
  address?: string | null
  geo?: { lat: number; lng: number } | null
  developerName?: string
  imageUrl?: string
  priceRange?: { min: number; max: number; currency: string } | null
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'ApartmentComplex',
        name,
        description,
        url,
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(address
          ? { address: { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'AR' } }
          : {}),
        ...(geo
          ? { geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng } }
          : {}),
        ...(developerName
          ? { provider: { '@type': 'Organization', name: developerName } }
          : {}),
        ...(priceRange
          ? {
              // Un rango de precios es lo que permite a un buscador filtrar
              // el proyecto por presupuesto.
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: priceRange.currency,
                lowPrice: priceRange.min,
                highPrice: priceRange.max,
                availability: 'https://schema.org/InStock',
              },
            }
          : {}),
      }}
    />
  )
}

export function UnitJsonLd({
  code,
  projectName,
  url,
  price,
  currency,
  m2,
  bedrooms,
  address,
  available,
  imageUrl,
}: {
  code: string
  projectName: string
  url: string
  price?: number | null
  currency?: string | null
  m2?: number | null
  bedrooms?: number | null
  address?: string | null
  available: boolean
  imageUrl?: string
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Apartment',
        name: `Unidad ${code} · ${projectName}`,
        url,
        ...(imageUrl ? { image: imageUrl } : {}),
        ...(m2
          ? { floorSize: { '@type': 'QuantitativeValue', value: m2, unitCode: 'MTK' } }
          : {}),
        ...(bedrooms ? { numberOfRooms: bedrooms } : {}),
        ...(address
          ? { address: { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'AR' } }
          : {}),
        ...(price
          ? {
              offers: {
                '@type': 'Offer',
                price,
                priceCurrency: currency ?? 'USD',
                availability: available
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/SoldOut',
                url,
              },
            }
          : {}),
      }}
    />
  )
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[]
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  )
}
