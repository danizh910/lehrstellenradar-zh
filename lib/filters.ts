const ALLOWED_KEYWORDS = [
  'informatiker', 'informatik', 'applikationsentwicklung', 'applikation',
  'plattformentwicklung', 'plattform', 'mediamatiker', 'mediamatik',
  'ict-fachmann', 'ict fachmann', 'software', 'entwickler digital',
  'fachinformatiker', 'systemtechnik', 'webentwicklung', 'digital',
]

export function matchesJobKeywords(title: string): boolean {
  const lower = title.toLowerCase()
  return ALLOWED_KEYWORDS.some(kw => lower.includes(kw))
}

export type JobCategory = 'informatiker' | 'mediamatiker' | 'alle'

export function categorizeJob(title: string): JobCategory {
  const lower = title.toLowerCase()
  if (lower.includes('mediamatik') || lower.includes('mediamatiker')) return 'mediamatiker'
  if (
    lower.includes('informatik') || lower.includes('informatiker') ||
    lower.includes('applikation') || lower.includes('plattform') ||
    lower.includes('ict') || lower.includes('software') || lower.includes('digital')
  ) return 'informatiker'
  return 'alle'
}
