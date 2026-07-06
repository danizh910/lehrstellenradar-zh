import { NextRequest, NextResponse } from 'next/server'
import { runAllScrapers } from '@/lib/scrapers'
import { notifyTelegram } from '@/lib/notifications/telegram'
import { notifyEmail, notifyFavoriteEmail } from '@/lib/notifications/email'
import { notifyWebPush } from '@/lib/notifications/webpush'
import { db } from '@/lib/db'
import { scrapeRuns, notifiedJobs, jobs as jobsTable } from '@/lib/db/schema'
import { getSettings } from '@/lib/settings'
import { eq, inArray } from 'drizzle-orm'

export const maxDuration = 300 // 5 min Vercel timeout

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let runId: string | null = null
  try {
    const runRecord = await db.insert(scrapeRuns).values({
      triggeredBy: req.headers.get('x-vercel-cron') ? 'vercel-cron' : 'github-actions',
    }).returning()
    runId = runRecord[0].id

    const { newJobsCount, sources, newJobs, totalScanned } = await runAllScrapers()
    const settings = await getSettings()

    // Mark jobs as notified and send notifications
    if (newJobs.length > 0) {
      const jobsWithDistance = newJobs as (typeof newJobs[0] & { distanceKm?: number | null })[]

      // Look up DB ids for new jobs
      const externalIds = newJobs.map(j => j.externalId)
      const dbJobs = await db.select({ id: jobsTable.id, externalId: jobsTable.externalId })
        .from(jobsTable)
        .where(inArray(jobsTable.externalId, externalIds))

      // Record notifications
      for (const job of dbJobs) {
        await db.insert(notifiedJobs).values([
          { jobId: job.id, channel: 'telegram' },
          { jobId: job.id, channel: 'push' },
        ]).onConflictDoNothing()
      }

      if (settings.telegramEnabled) await notifyTelegram(jobsWithDistance)
      if (settings.pushEnabled) await notifyWebPush(newJobsCount, newJobs.map(j => j.company))
      if (settings.emailEnabled) await notifyEmail(jobsWithDistance)
      // Favoriten-Alarm läuft immer, unabhängig vom emailEnabled-Setting
      await notifyFavoriteEmail(jobsWithDistance)
    }

    await db.update(scrapeRuns)
      .set({ finishedAt: new Date(), newJobsCount: String(newJobsCount), sources: JSON.stringify(sources) })
      .where(eq(scrapeRuns.id, runId!))

    console.log(JSON.stringify({ event: 'cron_complete', runId, newJobsCount, totalScanned }))
    return NextResponse.json({ success: true, newJobs: newJobsCount, totalScanned, sources })
  } catch (err) {
    if (runId) {
      await db.update(scrapeRuns)
        .set({ finishedAt: new Date(), sources: JSON.stringify([{ error: String(err) }]) })
        .where(eq(scrapeRuns.id, runId))
    }
    console.error(err)
    return NextResponse.json({ error: 'Scrape failed', detail: String(err) }, { status: 500 })
  }
}
