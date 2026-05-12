import * as cheerio from 'cheerio'
import { RawJob } from '../types'
import { matchesJobKeywords } from '@/lib/filters'
import { generateExternalId } from '@/lib/utils'

const SOURCE = 'ubs'
const COMPANY = 'UBS'
const UA = 'Mozilla/5.0 (compatible; LehrstellenradarBot/1.0)'
const URL = 'https://www.ubs.com/global/de/careers/graduates/apprenticeships.html'

export async function scrapeUbs(): Promise<RawJob[]> {
  const jobs: RawJob[] = []
  try {
    const res = await fetch(URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)

    $('a').each((_, el) => {
      const text = $(el).text().trim()
      if (!matchesJobKeywords(text)) return
      const href = $(el).attr('href') || ''
      const applyUrl = href.startsWith('http') ? href : `https://www.ubs.com${href}`
      jobs.push({
        source: SOURCE, company: COMPANY, title: text, location: '8098 Zürich',
        applyUrl, externalId: generateExternalId(SOURCE, COMPANY, text, applyUrl),
      })
    })

    // Also check for job listings in page text blocks
    $('[class*="job"], [class*="apprentice"], [class*="lern"]').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h2, h3, h4, strong').first().text().trim()
      if (!title || !matchesJobKeywords(title)) return
      const href = $el.find('a').first().attr('href') || URL
      const applyUrl = href.startsWith('http') ? href : `https://www.ubs.com${href}`
      const externalId = generateExternalId(SOURCE, COMPANY, title, applyUrl)
      if (!jobs.find(j => j.externalId === externalId)) {
        jobs.push({ source: SOURCE, company: COMPANY, title, location: '8098 Zürich', applyUrl, externalId })
      }
    })
  } catch (err) {
    console.log(JSON.stringify({ source: SOURCE, event: 'error', error: String(err) }))
  }
  return jobs
}
