import { pgTable, uuid, text, boolean, timestamp, doublePrecision, unique, integer } from 'drizzle-orm/pg-core'

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull(),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  location: text('location'),
  distanceKm: doublePrecision('distance_km'),
  applyUrl: text('apply_url').notNull(),
  description: text('description'),
  startDate: text('start_date'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  foundAt: timestamp('found_at', { withTimezone: true }).defaultNow(),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  uniqueSourceExternal: unique().on(table.source, table.externalId),
}))

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const notifiedJobs = pgTable('notified_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id),
  channel: text('channel').notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueJobChannel: unique().on(table.jobId, table.channel),
}))

export const scrapeRuns = pgTable('scrape_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  triggeredBy: text('triggered_by').notNull().default('cron'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  newJobsCount: text('new_jobs_count').default('0'),
  sources: text('sources'),
})

// Single-row settings table (id=1 always)
export const appSettings = pgTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  telegramEnabled: boolean('telegram_enabled').notNull().default(false),
  emailEnabled: boolean('email_enabled').notNull().default(false),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
