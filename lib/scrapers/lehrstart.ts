import * as cheerio from 'cheerio'
import { RawJob } from './types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId, sleep } from '@/lib/utils'

const SOURCE = 'lehrstart'
const BASE = 'https://www.lehrstart.ch'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'

const URLS = [
  `${BASE}/stellen?q=entwickler+digitales+business&kanton=ZH`,
  `${BASE}/stellen?q=informatiker&kanton=ZH`,
  `${BASE}/stellen?q=mediamatiker&kanton=ZH`,
]

export async function scrapeLehrstart(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  for (const url of URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)

      $('[class*="job"], [class*="stelle"], [class*="listing"], [class*="offer"], [class*="card"], article').each((_, el) => {
        const $el = $(el)
        const title = $el.find('h2, h3, h4, [class*="title"], [class*="job-title"], [class*="position"]').first().text().trim()
        if (!title || !matchesJobKeywords(title)) return
        const company = $el.find('[class*="company"], [class*="firma"], [class*="betrieb"], [class*="employer"]').first().text().trim() || 'Unbekannt'
        const location = $el.find('[class*="location"], [class*="ort"], [class*="kanton"], [class*="region"]').first().text().trim() || 'Zürich'
        const href = $el.find('a').first().attr('href') || ''
        const applyUrl = href.startsWith('http') ? href : `${BASE}${href}`
        const externalId = generateExternalId(SOURCE, company, title, applyUrl)
        if (!seen.has(externalId)) {
          seen.add(externalId)
          jobs.push({ source: SOURCE, externalId, title, company, location, applyUrl })
        }
      })

      // JSON-LD fallback
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).html() || '{}')
          const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data]
          for (const item of items) {
            if (item['@type'] !== 'JobPosting') continue
            const title = item.title || ''
            if (!matchesJobKeywords(title)) continue
            const company = item.hiringOrganization?.name || 'Unbekannt'
            const location = item.jobLocation?.address?.addressLocality || 'Zürich'
            const applyUrl = item.url || url
            const externalId = generateExternalId(SOURCE, company, title, applyUrl)
            if (!seen.has(externalId)) {
              seen.add(externalId)
              jobs.push({
                source: SOURCE, externalId, title, company, location, applyUrl,
                publishedAt: item.datePosted ? new Date(item.datePosted) : undefined,
              })
            }
          }
        } catch {}
      })
    } catch (err) {
      console.log(JSON.stringify({ source: SOURCE, event: 'error', url, error: String(err) }))
    }
    await sleep(2000)
  }

  return jobs
}
