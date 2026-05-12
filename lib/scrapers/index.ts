import { RawJob, ScraperResult } from './types'
import { scrapeYousty } from './yousty'
import { scrapeGateway } from './gateway'
import { scrapeLehrio } from './lehrio'
import { scrapeBaam } from './baam'
import { scrapeLehrstart } from './lehrstart'
import { scrapeAllCompanies } from './companies/index'
import { isWithinRadius, distanceFromLocation } from '@/lib/geo'
import { matchesJobKeywords } from '@/lib/filters'
import { db } from '@/lib/db'
import { jobs, scrapeRuns } from '@/lib/db/schema'

export interface ProgressEvent {
  type: 'start' | 'done'
  source: string
  count?: number
}

interface OrchestratorResult {
  totalScanned: number
  newJobsCount: number
  sources: ScraperResult[]
  newJobs: RawJob[]
}

const PORTAL_SCRAPERS: Array<{ name: string; fn: () => Promise<RawJob[]> }> = [
  { name: 'yousty', fn: scrapeYousty },
  { name: 'gateway', fn: scrapeGateway },
  { name: 'lehrio', fn: scrapeLehrio },
  { name: 'baam', fn: scrapeBaam },
  { name: 'lehrstart', fn: scrapeLehrstart },
]

export async function runAllScrapers(
  onProgress?: (event: ProgressEvent) => void
): Promise<OrchestratorResult> {
  const allRaw: RawJob[] = []
  const results: ScraperResult[] = []

  // Record run start
  await db.insert(scrapeRuns).values({ startedAt: new Date() }).catch(() => {})

  // Run all portal scrapers in parallel — massive speed improvement vs sequential
  const portalSettled = await Promise.allSettled(
    PORTAL_SCRAPERS.map(async ({ name, fn }) => {
      onProgress?.({ type: 'start', source: name })
      const start = Date.now()
      const errors: string[] = []
      let scraped: RawJob[] = []
      try {
        scraped = await fn()
        console.log(JSON.stringify({ source: name, event: 'scraped', count: scraped.length }))
      } catch (err) {
        errors.push(String(err))
        console.log(JSON.stringify({ source: name, event: 'error', error: String(err) }))
      }
      const result: ScraperResult = { source: name, jobsFound: scraped.length, jobsSaved: 0, errors, durationMs: Date.now() - start }
      onProgress?.({ type: 'done', source: name, count: scraped.length })
      return { scraped, result }
    })
  )

  for (const r of portalSettled) {
    if (r.status === 'fulfilled') {
      allRaw.push(...r.value.scraped)
      results.push(r.value.result)
    }
  }

  // Company scrapers (already run in parallel internally)
  onProgress?.({ type: 'start', source: 'firmen' })
  const { jobs: companyJobs, results: companyResults } = await scrapeAllCompanies()
  allRaw.push(...companyJobs)
  results.push(...companyResults)
  onProgress?.({ type: 'done', source: 'firmen', count: companyJobs.length })

  // Filter by keywords and geo
  const filtered = allRaw.filter(job =>
    matchesJobKeywords(job.title) && isWithinRadius(job.location)
  ).map(job => ({
    ...job,
    distanceKm: distanceFromLocation(job.location),
  }))

  // Deduplicate by externalId
  const unique = Array.from(new Map(filtered.map(j => [j.externalId, j])).values())

  // Save to DB
  const newJobs: RawJob[] = []
  for (const job of unique) {
    try {
      const result = await db.insert(jobs).values({
        source: job.source,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        distanceKm: job.distanceKm ?? null,
        applyUrl: job.applyUrl,
        description: job.description ?? null,
        startDate: job.startDate ?? null,
        publishedAt: job.publishedAt ?? null,
      }).onConflictDoNothing().returning()

      if (result.length > 0) {
        newJobs.push(job)
        const res = results.find(r => r.source === job.source)
        if (res) res.jobsSaved++
      }
    } catch (err) {
      console.log(JSON.stringify({ event: 'db_error', job: job.externalId, error: String(err) }))
    }
  }

  return { totalScanned: allRaw.length, newJobsCount: newJobs.length, sources: results, newJobs }
}
