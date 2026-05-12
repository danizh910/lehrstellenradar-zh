import * as cheerio from 'cheerio'
import { RawJob } from './types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId, sleep } from '@/lib/utils'

const SOURCE = 'gateway'
const BASE = 'https://junior.gateway.one'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'

const PATHS = [
  '/de/lehrstellen?beruf=informatiker&kanton=ZH',
  '/de/lehrstellen?beruf=mediamatiker&kanton=ZH',
]

export async function scrapeGateway(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  const seen = new Set<string>()

  for (const path of PATHS) {
    const url = `${BASE}${path}`
    try {
      // Try JSON API first
      const apiUrl = `${BASE}/api/v1/jobs?beruf=${path.includes('informatiker') ? 'informatiker' : 'mediamatiker'}&kanton=ZH`
      try {
        const res = await fetch(apiUrl, {
          headers: { 'User-Agent': UA, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(15000),
        })
        if (res.ok) {
          const data = await res.json() as { jobs?: Array<{ title?: string; company?: string; location?: string; url?: string; description?: string; startDate?: string }> }
          const list = data.jobs || (Array.isArray(data) ? data : [])
          for (const item of list) {
            const title = item.title || ''
            if (!matchesJobKeywords(title)) continue
            const company = item.company || 'Unbekannt'
            const location = item.location || 'Zürich'
            const applyUrl = item.url || url
            const externalId = generateExternalId(SOURCE, company, title, applyUrl)
            if (!seen.has(externalId)) {
              seen.add(externalId)
              jobs.push({ source: SOURCE, externalId, title, company, location, applyUrl, description: item.description, startDate: item.startDate })
            }
          }
          if (jobs.length > 0) { await sleep(2000); continue }
        }
      } catch {}

      // HTML fallback
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)

      $('[class*="job"], [class*="stelle"], article, .card').each((_, el) => {
        const $el = $(el)
        const title = $el.find('h2, h3, [class*="title"]').first().text().trim()
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
    await sleep(2000)
  }

  return jobs
}
