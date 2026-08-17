import { db } from '@/server/db/client'
import { projects, leads } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  request: Request,
  { params }: { params: { projectSlug: string } }
) {
  try {
    // Find project by slug
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, params.projectSlug),
      columns: {
        id: true,
        tenantId: true,
      },
    })

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, email, phone } = body

    if (!name || !email) {
      return Response.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Create lead
    const [lead] = await db
      .insert(leads)
      .values({
        tenantId: project.tenantId,
        projectId: project.id,
        name,
        email,
        phone: phone || undefined,
        source: 'website', // Could be website, broker, campaign, etc.
        status: 'new',
      })
      .returning()

    return Response.json({
      success: true,
      leadId: lead.id,
      message: 'Lead captured successfully',
    })
  } catch (error) {
    console.error('Error capturing lead:', error)
    return Response.json(
      { error: 'Failed to capture lead' },
      { status: 500 }
    )
  }
}
