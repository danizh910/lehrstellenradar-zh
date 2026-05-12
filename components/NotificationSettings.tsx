'use client'

import { useState, useEffect } from 'react'

interface Settings {
  telegramEnabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => setSettings(s as Settings))
      .catch(() => {})
  }, [open])

  async function toggle(key: keyof Settings) {
    if (!settings) return
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      })
    } finally {
      setSaving(false)
    }
  }

  const channels: { key: keyof Settings; label: string; icon: string; description: string }[] = [
    { key: 'telegramEnabled', label: 'Telegram', icon: '✈️', description: 'Bot-Nachrichten bei neuen Stellen' },
    { key: 'emailEnabled', label: 'E-Mail', icon: '📧', description: '1× täglich, nur bei neuen Stellen' },
    { key: 'pushEnabled', label: 'Web Push', icon: '🔔', description: 'Browser-Benachrichtigungen (Safari PWA)' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-50 active:scale-95"
      >
        ⚙️ Benachrichtigungen
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-10 z-30 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Benachrichtigungen</h3>
              {saving && <span className="text-xs text-gray-400">Speichert…</span>}
            </div>

            {!settings ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {channels.map(ch => (
                  <button
                    key={ch.key}
                    onClick={() => toggle(ch.key)}
                    className="flex w-full items-center justify-between rounded-lg p-2.5 transition hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <span className="text-lg">{ch.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ch.label}</p>
                        <p className="text-xs text-gray-400">{ch.description}</p>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <div className={`relative h-5 w-9 rounded-full transition-colors ${settings[ch.key] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings[ch.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
