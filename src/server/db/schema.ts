import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  decimal,
  jsonb,
  varchar,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============ Tenancy & Auth ============

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    customDomain: text('custom_domain'),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('tenants_slug_idx').on(table.slug),
  })
)

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Stable identifier used in code and URLs: solo | lite | pro */
  slug: varchar('slug', { length: 30 }).notNull().unique(),
  name: varchar('name', { length: 50 }).notNull(),
  unitLimit: integer('unit_limit').notNull(),
  projectLimit: integer('project_limit').notNull().default(1),
  /** Monthly price. Mercado Pago charges Argentine cards, so this is ARS. */
  priceMonthly: decimal('price_monthly', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
  /** preapproval_plan id returned by Mercado Pago. */
  mpPreapprovalPlanId: text('mp_preapproval_plan_id'),
  featuresJson: jsonb('features_json').default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => plans.id),
    /** preapproval id from Mercado Pago (one per subscribed tenant). */
    mpPreapprovalId: text('mp_preapproval_id').unique(),
    /** pending | authorized | paused | cancelled — mirrors MP's own states. */
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    currentPeriodEnd: timestamp('current_period_end'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('subscriptions_tenant_id_idx').on(table.tenantId),
  })
)

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    /** Supabase auth.users.id for this account. */
    authUserId: text('auth_user_id').notNull().unique(),
    globalRole: varchar('global_role', { length: 50 }), // super_admin or null
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  })
)

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(), // tenant_admin, editor, broker
    brokerCode: text('broker_code'), // unique code for broker tracking
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userTenantIdx: uniqueIndex('memberships_user_tenant_idx').on(
      table.userId,
      table.tenantId
    ),
    tenantIdIdx: index('memberships_tenant_id_idx').on(table.tenantId),
  })
)

// ============ Projects & Units ============

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    address: text('address'),
    geo: jsonb('geo'), // { lat, lng }
    status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, published
    amenitiesJson: jsonb('amenities_json').default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('projects_tenant_id_idx').on(table.tenantId),
    // Globally unique: the public storefront resolves /[projectSlug] by
    // slug alone, with no tenant in the URL — two tenants sharing a slug
    // would make one project's page render the other's data.
    slugIdx: uniqueIndex('projects_slug_idx').on(table.slug),
  })
)

export const buildings = pgTable(
  'buildings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    floorsCount: integer('floors_count'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('buildings_project_id_idx').on(table.projectId),
  })
)

export const units = pgTable(
  'units',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    buildingId: uuid('building_id').references(() => buildings.id, {
      onDelete: 'set null',
    }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: text('code').notNull(), // e.g., "101", "A-202"
    floor: integer('floor'),
    m2: decimal('m2', { precision: 10, scale: 2 }),
    price: decimal('price', { precision: 15, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('USD'),
    orientation: text('orientation'), // north, south, etc.
    bedrooms: integer('bedrooms'),
    status: varchar('status', { length: 50 }).notNull().default('available'),
    attrsJson: jsonb('attrs_json').default({}), // dynamic filters: parking, storage, etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('units_project_id_idx').on(table.projectId),
    tenantIdIdx: index('units_tenant_id_idx').on(table.tenantId),
  })
)

// ============ Tours & Assets ============

export const tours = pgTable(
  'tours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'set null' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 50 }).notNull(), // 360, glb-model, drone-video, image
    storageKey: text('storage_key').notNull(), // R2 object key
    cdnUrl: text('cdn_url'),
    status: varchar('status', { length: 50 }).notNull().default('processing'),
    metadataJson: jsonb('metadata_json').default({}), // { floor, camera_points, etc. }
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('tours_project_id_idx').on(table.projectId),
    tenantIdIdx: index('tours_tenant_id_idx').on(table.tenantId),
  })
)

export const finishOptions = pgTable(
  'finish_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    category: text('category').notNull(), // e.g., "flooring", "paint"
    name: text('name').notNull(),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('finish_options_project_id_idx').on(table.projectId),
    tenantIdIdx: index('finish_options_tenant_id_idx').on(table.tenantId),
  })
)

// ============ CRM & Leads ============

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    brokerMemberId: uuid('broker_member_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    source: varchar('source', { length: 50 }), // organic, broker, campaign, etc.
    utmJson: jsonb('utm_json'), // { utm_source, utm_campaign, etc. }
    status: varchar('status', { length: 50 }).notNull().default('new'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('leads_tenant_id_idx').on(table.tenantId),
    projectIdIdx: index('leads_project_id_idx').on(table.projectId),
  })
)

export const leadActivities = pgTable(
  'lead_activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // email, call, note, etc.
    payloadJson: jsonb('payload_json'), // flexible: message, duration, etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    leadIdIdx: index('lead_activities_lead_id_idx').on(table.leadId),
  })
)

export const brokerLinks = pgTable(
  'broker_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    brokerMemberId: uuid('broker_member_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    trackingCode: text('tracking_code').notNull().unique(),
    url: text('url').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('broker_links_tenant_id_idx').on(table.tenantId),
    trackingCodeIdx: index('broker_links_tracking_code_idx').on(table.trackingCode),
  })
)

// ============ Analytics ============

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    sessionId: text('session_id').notNull(),
    brokerMemberId: uuid('broker_member_id').references(() => memberships.id, {
      onDelete: 'set null',
    }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    payloadJson: jsonb('payload_json'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('analytics_events_tenant_id_idx').on(table.tenantId),
    sessionIdIdx: index('analytics_events_session_id_idx').on(table.sessionId),
  })
)

// ============ Relations ============

export const tenantsRelations = relations(tenants, ({ many }) => ({
  projects: many(projects),
  subscriptions: many(subscriptions),
  memberships: many(memberships),
  leads: many(leads),
  tours: many(tours),
  units: many(units),
}))

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}))

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [memberships.tenantId],
    references: [tenants.id],
  }),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  units: many(units),
  tours: many(tours),
  buildings: many(buildings),
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  project: one(projects, {
    fields: [units.projectId],
    references: [projects.id],
  }),
  tenant: one(tenants, {
    fields: [units.tenantId],
    references: [tenants.id],
  }),
  tours: many(tours),
}))

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [leads.projectId],
    references: [projects.id],
  }),
  activities: many(leadActivities),
}))
