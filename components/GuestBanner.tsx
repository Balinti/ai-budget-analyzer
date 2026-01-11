'use client'

import { useState } from 'react'
import Link from 'next/link'

interface GuestBannerProps {
  timeRemaining: string
  progress: number
}

export function GuestBanner({ timeRemaining, progress }: GuestBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const isLowTime = progress < 40

  return (
    <div className={`${isLowTime ? 'bg-amber-600' : 'bg-primary-600'} text-white px-4 py-2 transition-colors`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-mono font-medium">{timeRemaining}</span>
          </div>
          <span className="text-sm hidden sm:inline">
            Guest trial - data saved locally only
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/signup"
            className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
              isLowTime
                ? 'bg-white text-amber-600 hover:bg-amber-50'
                : 'bg-white text-primary-600 hover:bg-primary-50'
            }`}
          >
            Create Account
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className={`${isLowTime ? 'text-amber-200 hover:text-white' : 'text-primary-200 hover:text-white'} transition-colors`}
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
