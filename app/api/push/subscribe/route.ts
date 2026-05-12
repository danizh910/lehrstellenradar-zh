import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await db.insert(pushSubscriptions).values({
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    }).onConflictDoNothing()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}
