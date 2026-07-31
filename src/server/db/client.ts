import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })

// Scoped DB client for tenant-specific queries
// This ensures tenant_id is always enforced at the app level
export async function getScopedDbClient(tenantId: string) {
  const client = await pool.connect()

  // Set the tenant_id for this connection
  // This is used by RLS policies in Postgres
  await client.query(`SET LOCAL app.tenant_id = $1`, [tenantId])

  return {
    query: client.query.bind(client),
    release: () => client.release(),
  }
}

// Export the schema for migrations
export * from './schema'
