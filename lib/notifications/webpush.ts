import webpush from 'web-push'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

let initialized = false

function init() {
  if (initialized) return
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@lehrstellenradar.ch',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  initialized = true
}

export async function notifyWebPush(newJobsCount: number, companies: string[]): Promise<void> {
  init()
  if (!initialized || newJobsCount === 0) return

  const subs = await db.select().from(pushSubscriptions)
  if (subs.length === 0) return

  const companyList = companies.slice(0, 3).join(', ')
  const payload = JSON.stringify({
    title: '🎯 Neue Lehrstellen gefunden!',
    body: `${newJobsCount} neue Stelle${newJobsCount > 1 ? 'n' : ''}: ${companyList}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: process.env.NEXT_PUBLIC_APP_URL || '/',
  })

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 410 || status === 404) {
        // Subscription expired — remove it
        await db.delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, sub.endpoint))
          .catch(() => {})
      }
      console.log(JSON.stringify({ channel: 'webpush', event: 'error', error: String(err) }))
    }
  }
}
