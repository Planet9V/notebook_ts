'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ResearchRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/operations?tab=research')
  }, [router])

  return null
}
