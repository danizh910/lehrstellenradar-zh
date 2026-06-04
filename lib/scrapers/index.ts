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
import { jobs } from '@/lib/db/schema'

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
  { name: 'lernende', fn: scrapeGateway },
  { name: 'stellen', fn: scrapeLehrio },
  { name: 'jobagent', fn: scrapeBaam },
  { name: 'lehrstart', fn: scrapeLehrstart },
]

// Wraps a scraper with a hard timeout so one slow site can't block everything
async function withTimeout<T>(fn: () => Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

export async function runAllScrapers(
  onProgress?: (event: ProgressEvent) => void
): Promise<OrchestratorResult> {
  const allRaw: RawJob[] = []
  const results: ScraperResult[] = []

  // 40s hard cap per scraper — all run in parallel so total wall time = slowest scraper
  const portalSettled = await Promise.allSettled(
    PORTAL_SCRAPERS.map(async ({ name, fn }) => {
      onProgress?.({ type: 'start', source: name })
      const start = Date.now()
      const errors: string[] = []
      let scraped: RawJob[] = []
      try {
        scraped = await withTimeout(fn, 40_000, [])
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

  // Company scrapers (run in parallel internally)
  onProgress?.({ type: 'start', source: 'firmen' })
  const { jobs: companyJobs, results: companyResults } = await withTimeout(
    scrapeAllCompanies,
    40_000,
    { jobs: [], results: [] }
  )
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

  // Batch insert — much faster than one-by-one, onConflictDoNothing skips duplicates
  const newJobs: RawJob[] = []
  if (unique.length > 0) {
    const BATCH = 50
    for (let i = 0; i < unique.length; i += BATCH) {
      const chunk = unique.slice(i, i + BATCH)
      try {
        const inserted = await db.insert(jobs).values(
          chunk.map(job => ({
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
          }))
        ).onConflictDoNothing().returning()

        for (const row of inserted) {
          const job = chunk.find(j => j.externalId === row.externalId)
          if (job) {
            newJobs.push(job)
            const res = results.find(r => r.source === job.source)
            if (res) res.jobsSaved++
          }
        }
      } catch (err) {
        console.log(JSON.stringify({ event: 'db_batch_error', offset: i, error: String(err) }))
        // Fallback: try individually so one bad row doesn't block the whole chunk
        for (const job of chunk) {
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
          } catch (e) {
            console.log(JSON.stringify({ event: 'db_error', job: job.externalId, error: String(e) }))
          }
        }
      }
    }
  }

  return { totalScanned: allRaw.length, newJobsCount: newJobs.length, sources: results, newJobs }
}
