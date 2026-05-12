import { NextRequest, NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/lib/settings'

export async function GET() {
  const settings = await getSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { telegramEnabled?: boolean; emailEnabled?: boolean; pushEnabled?: boolean }
    const updated = await updateSettings(body)
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
