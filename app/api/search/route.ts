import { NextRequest } from 'next/server'
import { runAllScrapers } from '@/lib/scrapers'
import { db } from '@/lib/db'
import { scrapeRuns } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Rate limit: max 1 manual run per 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const recent = await db
    .select({ startedAt: scrapeRuns.startedAt })
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(1)

  if (recent[0]?.startedAt && recent[0].startedAt > tenMinutesAgo) {
    const waitMs = recent[0].startedAt.getTime() + 10 * 60 * 1000 - Date.now()
    return new Response(
      `data: ${JSON.stringify({ type: 'rate-limited', retryAfterMs: waitMs })}\n\n`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      try {
        const { newJobsCount, totalScanned, sources } = await runAllScrapers((event) => {
          send(event)
        })
        send({ type: 'result', newJobs: newJobsCount, totalScanned, sources })
      } catch (err) {
        send({ type: 'error', message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
