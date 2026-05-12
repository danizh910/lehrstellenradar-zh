'use client'

import { useState, useEffect } from 'react'

type PushState = 'loading' | 'unsupported' | 'subscribed' | 'unsubscribed' | 'error'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

export function PushSubscribeButton() {
  const [state, setState] = useState<PushState>('loading')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? 'subscribed' : 'unsubscribed')
      })
    })
  }, [])

  async function subscribe() {
    try {
      const keyRes = await fetch('/api/push/vapid-public-key')
      const { publicKey } = await keyRes.json() as { publicKey: string }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })

      setState('subscribed')
    } catch {
      setState('error')
    }
  }

  if (state === 'loading' || state === 'unsupported') return null

  if (state === 'subscribed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
        🔔 Benachrichtigungen aktiv
      </span>
    )
  }

  return (
    <button
      onClick={subscribe}
      className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-200 active:scale-95"
    >
      🔔 Benachrichtigungen aktivieren
    </button>
  )
}
