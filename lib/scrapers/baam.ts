import * as cheerio from 'cheerio'
import { RawJob } from './types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId } from '@/lib/utils'

const SOURCE = 'jobagent'
const BASE = 'https://www.jobagent.ch'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'

const URLS = [
  `${BASE}/stellenangebote/--/regionId=1/skillId=82`,
  `${BASE}/stellenangebote/--/regionId=1/skillId=315`,
]

export async function scrapeBaam(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  for (const url of URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)

      $('[class*="job"], [class*="stelle"], [class*="listing"], [class*="offer"], article').each((_, el) => {
        const $el = $(el)
        const title = $el.find('h2, h3, h4, [class*="title"]').first().text().trim()
        if (!title || !matchesJobKeywords(title)) return
        const company = $el.find('[class*="company"], [class*="firma"]').first().text().trim() || 'Unbekannt'
        const location = $el.find('[class*="location"], [class*="ort"]').first().text().trim() || 'Zürich'
        const href = $el.find('a').first().attr('href') || ''
        const applyUrl = href.startsWith('http') ? href : `${BASE}${href}`
        const externalId = generateExternalId(SOURCE, company, title, applyUrl)
        if (!seen.has(externalId)) {
          seen.add(externalId)
          jobs.push({ source: SOURCE, externalId, title, company, location, applyUrl })
        }
      })
    } catch (err) {
      console.log(JSON.stringify({ source: SOURCE, event: 'error', url, error: String(err) }))
    }
  }

  return jobs
}
