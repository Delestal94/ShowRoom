'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TourKind = '360' | 'glb-model' | 'drone-video' | 'image'

interface UploadTourFormProps {
  tenantSlug: string
  projectId: string
  unitId?: string
  onSuccess?: () => void
}

const TOUR_TYPES: { value: TourKind; label: string; accept: string }[] = [
  { value: 'glb-model', label: '3D Model (GLB)', accept: '.glb,.gltf' },
  { value: '360', label: '360° Panorama', accept: 'image/jpeg,image/png' },
  { value: 'image', label: 'Photo', accept: 'image/jpeg,image/png,image/webp' },
  { value: 'drone-video', label: 'Drone Video', accept: 'video/mp4,video/webm' },
]

export function UploadTourForm({
  tenantSlug,
  projectId,
  unitId,
  onSuccess,
}: UploadTourFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [kind, setKind] = useState<TourKind>('glb-model')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState(0)

  const selectedType = TOUR_TYPES.find((t) => t.value === kind)!

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Basic validation
      const maxSize = kind === 'glb-model' ? 50 * 1024 * 1024 : 100 * 1024 * 1024 // 50MB for GLB, 100MB for others
      if (selectedFile.size > maxSize) {
        setError(`File too large (max ${maxSize / 1024 / 1024}MB)`)
        return
      }
      setError('')
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError('')
    setProgress(0)

    try {
      // For MVP: upload directly via FormData
      // In production, we'd use presigned R2 URLs
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', kind)
      if (unitId) formData.append('unitId', unitId)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      // Handle completion
      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          setFile(null)
          setProgress(0)

          // Refresh page to show new tour
          if (onSuccess) onSuccess()
          router.refresh()
        } else {
          setError('Upload failed. Please try again.')
        }
        setLoading(false)
      })

      xhr.addEventListener('error', () => {
        setError('Network error. Please try again.')
        setLoading(false)
      })

      xhr.open(
        'POST',
        `/api/dashboard/${tenantSlug}/projects/${projectId}/tours`
      )
      xhr.send(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Tour</h3>

      {/* Tour Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tour Type
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOUR_TYPES.map((type) => (
            <label
              key={type.value}
              className={`relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                kind === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tour-type"
                value={type.value}
                checked={kind === type.value}
                onChange={(e) => {
                  setKind(e.target.value as TourKind)
                  setFile(null)
                  setProgress(0)
                }}
                className="sr-only"
              />
              <span className="text-center w-full">
                <span className="block text-lg mb-1">
                  {getTourIcon(type.value)}
                </span>
                <span className="text-xs font-medium text-gray-900">
                  {type.label.split(' ')[0]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* File Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept={selectedType.accept}
            onChange={handleFileChange}
            disabled={loading}
            className="sr-only"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="block cursor-pointer"
          >
            <div className="text-2xl mb-2">📁</div>
            <p className="text-sm font-medium text-gray-900">
              {file ? file.name : 'Click to upload or drag file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max size: {kind === 'glb-model' ? '50' : '100'}MB
            </p>
          </label>
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!file || loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition disabled:cursor-not-allowed"
      >
        {loading ? `Uploading... ${progress}%` : 'Upload Tour'}
      </button>
    </form>
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
