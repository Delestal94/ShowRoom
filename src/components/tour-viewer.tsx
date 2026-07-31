'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { GLBViewer } from './viewer3d/glb-viewer'
import { PanoramaViewer } from './viewer360/panorama-viewer'

interface Tour {
  id: string
  kind: '360' | 'glb-model' | 'drone-video' | 'image'
  cdnUrl?: string
  storageKey: string
  metadataJson?: Record<string, any>
}

interface TourViewerProps {
  tours: Tour[]
  selectedTourId?: string
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-gray-900 rounded-lg">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <p className="text-white mt-4">Loading viewer...</p>
      </div>
    </div>
  )
}

export function TourViewer({ tours, selectedTourId }: TourViewerProps) {
  const [currentTourId, setCurrentTourId] = useState(selectedTourId || tours[0]?.id)
  const currentTour = tours.find((t) => t.id === currentTourId)

  if (!currentTour || !currentTour.cdnUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg border-2 border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 font-medium">No tour available</p>
          <p className="text-sm text-gray-500">Please upload a tour to view it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Viewer */}
      <div className="flex-1 mb-4">
        <Suspense fallback={<LoadingFallback />}>
          {currentTour.kind === 'glb-model' && (
            <GLBViewer url={currentTour.cdnUrl} enableDayNight={true} initialLighting="day" />
          )}
          {currentTour.kind === '360' && (
            <PanoramaViewer imageUrl={currentTour.cdnUrl} title="360° Tour" />
          )}
          {currentTour.kind === 'image' && (
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-200">
              <Image
                src={currentTour.cdnUrl}
                alt="Tour"
                fill
                className="object-cover"
              />
            </div>
          )}
          {currentTour.kind === 'drone-video' && (
            <div className="w-full h-full rounded-lg overflow-hidden bg-black">
              <video
                src={currentTour.cdnUrl}
                controls
                className="w-full h-full"
              />
            </div>
          )}
        </Suspense>
      </div>

      {/* Tour Selector */}
      {tours.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {tours.map((tour) => (
            <button
              key={tour.id}
              onClick={() => setCurrentTourId(tour.id)}
              className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                currentTourId === tour.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              } ${!tour.cdnUrl ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={!tour.cdnUrl}
              title={tour.cdnUrl ? '' : 'Tour not ready'}
            >
              <span className="mr-2">{getTourIcon(tour.kind)}</span>
              {getTourLabel(tour.kind)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getTourIcon(kind: string) {
  switch (kind) {
    case '360':
      return '🔄'
    case 'glb-model':
      return '🏢'
    case 'drone-video':
      return '🚁'
    case 'image':
      return '📷'
    default:
      return '📸'
  }
}

function getTourLabel(kind: string) {
  switch (kind) {
    case '360':
      return '360°'
    case 'glb-model':
      return '3D'
    case 'drone-video':
      return 'Drone'
    case 'image':
      return 'Photo'
    default:
      return 'Tour'
  }
}
