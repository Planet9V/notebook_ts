'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────

interface AvatarPanelProps {
  /** Audio level from 0 to 1 (for lip-sync approximation) */
  audioLevel?: number
  /** Avatar state */
  state?: 'idle' | 'listening' | 'thinking' | 'speaking'
  /** Avatar preset */
  preset?: AvatarPreset
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show/hide */
  visible?: boolean
  /** Custom class name */
  className?: string
}

export type AvatarPreset =
  | 'orb'        // Glowing orb (default)
  | 'wave'       // Sound wave circles
  | 'face'       // Abstract face
  | 'pulse'      // Pulsating ring

// ── Avatar Presets ──────────────────────────────────────────────────

const SIZE_MAP = {
  sm: { container: 'h-16 w-16', ring: 'h-20 w-20' },
  md: { container: 'h-24 w-24', ring: 'h-28 w-28' },
  lg: { container: 'h-32 w-32', ring: 'h-36 w-36' },
}

const STATE_COLORS = {
  idle: {
    primary: 'from-cyan-500/40 to-violet-500/40',
    ring: 'border-cyan-500/20',
    glow: 'shadow-cyan-500/10',
  },
  listening: {
    primary: 'from-emerald-500/50 to-cyan-500/50',
    ring: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  thinking: {
    primary: 'from-amber-500/50 to-orange-500/50',
    ring: 'border-amber-500/30',
    glow: 'shadow-amber-500/15',
  },
  speaking: {
    primary: 'from-violet-500/60 to-cyan-500/60',
    ring: 'border-violet-500/40',
    glow: 'shadow-violet-500/25',
  },
}

// ── Orb Avatar ──────────────────────────────────────────────────────

function OrbAvatar({ audioLevel = 0, state = 'idle', size = 'md' }: AvatarPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)

  const sizeMap = { sm: 64, md: 96, lg: 128 }
  const dim = sizeMap[size]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = dim * dpr
    canvas.height = dim * dpr
    ctx.scale(dpr, dpr)

    const cx = dim / 2
    const cy = dim / 2
    const baseRadius = dim * 0.3

    const draw = () => {
      timeRef.current += 0.02
      ctx.clearRect(0, 0, dim, dim)

      // Background glow
      const glowRadius = baseRadius * (1.2 + audioLevel * 0.5)
      const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius * 1.5)

      const isActive = state === 'speaking' || state === 'listening'
      if (isActive) {
        glowGradient.addColorStop(0, `rgba(139, 92, 246, ${0.15 + audioLevel * 0.2})`)
        glowGradient.addColorStop(0.5, `rgba(6, 182, 212, ${0.08 + audioLevel * 0.1})`)
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      } else if (state === 'thinking') {
        glowGradient.addColorStop(0, `rgba(245, 158, 11, 0.15)`)
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      } else {
        glowGradient.addColorStop(0, `rgba(6, 182, 212, 0.08)`)
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      }

      ctx.fillStyle = glowGradient
      ctx.fillRect(0, 0, dim, dim)

      // Main orb with wobble
      const wobble = state === 'speaking' ? audioLevel * 8 : Math.sin(timeRef.current) * 2
      const points = 64

      ctx.beginPath()
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        const noise = Math.sin(angle * 3 + timeRef.current * 2) * wobble
        const r = baseRadius + noise + (state === 'listening' ? Math.sin(timeRef.current * 3) * 3 : 0)
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      // Gradient fill
      const orbGradient = ctx.createRadialGradient(cx - 10, cy - 10, 0, cx, cy, baseRadius * 1.2)
      if (state === 'speaking') {
        orbGradient.addColorStop(0, `rgba(139, 92, 246, ${0.6 + audioLevel * 0.3})`)
        orbGradient.addColorStop(1, `rgba(6, 182, 212, ${0.3 + audioLevel * 0.2})`)
      } else if (state === 'listening') {
        orbGradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)')
        orbGradient.addColorStop(1, 'rgba(6, 182, 212, 0.3)')
      } else if (state === 'thinking') {
        orbGradient.addColorStop(0, 'rgba(245, 158, 11, 0.5)')
        orbGradient.addColorStop(1, 'rgba(234, 88, 12, 0.3)')
      } else {
        orbGradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)')
        orbGradient.addColorStop(1, 'rgba(139, 92, 246, 0.15)')
      }

      ctx.fillStyle = orbGradient
      ctx.fill()

      // Inner highlight
      ctx.beginPath()
      ctx.arc(cx - baseRadius * 0.2, cy - baseRadius * 0.2, baseRadius * 0.3, 0, Math.PI * 2)
      const highlightGradient = ctx.createRadialGradient(
        cx - baseRadius * 0.2, cy - baseRadius * 0.2, 0,
        cx - baseRadius * 0.2, cy - baseRadius * 0.2, baseRadius * 0.3,
      )
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = highlightGradient
      ctx.fill()

      // Audio level rings (when speaking)
      if (state === 'speaking' && audioLevel > 0.1) {
        const ringCount = Math.ceil(audioLevel * 3)
        for (let i = 0; i < ringCount; i++) {
          const ringR = baseRadius + 10 + i * 8 + Math.sin(timeRef.current * 4 + i) * 3
          const alpha = (1 - i / ringCount) * audioLevel * 0.3
          ctx.beginPath()
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Thinking spinner
      if (state === 'thinking') {
        ctx.beginPath()
        const spinAngle = timeRef.current * 3
        ctx.arc(cx, cy, baseRadius + 12, spinAngle, spinAngle + Math.PI * 0.8)
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [audioLevel, state, size, dim])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: dim, height: dim }}
      className="rounded-full"
    />
  )
}

// ── Main Component ──────────────────────────────────────────────────

export function AvatarPanel({
  audioLevel = 0,
  state = 'idle',
  preset = 'orb',
  size = 'md',
  visible = true,
  className,
}: AvatarPanelProps) {
  if (!visible) return null

  const sizes = SIZE_MAP[size]
  const colors = STATE_COLORS[state]

  const stateLabel = {
    idle: 'Ready',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 transition-all duration-500',
        className,
      )}
    >
      {/* Outer ring */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full',
          'transition-all duration-300',
          sizes.ring,
          state === 'speaking' && 'animate-pulse',
        )}
      >
        {/* Avatar canvas */}
        <OrbAvatar
          audioLevel={audioLevel}
          state={state}
          size={size}
        />
      </div>

      {/* State label */}
      <span
        className={cn(
          'text-[10px] font-medium tracking-wider uppercase transition-all duration-300',
          state === 'idle' && 'text-muted-foreground/50',
          state === 'listening' && 'text-emerald-400/80',
          state === 'thinking' && 'text-amber-400/80',
          state === 'speaking' && 'text-violet-400/80',
        )}
      >
        {stateLabel[state]}
      </span>
    </div>
  )
}
