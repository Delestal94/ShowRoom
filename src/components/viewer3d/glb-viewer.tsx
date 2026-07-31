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
    <div className="flex items-center justify-center w-full h-full bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <p className="text-white mt-4">Loading 3D model...</p>
      </div>
    </div>
  )
}

export function GLBViewer({
  url,
  enableDayNight = true,
  initialLighting = 'day',
}: GLBViewerProps) {
  const [lighting, setLighting] = useState<'day' | 'sunset' | 'night'>(initialLighting)

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
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
        <div className="absolute bottom-4 left-4 flex gap-2 bg-black bg-opacity-50 rounded-lg p-3 z-10">
          <button
            onClick={() => setLighting('day')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              lighting === 'day'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Day mode"
          >
            ☀️ Day
          </button>
          <button
            onClick={() => setLighting('sunset')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              lighting === 'sunset'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Sunset mode"
          >
            🌅 Sunset
          </button>
          <button
            onClick={() => setLighting('night')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              lighting === 'night'
                ? 'bg-blue-900 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Night mode"
          >
            🌙 Night
          </button>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded z-10">
        <p>🖱️ Drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  )
}
