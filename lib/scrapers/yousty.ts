import * as cheerio from 'cheerio'
import { RawJob } from './types'
import { generateExternalId } from '@/lib/utils'

const SOURCE = 'yousty'
const BASE = 'https://www.yousty.ch'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Beruf-IDs via /de-CH/lehrstellen/apprenticeship_jobs/for_autocomplete?term=... ermittelt.
// Enthält jeweils die Spezialisierungen (z.B. Applikations-/Plattformentwicklung unter Informatiker).
const PROFESSION_IDS = [
  '1712-informatiker-in-efz',
  '1726-mediamatiker-in-efz',
  '34743-entwickler-in-digitales-business-efz',
]
const CANTON = 'ZH'
const MAX_PAGES = 10

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  return res.text()
}

function parseResults(html: string): RawJob[] {
  const $ = cheerio.load(html)
  const jobs: RawJob[] = []

  $('.result').each((_, el) => {
    const $el = $(el)
    const link = $el.find('.title_and_location > a').first()
    const title = link.find('h2.title').text().trim()
    if (!title) return

    const href = link.attr('href') || ''
    // Verbands-/Werbekarten ("Was macht man als...") zeigen auf /verbaende/, keine echte Lehrstelle
    if (!href.includes('/lehrstellen/profile/')) return

    const applyUrl = href.startsWith('http') ? href : `${BASE}${href}`

    const companyInfo = link.find('.company-info').first()
    const strongs = companyInfo.find('strong')
    const company = strongs.eq(0).text().trim() || 'Unbekannt'
    const location = strongs.eq(1).text().trim() || 'Zürich'

    const externalId = generateExternalId(SOURCE, company, title, applyUrl)
    jobs.push({ source: SOURCE, externalId, title, company, location, applyUrl })
  })

  return jobs
}

async function scrapeProfession(professionId: string): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}/de-CH/lehrstellen/${professionId}/${CANTON}${page > 1 ? `?page=${page}` : ''}`
    try {
      const html = await fetchPage(url)
      const pageJobs = parseResults(html)
      if (pageJobs.length === 0) break

      let newOnPage = 0
      for (const job of pageJobs) {
        if (seen.has(job.externalId)) continue
        seen.add(job.externalId)
        jobs.push(job)
        newOnPage++
      }
      // Weniger als 10 Resultate (oder keine neuen mehr) → letzte Seite erreicht
      if (pageJobs.length < 10 || newOnPage === 0) break
    } catch (err) {
      console.log(JSON.stringify({ source: SOURCE, event: 'error', url, error: String(err) }))
      break
    }
  }

  return jobs
}

export async function scrapeYousty(): Promise<RawJob[]> {
  const seen = new Set<string>()
  const jobs: RawJob[] = []

  for (const professionId of PROFESSION_IDS) {
    const found = await scrapeProfession(professionId)
    for (const job of found) {
      if (seen.has(job.externalId)) continue
      seen.add(job.externalId)
      jobs.push(job)
    }
  }

  return jobs
}
