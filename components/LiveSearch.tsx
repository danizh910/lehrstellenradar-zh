'use client'

import { useState } from 'react'

interface LiveSearchProps {
  onNewJobs: () => void
}

type Status = 'idle' | 'running' | 'done' | 'error' | 'rate-limited'

const SOURCES = [
  'yousty.ch', 'gateway.one', 'lehrio.ch', 'baam.ch',
  'UBS', 'ZKB', 'Swisscom', 'Swiss Re', 'Zurich Insurance', 'SIX Group',
]

export function LiveSearch({ onNewJobs }: LiveSearchProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ newJobs: number; totalScanned: number } | null>(null)
  const [currentSource, setCurrentSource] = useState('')
  const [retryAfterMs, setRetryAfterMs] = useState(0)

  async function startSearch() {
    setStatus('running')
    setResult(null)

    // Animate source labels
    let i = 0
    const interval = setInterval(() => {
      setCurrentSource(SOURCES[i % SOURCES.length])
      i++
    }, 700)

    try {
      const res = await fetch('/api/search', { method: 'POST' })
      clearInterval(interval)
      setCurrentSource('')

      if (res.status === 429) {
        const data = await res.json() as { retryAfterMs: number }
        setRetryAfterMs(data.retryAfterMs)
        setStatus('rate-limited')
        return
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { newJobs: number; totalScanned: number }
      setResult(data)
      setStatus('done')
      if (data.newJobs > 0) onNewJobs()
    } catch {
      clearInterval(interval)
      setStatus('error')
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Jetzt live suchen 🔍</h2>
        <button
          onClick={startSearch}
          disabled={status === 'running'}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {status === 'running' ? 'Suche läuft…' : 'Neue Suche starten'}
        </button>
      </div>

      {status === 'running' && (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-blue-500" />
          </div>
          {currentSource && (
            <p className="text-sm text-gray-500 animate-pulse">Durchsuche {currentSource}…</p>
          )}
        </div>
      )}

      {status === 'done' && result && (
        <p className={`text-sm font-medium ${result.newJobs > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
          {result.newJobs > 0
            ? `${result.newJobs} neue Stelle${result.newJobs > 1 ? 'n' : ''} gefunden! (${result.totalScanned} gescannt)`
            : `Keine neuen Stellen (${result.totalScanned} gescannt)`}
        </p>
      )}

      {status === 'rate-limited' && (
        <p className="text-sm text-amber-600">
          Bitte warte noch {Math.ceil(retryAfterMs / 60000)} Minuten vor der nächsten Suche.
        </p>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-600">Fehler bei der Suche. Bitte versuche es später nochmal.</p>
      )}
    </div>
  )
}
