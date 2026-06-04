import * as cheerio from 'cheerio'
import { RawJob } from './types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId } from '@/lib/utils'

const SOURCE = 'yousty'
const BASE = 'https://www.yousty.ch'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'

const URLS = [
  `${BASE}/de-CH/lehrstellen?q=entwickler+digitales+business&canton=ZH`,
  `${BASE}/de-CH/lehrstellen?q=informatiker&canton=ZH`,
  `${BASE}/de-CH/lehrstellen?q=mediamatiker&canton=ZH`,
]

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  return res.text()
}

export async function scrapeYousty(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  for (const url of URLS) {
    try {
      const html = await fetchPage(url)
      const $ = cheerio.load(html)

      // Yousty renders job cards — try multiple selectors
      const cards = $('[class*="job-card"], [class*="JobCard"], article[class*="job"], .search-result-item, [data-testid*="job"]')

      cards.each((_, el) => {
        const $el = $(el)
        const titleEl = $el.find('h2, h3, [class*="title"], [class*="job-title"]').first()
        const title = titleEl.text().trim()
        if (!title || !matchesJobKeywords(title)) return

        const company = $el.find('[class*="company"], [class*="employer"]').first().text().trim() || 'Unbekannt'
        const location = $el.find('[class*="location"], [class*="place"], [class*="ort"]').first().text().trim() || 'Zürich'
        const href = $el.find('a').first().attr('href') || ''
        const applyUrl = href.startsWith('http') ? href : `${BASE}${href}`

        const externalId = generateExternalId(SOURCE, company, title, applyUrl)
        if (seen.has(externalId)) return
        seen.add(externalId)

        jobs.push({ source: SOURCE, externalId, title, company, location, applyUrl })
      })

      // Fallback: parse JSON-LD if present
      if (jobs.length === 0) {
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const data = JSON.parse($(el).html() || '{}')
            const items = Array.isArray(data) ? data : data['@graph'] || [data]
            for (const item of items) {
              if (item['@type'] !== 'JobPosting') continue
              const title = item.title || ''
              if (!matchesJobKeywords(title)) continue
              const company = item.hiringOrganization?.name || 'Unbekannt'
              const location = item.jobLocation?.address?.addressLocality || 'Zürich'
              const applyUrl = item.url || item.sameAs || BASE
              const externalId = generateExternalId(SOURCE, company, title, applyUrl)
              if (!seen.has(externalId)) {
                seen.add(externalId)
                jobs.push({ source: SOURCE, externalId, title, company, location, applyUrl })
              }
            }
          } catch {}
        })
      }
    } catch (err) {
      console.log(JSON.stringify({ source: SOURCE, event: 'error', url, error: String(err) }))
    }
  }

  return jobs
}
