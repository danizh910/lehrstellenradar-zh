import { db } from '@/lib/db'
import { appSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface AppSettings {
  telegramEnabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
}

const DEFAULTS: AppSettings = {
  telegramEnabled: false,
  emailEnabled: false,
  pushEnabled: true,
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const rows = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1)
    if (rows.length === 0) return DEFAULTS
    return {
      telegramEnabled: rows[0].telegramEnabled,
      emailEnabled: rows[0].emailEnabled,
      pushEnabled: rows[0].pushEnabled,
    }
  } catch {
    return DEFAULTS
  }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const next = { ...current, ...patch }

  await db.insert(appSettings)
    .values({ id: 1, ...next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { ...next, updatedAt: new Date() },
    })

  return next
}
