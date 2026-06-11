'use client'

import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function MockupsRedirectPage() {
  useEffect(() => {
    redirect('/')
  }, [])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 font-mono text-xs text-slate-400">
      Redirecting to Perspectives Dashboard...
    </div>
  )
}
