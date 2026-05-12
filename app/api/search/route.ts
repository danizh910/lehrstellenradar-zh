import { NextRequest, NextResponse } from 'next/server'
import { runAllScrapers } from '@/lib/scrapers'
import { db } from '@/lib/db'
import { scrapeRuns } from '@/lib/db/schema'
import { desc, gte } from 'drizzle-orm'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  // Rate limit: max 1 manual run per 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const recent = await db
    .select({ startedAt: scrapeRuns.startedAt })
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(1)

  if (recent[0] && recent[0].startedAt && recent[0].startedAt > tenMinutesAgo) {
    const waitMs = tenMinutesAgo.getTime() - recent[0].startedAt.getTime() + 10 * 60 * 1000
    return NextResponse.json(
      { error: 'Rate limited', retryAfterMs: waitMs },
      { status: 429 }
    )
  }

  try {
    const { newJobsCount, sources, totalScanned } = await runAllScrapers()
    return NextResponse.json({ newJobs: newJobsCount, totalScanned, sources })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
