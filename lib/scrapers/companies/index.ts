import { RawJob, ScraperResult } from '../types'
import { scrapeUbs } from './ubs'
import { scrapeZkb } from './zkb'
import { scrapeSwisscom } from './swisscom'
import { scrapeSwissRe } from './swissre'
import { scrapeZurichInsurance } from './zurichinsurance'
import { scrapeHelvetia } from './helvetia'
import { scrapeSix } from './six'
import { scrapeMobiliar } from './mobiliar'
const COMPANY_SCRAPERS: Array<{ name: string; fn: () => Promise<RawJob[]> }> = [
  { name: 'ubs', fn: scrapeUbs },
  { name: 'zkb', fn: scrapeZkb },
  { name: 'swisscom', fn: scrapeSwisscom },
  { name: 'swissre', fn: scrapeSwissRe },
  { name: 'zurichinsurance', fn: scrapeZurichInsurance },
  { name: 'helvetia', fn: scrapeHelvetia },
  { name: 'six', fn: scrapeSix },
  { name: 'mobiliar', fn: scrapeMobiliar },
]

export async function scrapeAllCompanies(): Promise<{ jobs: RawJob[]; results: ScraperResult[] }> {
  const settled = await Promise.allSettled(
    COMPANY_SCRAPERS.map(async ({ name, fn }) => {
      const start = Date.now()
      const errors: string[] = []
      let scraped: RawJob[] = []
      try {
        scraped = await fn()
      } catch (err) {
        errors.push(String(err))
      }
      return { source: name, scraped, result: { source: name, jobsFound: scraped.length, jobsSaved: 0, errors, durationMs: Date.now() - start } }
    })
  )

  const allJobs: RawJob[] = []
  const results: ScraperResult[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') {
      allJobs.push(...r.value.scraped)
      results.push(r.value.result)
    }
  }
  return { jobs: allJobs, results }
}
