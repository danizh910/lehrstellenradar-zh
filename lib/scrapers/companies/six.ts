import * as cheerio from 'cheerio'
import { RawJob } from '../types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId } from '@/lib/utils'

const SOURCE = 'six'
const COMPANY = 'SIX Group'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'
const URL = 'https://www.six-group.com/de/company/jobs/apprentices.html'

export async function scrapeSix(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    const res = await fetch(URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)

    $('[class*="job"], [class*="apprentice"], [class*="lern"], [class*="card"]').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h2, h3, h4, strong, [class*="title"]').first().text().trim()
      if (!title || !matchesJobKeywords(title)) return
      const href = $el.find('a').first().attr('href') || URL
      const applyUrl = href.startsWith('http') ? href : `https://www.six-group.com${href}`
      const externalId = generateExternalId(SOURCE, COMPANY, title, applyUrl)
      jobs.push({ source: SOURCE, company: COMPANY, title, location: '8021 Zürich', applyUrl, externalId })
    })

    if (jobs.length === 0) {
      $('a').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length < 10 || !matchesJobKeywords(text)) return
        const href = $(el).attr('href') || URL
        const applyUrl = href.startsWith('http') ? href : `https://www.six-group.com${href}`
        jobs.push({
          source: SOURCE, company: COMPANY, title: text, location: '8021 Zürich',
          applyUrl, externalId: generateExternalId(SOURCE, COMPANY, text, applyUrl),
        })
      })
    }
  } catch (err) {
    console.log(JSON.stringify({ source: SOURCE, event: 'error', error: String(err) }))
  }
  return jobs
}
