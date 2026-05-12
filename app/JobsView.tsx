'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { JobCard } from '@/components/JobCard'
import { JobFilters, Filters } from '@/components/JobFilters'
import { LiveSearch } from '@/components/LiveSearch'
import { PushSubscribeButton } from '@/components/PushSubscribeButton'
import { NotificationSettings } from '@/components/NotificationSettings'
import { isNew } from '@/lib/utils'

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  distanceKm: number | null
  applyUrl: string
  description: string | null
  startDate: string | null
  foundAt: string | null
  source: string
  isActive: boolean
}

export function JobsView() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const filters: Filters = {
    beruf: searchParams.get('beruf') || 'edb',
    firma: searchParams.get('firma') || '',
    maxKm: parseInt(searchParams.get('maxKm') || '10'),
    nurNeu: searchParams.get('nurNeu') === 'true',
    sortBy: searchParams.get('sortBy') || 'datum',
  }

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        beruf: filters.beruf,
        maxKm: String(filters.maxKm),
        sortBy: filters.sortBy,
        ...(filters.firma && { firma: filters.firma }),
        ...(filters.nurNeu && { nurNeu: 'true' }),
      })
      const res = await fetch(`/api/jobs?${params}`)
      const data = await res.json() as { jobs: Job[]; total: number; lastUpdated: string }
      setJobs(data.jobs)
      setTotal(data.total)
      setLastUpdated(data.lastUpdated)
    } finally {
      setLoading(false)
    }
  }, [filters.beruf, filters.firma, filters.maxKm, filters.nurNeu, filters.sortBy])

  useEffect(() => { loadJobs() }, [loadJobs])

  const todayCount = jobs.filter(j => j.foundAt && isNew(new Date(j.foundAt))).length
  const lastUpdatedDisplay = lastUpdated
    ? new Date(lastUpdated).toLocaleString('de-CH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Lehrstellenradar 🎯
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Zürich-Oerlikon · max. 10 km · Informatiker & Mediamatiker EFZ
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PushSubscribeButton />
              <NotificationSettings />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {todayCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                🆕 {todayCount} neue Stelle{todayCount > 1 ? 'n' : ''} heute
              </span>
            )}
            {lastUpdatedDisplay && (
              <span className="text-xs text-gray-400">Zuletzt aktualisiert: {lastUpdatedDisplay}</span>
            )}
          </div>
        </div>
      </header>

      {/* Sticky filters */}
      <JobFilters filters={filters} total={total} />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Live search */}
        <LiveSearch onNewJobs={loadJobs} />

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">🔍</p>
            <p className="text-gray-600 font-medium">Keine Stellen gefunden</p>
            <p className="text-gray-400 text-sm">Versuche andere Filter oder starte eine live Suche</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          Lehrstellenradar · Zürich-Oerlikon · Daten von yousty.ch, gateway.one, lehrio.ch, baam.ch, lehrstart.ch und direkten Firmenwebseiten
        </footer>
      </main>
    </div>
  )
}
