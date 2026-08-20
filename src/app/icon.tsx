import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/** Favicon generado a partir de la marca, para no depender de un .ico suelto. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0e14',
          borderRadius: 7,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 2.5 29 10v12L16 29.5 3 22V10L16 2.5Z"
            stroke="#7c5cff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M3 10l13 7.5L29 10M16 17.5v12"
            stroke="#7c5cff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      </div>
    ),
    size
  )
}
