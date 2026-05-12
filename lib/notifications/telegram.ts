import { RawJob } from '@/lib/scrapers/types'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!

async function sendMessage(text: string): Promise<void> {
  if (!TOKEN || !CHAT_ID) {
    console.log(JSON.stringify({ channel: 'telegram', event: 'skip', reason: 'missing_env' }))
    return
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const err = await res.text()
    console.log(JSON.stringify({ channel: 'telegram', event: 'error', status: res.status, body: err }))
  }
}

function formatJob(job: RawJob & { distanceKm?: number | null }): string {
  const dist = job.distanceKm != null ? ` (${job.distanceKm} km)` : ''
  const date = job.startDate ? `\n📅 ${job.startDate}` : ''
  return `🎯 *Neue Lehrstelle*\n\n*${job.title}*\n🏢 ${job.company}\n📍 ${job.location}${dist}${date}\n\n[Jetzt bewerben →](${job.applyUrl})`
}

export async function notifyTelegram(newJobs: (RawJob & { distanceKm?: number | null })[]): Promise<void> {
  if (newJobs.length === 0) return

  if (newJobs.length === 1) {
    await sendMessage(formatJob(newJobs[0]))
    return
  }

  // Summary first
  const summary = `🎯 *${newJobs.length} neue Lehrstellen gefunden!*\n\n${newJobs.slice(0, 5).map(j => `• ${j.company}: ${j.title}`).join('\n')}${newJobs.length > 5 ? `\n…und ${newJobs.length - 5} weitere` : ''}`
  await sendMessage(summary)

  // Then individual jobs (max 10)
  for (const job of newJobs.slice(0, 10)) {
    await new Promise(r => setTimeout(r, 500))
    await sendMessage(formatJob(job))
  }
}
