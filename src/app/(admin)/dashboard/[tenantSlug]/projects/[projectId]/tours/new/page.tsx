import { headers } from 'next/headers'
import { getTenantFromSlug } from '@/modules/tenancy/tenant-context'
import { getProject } from '@/modules/projects/project-service'
import { UploadTourForm } from '@/components/upload-tour-form'
import Link from 'next/link'

export default async function UploadTourPage({
  params,
}: {
  params: { tenantSlug: string; projectId: string }
}) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (tenantSlug !== params.tenantSlug) {
    return <div>Invalid tenant</div>
  }

  const tenant = await getTenantFromSlug(params.tenantSlug)
  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const project = await getProject(tenant.id, params.projectId)
  if (!project) {
    return <div>Project not found</div>
  }

  return (
    <div>
      <Link
        href={`/dashboard/${params.tenantSlug}/projects/${params.projectId}`}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
      >
        ← Back to Project
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Tour</h1>
        <p className="text-gray-600 mt-2">
          Add 3D models, 360° panoramas, videos, or photos to{' '}
          <span className="font-semibold">{project.name}</span>
        </p>
      </div>

      <div className="max-w-2xl">
        <UploadTourForm
          tenantSlug={params.tenantSlug}
          projectId={params.projectId}
          onSuccess={() => {
            // Will auto-refresh via router.refresh()
          }}
        />

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Supported Formats</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium">🏢 3D Models (GLB)</p>
              <p className="text-gray-600">
                Compressed 3D models exported from Blender, 3ds Max, etc. Max 50MB.
              </p>
            </div>
            <div>
              <p className="font-medium">🔄 360° Panorama</p>
              <p className="text-gray-600">
                Equirectangular projection images (JPEG/PNG). Max 100MB.
              </p>
            </div>
            <div>
              <p className="font-medium">📷 Photos</p>
              <p className="text-gray-600">
                Standard photos and renderings (JPEG/PNG/WebP). Max 100MB.
              </p>
            </div>
            <div>
              <p className="font-medium">🚁 Drone Videos</p>
              <p className="text-gray-600">
                MP4 or WebM videos. Max 100MB.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Tips for Best Results</h3>
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>Optimize 3D models with Draco compression before upload</li>
            <li>Use equirectangular projection for 360° panoramas</li>
            <li>Compress photos to under 5MB for faster loading</li>
            <li>Test uploads on mobile before sharing with buyers</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
