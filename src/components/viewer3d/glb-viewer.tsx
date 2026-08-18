'use client'

import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'

interface GLBViewerProps {
  url: string
  enableDayNight?: boolean
  initialLighting?: 'day' | 'sunset' | 'night'
}

function GLBModel({ url, lighting }: { url: string; lighting: string }) {
  const { scene } = useGLTF(url)

  return (
    <>
      <primitive object={scene} />
      <Environment preset={lighting === 'night' ? 'night' : lighting === 'sunset' ? 'sunset' : 'warehouse'} />
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="mt-4 text-sm text-fg-muted">Cargando el modelo 3D…</p>
      </div>
    </div>
  )
}

const LIGHTING_MODES = [
  { id: 'day', label: 'Día', icon: '☀️' },
  { id: 'sunset', label: 'Atardecer', icon: '🌅' },
  { id: 'night', label: 'Noche', icon: '🌙' },
] as const

export function GLBViewer({
  url,
  enableDayNight = true,
  initialLighting = 'day',
}: GLBViewerProps) {
  const [lighting, setLighting] = useState<'day' | 'sunset' | 'night'>(initialLighting)

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 2, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <GLBModel url={url} lighting={lighting} />
          <OrbitControls
            autoRotate={false}
            autoRotateSpeed={4}
            enableZoom={true}
            enablePan={true}
          />
          <ambientLight intensity={lighting === 'night' ? 0.3 : 0.8} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={lighting === 'night' ? 0.5 : 1.5}
            castShadow
          />
        </Canvas>
      </Suspense>

      {enableDayNight && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-bg/80 p-1 backdrop-blur">
          {LIGHTING_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setLighting(mode.id)}
              aria-pressed={lighting === mode.id}
              className={
                lighting === mode.id
                  ? 'rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-fg'
                  : 'rounded-full px-3.5 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg'
              }
            >
              <span className="mr-1" aria-hidden>{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      )}

      <p className="pointer-events-none absolute right-4 top-4 rounded-full border border-border bg-bg/70 px-3 py-1.5 text-[11px] text-fg-muted backdrop-blur">
        Arrastrá para girar · Scroll para acercar
      </p>
    </div>
  )
}
