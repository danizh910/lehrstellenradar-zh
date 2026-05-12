import { Resend } from 'resend'
import { RawJob } from '@/lib/scrapers/types'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }
const TO = () => process.env.NOTIFICATION_EMAIL!
const FROM = () => process.env.EMAIL_FROM || 'Lehrstellenradar <noreply@lehrstellenradar.ch>'

function jobToHtml(job: RawJob & { distanceKm?: number | null }): string {
  const dist = job.distanceKm != null ? ` · ${job.distanceKm} km` : ''
  const date = job.startDate ? `<span style="color:#6b7280">📅 ${job.startDate}</span><br>` : ''
  return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;font-family:sans-serif">
      <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">${job.source}</div>
      <div style="font-size:18px;font-weight:700;color:#111827;margin:4px 0">${job.title}</div>
      <div style="color:#374151">🏢 ${job.company}</div>
      <div style="color:#374151">📍 ${job.location}${dist}</div>
      ${date}
      <a href="${job.applyUrl}" style="display:inline-block;margin-top:12px;background:#2563eb;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:600">
        Jetzt bewerben →
      </a>
    </div>`
}

export async function notifyEmail(newJobs: (RawJob & { distanceKm?: number | null })[]): Promise<void> {
  if (newJobs.length === 0 || !process.env.RESEND_API_KEY || !TO()) return

  const subject = newJobs.length === 1
    ? `🎯 Neue Lehrstelle: ${newJobs[0].company} — ${newJobs[0].title}`
    : `🎯 ${newJobs.length} neue Lehrstellen gefunden`

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="background:#f9fafb;padding:24px;font-family:sans-serif">
      <div style="max-width:600px;margin:0 auto">
        <h1 style="color:#2563eb;font-size:24px">🎯 Lehrstellenradar</h1>
        <p style="color:#374151">${newJobs.length} neue passende Lehrst${newJobs.length === 1 ? 'elle' : 'ellen'} im Raum Zürich-Oerlikon:</p>
        ${newJobs.map(jobToHtml).join('')}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Lehrstellenradar · Zürich-Oerlikon · max. 10 km<br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#2563eb">App öffnen</a>
        </p>
      </div>
    </body>
    </html>`

  try {
    await getResend().emails.send({ from: FROM(), to: TO(), subject, html })
    console.log(JSON.stringify({ channel: 'email', event: 'sent', count: newJobs.length }))
  } catch (err) {
    console.log(JSON.stringify({ channel: 'email', event: 'error', error: String(err) }))
  }
}
