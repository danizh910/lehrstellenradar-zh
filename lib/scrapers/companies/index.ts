import { RawJob, ScraperResult } from '../types'
import { scrapeUbs } from './ubs'
import { scrapeZkb } from './zkb'
import { scrapeSwisscom } from './swisscom'
import { scrapeSwissRe } from './swissre'
import { scrapeZurichInsurance } from './zurichinsurance'
import { scrapeHelvetia } from './helvetia'
import { scrapeSix } from './six'
import { scrapeMobiliar } from './mobiliar'
import { sleep } from '@/lib/utils'

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
  const allJobs: RawJob[] = []
  const results: ScraperResult[] = []

  for (const { name, fn } of COMPANY_SCRAPERS) {
    const start = Date.now()
    const errors: string[] = []
    let jobs: RawJob[] = []
    try {
      jobs = await fn()
      allJobs.push(...jobs)
    } catch (err) {
      errors.push(String(err))
    }
    results.push({ source: name, jobsFound: jobs.length, jobsSaved: 0, errors, durationMs: Date.now() - start })
    await sleep(2000)
  }

  return { jobs: allJobs, results }
}
