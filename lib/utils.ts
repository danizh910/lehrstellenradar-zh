import { createHash } from 'crypto'

export function generateExternalId(source: string, company: string, title: string, applyUrl: string): string {
  return createHash('sha256')
    .update(`${source}|${company.toLowerCase()}|${title.toLowerCase()}|${applyUrl}`)
    .digest('hex')
    .slice(0, 32)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  const diffD = diffH / 24

  if (diffH < 1) return 'Gerade eben'
  if (diffH < 24) return 'Heute'
  if (diffD < 2) return 'Gestern'
  if (diffD < 7) return `vor ${Math.floor(diffD)} Tagen`
  if (diffD < 30) return `vor ${Math.floor(diffD / 7)} Wochen`
  return date.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' })
}

export function isNew(date: Date | null | undefined, hours = 48): boolean {
  if (!date) return false
  return Date.now() - date.getTime() < hours * 60 * 60 * 1000
}
