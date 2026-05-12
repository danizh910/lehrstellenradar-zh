'use client'

import { NewBadge } from './NewBadge'
import { formatRelativeDate, isNew } from '@/lib/utils'

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  distanceKm: number | null
  applyUrl: string
  description: string | null
  startDate: string | null
  foundAt: Date | string | null
  source: string
}

interface JobCardProps {
  job: Job
}

const SOURCE_LABELS: Record<string, string> = {
  yousty: 'yousty.ch',
  gateway: 'gateway.one',
  lehrio: 'lehrio.ch',
  baam: 'baam.ch',
  ubs: 'UBS',
  zkb: 'ZKB',
  swisscom: 'Swisscom',
  swissre: 'Swiss Re',
  zurichinsurance: 'Zurich Insurance',
  helvetia: 'Helvetia',
  six: 'SIX Group',
  mobiliar: 'Mobiliar',
}

export function JobCard({ job }: JobCardProps) {
  const foundDate = job.foundAt ? new Date(job.foundAt) : null
  const fresh = isNew(foundDate)
  const relDate = foundDate ? formatRelativeDate(foundDate) : ''

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-blue-300">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">{job.title}</h3>
            {fresh && <NewBadge />}
          </div>
          <p className="mt-0.5 text-lg font-bold text-blue-700 truncate">{job.company}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
        {job.location && (
          <span className="flex items-center gap-1">
            📍 {job.location}
            {job.distanceKm != null && (
              <span className="font-medium text-gray-700">· {job.distanceKm} km</span>
            )}
          </span>
        )}
        {job.startDate && (
          <span>📅 {job.startDate}</span>
        )}
        {relDate && (
          <span className={fresh ? 'text-emerald-600 font-medium' : ''}>{relDate}</span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-gray-400">via {SOURCE_LABELS[job.source] ?? job.source}</span>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
        >
          Bewerben →
        </a>
      </div>
    </div>
  )
}
