'use client'

import { useCallback } from 'react'

export interface TelemetryEvent {
  eventName: string
  properties?: Record<string, any>
  timestamp: string
}

export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    const timestamp = new Date().toISOString()
    const event: TelemetryEvent = {
      eventName,
      properties,
      timestamp,
    }

    // Console logging with premium styles to ensure visibility and clean tracking
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `%c[Telemetry] ${eventName}`,
        'color: #8b5cf6; font-weight: bold; background: rgba(139, 92, 246, 0.1); padding: 2px 6px; border-radius: 4px;',
        properties
      )
    }

    // Save to local storage for persistence and validation
    try {
      const history = JSON.parse(localStorage.getItem('tetrel_telemetry_history') || '[]')
      history.push(event)
      // Keep last 100 events
      if (history.length > 100) {
        history.shift()
      }
      localStorage.setItem('tetrel_telemetry_history', JSON.stringify(history))
    } catch (e) {
      console.warn('Failed to store telemetry event in localStorage:', e)
    }
  }, [])

  return { trackEvent }
}
