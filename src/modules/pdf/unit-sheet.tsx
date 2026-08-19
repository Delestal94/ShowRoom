import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

export interface UnitSheetData {
  projectName: string
  projectAddress: string | null
  developerName: string
  unitCode: string
  floor: number | null
  m2: string | null
  price: string | null
  currency: string | null
  bedrooms: number | null
  orientation: string | null
  status: string
  publicUrl: string
  /** PNG del QR ya generado, como data URI. */
  qrDataUri: string
  contactWhatsapp: string | null
}

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  sold: 'Vendida',
}

// La ficha se imprime y se manda por WhatsApp: fondo blanco y tinta oscura,
// no el tema oscuro de la app.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#1a1a1a', fontFamily: 'Helvetica' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 16,
  },
  developer: { fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  project: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  address: { fontSize: 10, color: '#666', marginTop: 2 },
  unitBlock: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between' },
  unitCode: { fontSize: 40, fontFamily: 'Helvetica-Bold', letterSpacing: -1 },
  unitLabel: { fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  badge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  price: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginTop: 20 },
  pricePerM2: { fontSize: 10, color: '#666', marginTop: 3 },
  specs: { marginTop: 28, borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  specLabel: { color: '#666' },
  specValue: { fontFamily: 'Helvetica-Bold' },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 16,
  },
  qr: { width: 88, height: 88 },
  qrCaption: { fontSize: 8, color: '#888', marginTop: 4, maxWidth: 88, textAlign: 'center' },
  url: { fontSize: 8, color: '#888', maxWidth: 300 },
  disclaimer: { fontSize: 7, color: '#aaa', marginTop: 6, maxWidth: 300 },
})

function money(value: string | null, currency: string | null) {
  if (!value) return 'Consultar'
  const n = Number(value)
  if (!Number.isFinite(n)) return 'Consultar'
  return `${currency ?? 'USD'} ${n.toLocaleString('es-AR')}`
}

function perM2(price: string | null, m2: string | null, currency: string | null) {
  const p = Number(price)
  const s = Number(m2)
  if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0) return null
  return `${currency ?? 'USD'} ${Math.round(p / s).toLocaleString('es-AR')} por m²`
}

function badgeStyle(status: string) {
  if (status === 'available') return { backgroundColor: '#e6f6ec', color: '#1a7f43' }
  if (status === 'reserved') return { backgroundColor: '#fdf3e0', color: '#96650d' }
  return { backgroundColor: '#f0f0f0', color: '#777' }
}

export function UnitSheet({ data }: { data: UnitSheetData }) {
  const ppm2 = perM2(data.price, data.m2, data.currency)

  const specs: [string, string][] = [
    ['Superficie', data.m2 ? `${Math.round(Number(data.m2))} m²` : '—'],
    ['Dormitorios', data.bedrooms != null ? String(data.bedrooms) : '—'],
    ['Orientación', data.orientation || '—'],
    ['Piso', data.floor != null ? String(data.floor) : '—'],
  ]

  return (
    <Document
      title={`${data.projectName} - Unidad ${data.unitCode}`}
      author={data.developerName}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.developer}>{data.developerName}</Text>
            <Text style={styles.project}>{data.projectName}</Text>
            {data.projectAddress && <Text style={styles.address}>{data.projectAddress}</Text>}
          </View>
        </View>

        <View style={styles.unitBlock}>
          <View>
            <Text style={styles.unitLabel}>Unidad</Text>
            <Text style={styles.unitCode}>{data.unitCode}</Text>
          </View>
          <Text style={[styles.badge, badgeStyle(data.status)]}>
            {STATUS_LABEL[data.status] ?? data.status}
          </Text>
        </View>

        <Text style={styles.price}>{money(data.price, data.currency)}</Text>
        {ppm2 && <Text style={styles.pricePerM2}>{ppm2}</Text>}

        <View style={styles.specs}>
          {specs.map(([label, value]) => (
            <View style={styles.specRow} key={label}>
              <Text style={styles.specLabel}>{label}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}
          {data.contactWhatsapp && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>WhatsApp</Text>
              <Text style={styles.specValue}>+{data.contactWhatsapp}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.url}>{data.publicUrl}</Text>
            <Text style={styles.disclaimer}>
              Precios y disponibilidad sujetos a cambio sin previo aviso. Este documento no
              constituye oferta contractual. Generado el{' '}
              {new Date().toLocaleDateString('es-AR')}.
            </Text>
          </View>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.qr} src={data.qrDataUri} />
            <Text style={styles.qrCaption}>Escaneá para el recorrido 3D</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
