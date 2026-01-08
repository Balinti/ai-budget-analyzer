'use client'

import { formatCents } from '@/lib/forecast/utils'

interface SafeToSpendCardProps {
  title: string
  amount: number
  currency: string
  subtitle?: string
}

export function SafeToSpendCard({ title, amount, currency, subtitle }: SafeToSpendCardProps) {
  const isPositive = amount > 0
  const isZero = amount === 0

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h3>
      <p
        className={`text-4xl font-bold ${
          isZero
            ? 'text-gray-400'
            : isPositive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-danger-600 dark:text-danger-400'
        }`}
      >
        {formatCents(amount, currency)}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  )
}
