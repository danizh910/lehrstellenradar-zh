import * as cheerio from 'cheerio'
import { RawJob } from '../types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId } from '@/lib/utils'

const SOURCE = 'mobiliar'
const COMPANY = 'Mobiliar'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'
const URL = 'https://www.mobiliar.ch/die-mobiliar/karriere/lernende'

export async function scrapeMobiliar(): Promise<RawJob[]> {
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
      const applyUrl = href.startsWith('http') ? href : `https://www.mobiliar.ch${href}`
      const externalId = generateExternalId(SOURCE, COMPANY, title, applyUrl)
      jobs.push({ source: SOURCE, company: COMPANY, title, location: '3001 Bern / Zürich', applyUrl, externalId })
    })

    if (jobs.length === 0) {
      $('a').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length < 10 || !matchesJobKeywords(text)) return
        const href = $(el).attr('href') || URL
        const applyUrl = href.startsWith('http') ? href : `https://www.mobiliar.ch${href}`
        jobs.push({
          source: SOURCE, company: COMPANY, title: text, location: '8001 Zürich',
          applyUrl, externalId: generateExternalId(SOURCE, COMPANY, text, applyUrl),
        })
      })
    }
  } catch (err) {
    console.log(JSON.stringify({ source: SOURCE, event: 'error', error: String(err) }))
  }
  return jobs
}
