'use client'

import { format } from 'date-fns'
import type { DailyForecast } from '@/lib/forecast/engine'

interface RiskBannerProps {
  riskDays: DailyForecast[]
  incomeGapWarning: string | null
}

export function RiskBanner({ riskDays, incomeGapWarning }: RiskBannerProps) {
  const highRiskDays = riskDays.filter((d) => d.risk_level === 'high')
  const hasHighRisk = highRiskDays.length > 0

  return (
    <div
      className={`p-4 rounded-lg flex items-start gap-3 ${
        hasHighRisk
          ? 'bg-danger-100 dark:bg-danger-900/30'
          : 'bg-warning-100 dark:bg-warning-900/30'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          hasHighRisk
            ? 'bg-danger-200 dark:bg-danger-800'
            : 'bg-warning-200 dark:bg-warning-800'
        }`}
      >
        <svg
          className={`w-5 h-5 ${
            hasHighRisk
              ? 'text-danger-700 dark:text-danger-300'
              : 'text-warning-700 dark:text-warning-300'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div>
        <h3
          className={`font-semibold ${
            hasHighRisk
              ? 'text-danger-800 dark:text-danger-200'
              : 'text-warning-800 dark:text-warning-200'
          }`}
        >
          {hasHighRisk ? 'Danger Ahead' : 'Caution'}
        </h3>
        <p
          className={`text-sm mt-1 ${
            hasHighRisk
              ? 'text-danger-700 dark:text-danger-300'
              : 'text-warning-700 dark:text-warning-300'
          }`}
        >
          {hasHighRisk ? (
            <>
              Your projected balance goes negative on{' '}
              <strong>{format(highRiskDays[0].date, 'MMM d')}</strong>.
              Review your upcoming bills or add more income.
            </>
          ) : (
            <>
              You have {riskDays.length} day{riskDays.length > 1 ? 's' : ''} where
              your balance may fall below your safety buffer.
            </>
          )}
        </p>
        {incomeGapWarning && (
          <p
            className={`text-sm mt-2 ${
              hasHighRisk
                ? 'text-danger-600 dark:text-danger-400'
                : 'text-warning-600 dark:text-warning-400'
            }`}
          >
            {incomeGapWarning}
          </p>
        )}
      </div>
    </div>
  )
}
