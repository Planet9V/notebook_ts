'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProjectsRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/pipeline?tab=projects')
  }, [router])

  return null
}
