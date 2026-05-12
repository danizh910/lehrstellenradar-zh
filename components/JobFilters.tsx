'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export interface Filters {
  beruf: string
  firma: string
  maxKm: number
  nurNeu: boolean
  sortBy: string
}

interface JobFiltersProps {
  filters: Filters
  total: number
}

export function JobFilters({ filters, total }: JobFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const berufOptions = [
    { value: 'edb', label: '⭐ Entw. dig. Business EFZ' },
    { value: 'informatiker', label: 'Informatiker EFZ' },
    { value: 'mediamatiker', label: 'Mediamatiker EFZ' },
    { value: 'alle', label: 'Alle Berufe' },
  ]

  const sortOptions = [
    { value: 'datum', label: 'Neueste zuerst' },
    { value: 'distanz', label: 'Nächste zuerst' },
    { value: 'firma', label: 'Firma A–Z' },
  ]

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Beruf toggles */}
        <div className="flex gap-2 flex-wrap">
          {berufOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => update('beruf', opt.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filters.beruf === opt.value
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Row 2: firma + distanz + neu + sort */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Firma search */}
          <input
            type="text"
            placeholder="Firma suchen…"
            value={filters.firma}
            onChange={e => update('firma', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Distance slider */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">bis</span>
            <input
              type="range"
              min={1}
              max={10}
              value={filters.maxKm}
              onChange={e => update('maxKm', e.target.value)}
              className="w-20 accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-700 w-10">{filters.maxKm} km</span>
          </div>

          {/* Nur neue */}
          <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.nurNeu}
              onChange={e => update('nurNeu', e.target.checked ? 'true' : 'false')}
              className="rounded accent-blue-600"
            />
            Nur neue
          </label>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={e => update('sortBy', e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ml-auto"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Result count */}
        <p className="text-xs text-gray-500">{total} Stelle{total !== 1 ? 'n' : ''} gefunden</p>
      </div>
    </div>
  )
}
