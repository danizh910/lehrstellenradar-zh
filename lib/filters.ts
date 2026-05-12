const ALLOWED_KEYWORDS = [
  // Prio 1: Entwickler digitales Business EFZ
  'entwickler digitales business', 'entwicklerin digitales business',
  'digitales business', 'digital business', 'edb efz',
  // Informatiker EFZ
  'informatiker', 'informatik', 'applikationsentwicklung', 'applikation',
  'plattformentwicklung', 'plattform', 'ict-fachmann', 'ict fachmann',
  'software', 'fachinformatiker', 'systemtechnik', 'webentwicklung',
  // Mediamatiker EFZ
  'mediamatiker', 'mediamatik',
]

export function matchesJobKeywords(title: string): boolean {
  const lower = title.toLowerCase()
  return ALLOWED_KEYWORDS.some(kw => lower.includes(kw))
}

export type JobCategory = 'edb' | 'informatiker' | 'mediamatiker' | 'alle'

export function categorizeJob(title: string): JobCategory {
  const lower = title.toLowerCase()
  // Prio 1 — check EDB first
  if (
    lower.includes('digitales business') || lower.includes('digital business') ||
    lower.includes('edb efz')
  ) return 'edb'
  if (lower.includes('mediamatik') || lower.includes('mediamatiker')) return 'mediamatiker'
  if (
    lower.includes('informatik') || lower.includes('informatiker') ||
    lower.includes('applikation') || lower.includes('plattform') ||
    lower.includes('ict') || lower.includes('software')
  ) return 'informatiker'
  return 'alle'
}
