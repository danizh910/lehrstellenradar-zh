import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs } from '@/lib/db/schema'
import { and, desc, eq, ilike, lte, gte, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const beruf = searchParams.get('beruf') || 'alle'
    const firma = searchParams.get('firma') || ''
    const maxKm = parseFloat(searchParams.get('maxKm') || '10')
    const nurNeu = searchParams.get('nurNeu') === 'true'
    const sortBy = searchParams.get('sortBy') || 'datum'

    const conditions = [eq(jobs.isActive, true)]

    if (beruf === 'edb') {
      conditions.push(
        sql`lower(${jobs.title}) ~ '(digitales business|digital business|edb efz)'`
      )
    } else if (beruf === 'informatiker') {
      conditions.push(
        sql`lower(${jobs.title}) ~ '(informatik|applikation|plattform|ict|software)'`
      )
    } else if (beruf === 'mediamatiker') {
      conditions.push(
        sql`lower(${jobs.title}) ~ '(mediamatik|mediamatiker)'`
      )
    }

    if (firma) {
      conditions.push(ilike(jobs.company, `%${firma}%`))
    }

    if (maxKm < 10) {
      conditions.push(sql`(${jobs.distanceKm} IS NULL OR ${jobs.distanceKm} <= ${maxKm})`)
    }

    if (nurNeu) {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
      conditions.push(gte(jobs.foundAt, cutoff))
    }

    const orderBy = sortBy === 'distanz'
      ? sql`${jobs.distanceKm} ASC NULLS LAST`
      : sortBy === 'firma'
      ? sql`${jobs.company} ASC`
      : desc(jobs.foundAt)

    const results = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(200)

    const lastJob = await db.select({ foundAt: jobs.foundAt }).from(jobs).orderBy(desc(jobs.foundAt)).limit(1)
    const lastUpdated = lastJob[0]?.foundAt?.toISOString() ?? null

    return NextResponse.json({ jobs: results, total: results.length, lastUpdated })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
