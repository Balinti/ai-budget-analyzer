'use client'

import Link from 'next/link'
import type { PlanTier } from '@/types/database'

interface QuickActionsProps {
  hasAnchors: boolean
  tier: PlanTier
}

export function QuickActions({ hasAnchors, tier }: QuickActionsProps) {
  const hasPricing = !!(process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID)

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/app/upload"
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-center"
        >
          <svg
            className="w-6 h-6 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Upload CSV
          </span>
        </Link>

        <Link
          href="/app/anchors"
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-center"
        >
          <svg
            className="w-6 h-6 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {hasAnchors ? 'Edit Bills' : 'Add Bill'}
          </span>
        </Link>

        <Link
          href="/app/forecast"
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-center"
        >
          <svg
            className="w-6 h-6 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            View Forecast
          </span>
        </Link>

        <Link
          href="/app/settings"
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-center"
        >
          <svg
            className="w-6 h-6 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Settings
          </span>
        </Link>
      </div>

      {tier === 'free' && hasPricing && (
        <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                Upgrade for longer forecasts
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-400">
                Get 30 or 60-day forecasts with Plus or Pro
              </p>
            </div>
            <Link href="/app/billing" className="btn-primary text-sm py-1.5">
              Upgrade
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
