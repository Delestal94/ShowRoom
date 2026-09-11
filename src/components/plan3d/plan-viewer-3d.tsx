'use client'

import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { buildSlab, buildWallPieces, type PlanModel } from './plan-model'

export function PlanViewer3D({ model }: { model: PlanModel }) {
  const pieces = useMemo(() => buildWallPieces(model), [model])
  const slab = useMemo(() => buildSlab(model), [model])

  const radius = useMemo(() => {
    if (!slab) return 10
    return Math.max(6, Math.hypot(slab.size[0], slab.size[2]) * 0.8)
  }, [slab])

  if (pieces.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 p-8 text-center">
        <div>
          <p className="text-sm font-medium text-fg">Todavía no hay nada que extruir</p>
          <p className="mt-1 text-sm text-fg-muted">
            Calibrá la escala y trazá al menos un muro para ver el volumen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-border bg-surface-2">
      <Canvas
        camera={{ position: [radius, radius * 0.8, radius], fov: 45 }}
        gl={{ antialias: true }}
        shadows
      >
        <color attach="background" args={['#12131a']} />
        <hemisphereLight intensity={0.6} groundColor="#22242e" />
        <directionalLight
          position={[radius, radius * 1.5, radius * 0.6]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        {slab && (
          <mesh position={slab.position} receiveShadow>
            <boxGeometry args={slab.size} />
            <meshStandardMaterial color="#2a2d38" roughness={0.95} />
          </mesh>
        )}

        {pieces.map((piece) => (
          <mesh
            key={piece.key}
            position={piece.position}
            rotation={[0, piece.rotationY, 0]}
            castShadow={!piece.glass}
            receiveShadow={!piece.glass}
          >
            <boxGeometry args={piece.size} />
            {piece.glass ? (
              <meshStandardMaterial
                color="#8fd4e8"
                transparent
                opacity={0.35}
                roughness={0.1}
                metalness={0.1}
              />
            ) : (
              <meshStandardMaterial color="#d8d4cc" roughness={0.8} />
            )}
          </mesh>
        ))}

        <Grid
          args={[radius * 4, radius * 4]}
          cellSize={1}
          sectionSize={5}
          cellColor="#2e3140"
          sectionColor="#3d4154"
          fadeDistance={radius * 3}
          position={[0, -0.13, 0]}
          infiniteGrid
        />

        <OrbitControls makeDefault enablePan enableZoom maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
    </div>
  )
}
