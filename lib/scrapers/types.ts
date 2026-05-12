export interface RawJob {
  source: string
  externalId: string
  title: string
  company: string
  location: string
  applyUrl: string
  description?: string
  startDate?: string
  publishedAt?: Date
}

export interface ScraperResult {
  source: string
  jobsFound: number
  jobsSaved: number
  errors: string[]
  durationMs: number
}
