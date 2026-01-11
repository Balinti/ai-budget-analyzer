'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  startGuestSession,
  getGuestTimeRemaining,
  isGuestSessionExpired,
  GUEST_SESSION_DURATION_MS,
} from '@/lib/storage/guest-storage'

interface GuestTimerState {
  timeRemaining: number
  isExpired: boolean
  formattedTime: string
  progress: number // 0-100, percentage of time remaining
}

export function useGuestTimer(isGuest: boolean): GuestTimerState {
  const [timeRemaining, setTimeRemaining] = useState(GUEST_SESSION_DURATION_MS)
  const [isExpired, setIsExpired] = useState(false)

  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  useEffect(() => {
    if (!isGuest) return

    // Start the session timer when guest mode begins
    startGuestSession()

    // Update time remaining every second
    const updateTimer = () => {
      const remaining = getGuestTimeRemaining()
      setTimeRemaining(remaining)
      setIsExpired(isGuestSessionExpired())
    }

    // Initial update
    updateTimer()

    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [isGuest])

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
    progress: (timeRemaining / GUEST_SESSION_DURATION_MS) * 100,
  }
}
