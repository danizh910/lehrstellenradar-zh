import { Suspense } from 'react'
import { JobsView } from './JobsView'

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Lädt…</div>}>
      <JobsView />
    </Suspense>
  )
}
