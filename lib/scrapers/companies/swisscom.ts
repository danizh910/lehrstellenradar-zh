import * as cheerio from 'cheerio'
import { RawJob } from '../types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId } from '@/lib/utils'

const SOURCE = 'swisscom'
const COMPANY = 'Swisscom'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'
const URL = 'https://www.swisscom.ch/de/about/jobs/lernende.html'

export async function scrapeSwisscom(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    const res = await fetch(URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)

    $('[class*="job"], [class*="stelle"], [class*="lern"], [class*="card"]').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h2, h3, h4, strong, [class*="title"]').first().text().trim()
      if (!title || !matchesJobKeywords(title)) return
      const href = $el.find('a').first().attr('href') || URL
      const applyUrl = href.startsWith('http') ? href : `https://www.swisscom.ch${href}`
      const externalId = generateExternalId(SOURCE, COMPANY, title, applyUrl)
      jobs.push({ source: SOURCE, company: COMPANY, title, location: '8050 Zürich', applyUrl, externalId })
    })

    if (jobs.length === 0) {
      $('a[href*="lernende"], a[href*="apprentice"], a[href*="job"]').each((_, el) => {
        const text = $(el).text().trim()
        if (!matchesJobKeywords(text)) return
        const href = $(el).attr('href') || URL
        const applyUrl = href.startsWith('http') ? href : `https://www.swisscom.ch${href}`
        jobs.push({
          source: SOURCE, company: COMPANY, title: text, location: '8050 Zürich',
          applyUrl, externalId: generateExternalId(SOURCE, COMPANY, text, applyUrl),
        })
      })
    }
  } catch (err) {
    console.log(JSON.stringify({ source: SOURCE, event: 'error', error: String(err) }))
  }
  return jobs
}
