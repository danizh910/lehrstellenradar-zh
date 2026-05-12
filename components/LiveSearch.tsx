'use client'

import { useState } from 'react'

interface LiveSearchProps {
  onNewJobs: () => void
}

type Status = 'idle' | 'running' | 'done' | 'error' | 'rate-limited'

const SOURCE_LABELS: Record<string, string> = {
  yousty: 'yousty.ch',
  gateway: 'gateway.one',
  lehrio: 'lehrio.ch',
  baam: 'baam.ch',
  lehrstart: 'lehrstart.ch',
  firmen: 'Firmenwebseiten',
}

interface SourceState {
  name: string
  label: string
  status: 'waiting' | 'running' | 'done'
  count?: number
}

const ALL_SOURCES = Object.keys(SOURCE_LABELS)

export function LiveSearch({ onNewJobs }: LiveSearchProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ newJobs: number; totalScanned: number } | null>(null)
  const [sources, setSources] = useState<SourceState[]>([])
  const [retryAfterMs, setRetryAfterMs] = useState(0)

  async function startSearch() {
    setStatus('running')
    setResult(null)
    setSources(
      ALL_SOURCES.map(name => ({ name, label: SOURCE_LABELS[name], status: 'waiting' }))
    )

    try {
      const res = await fetch('/api/search', { method: 'POST' })
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            const event = JSON.parse(dataLine.slice(6)) as {
              type: string
              source?: string
              count?: number
              newJobs?: number
              totalScanned?: number
              retryAfterMs?: number
            }

            if (event.type === 'rate-limited') {
              setRetryAfterMs(event.retryAfterMs ?? 0)
              setStatus('rate-limited')
              return
            }

            if (event.type === 'start' && event.source) {
              setSources(prev => prev.map(s =>
                s.name === event.source ? { ...s, status: 'running' } : s
              ))
            }

            if (event.type === 'done' && event.source) {
              setSources(prev => prev.map(s =>
                s.name === event.source ? { ...s, status: 'done', count: event.count ?? 0 } : s
              ))
            }

            if (event.type === 'result') {
              setResult({ newJobs: event.newJobs ?? 0, totalScanned: event.totalScanned ?? 0 })
              setStatus('done')
              if ((event.newJobs ?? 0) > 0) onNewJobs()
            }

            if (event.type === 'error') {
              setStatus('error')
            }
          } catch {}
        }
      }
    } catch {
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

      {status === 'running' && sources.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {sources.map(s => (
            <div
              key={s.name}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                s.status === 'running'
                  ? 'bg-blue-100 text-blue-700'
                  : s.status === 'done'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                s.status === 'running' ? 'animate-pulse bg-blue-500' :
                s.status === 'done' ? 'bg-emerald-500' : 'bg-gray-300'
              }`} />
              <span className="truncate">{s.label}</span>
              {s.status === 'done' && s.count !== undefined && (
                <span className="ml-auto font-semibold">{s.count}</span>
              )}
            </div>
          ))}
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
