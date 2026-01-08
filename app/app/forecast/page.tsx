import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import {
  calculateSafeToSpend,
  getPlanTier,
  getHorizonDays,
  formatCents,
  RISK_COLORS,
} from '@/lib/forecast'
import type { Profile, ManualBalance, Anchor, Subscription } from '@/types/database'

export default async function ForecastPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const profile = profileData as Profile | null

  if (!profile?.onboarding_completed) {
    redirect('/app/onboarding')
  }

  // Fetch balances
  const { data: balanceData } = await supabase
    .from('manual_balances')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const balance = balanceData as ManualBalance | null

  // Fetch confirmed anchors
  const { data: anchorsData } = await supabase
    .from('anchors')
    .select('*')
    .eq('user_id', user.id)
    .eq('confirmed', true)

  const anchors = (anchorsData || []) as Anchor[]

  // Fetch subscription for tier
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const subscription = subscriptionData as Subscription | null
  const tier = getPlanTier(subscription)
  const horizonDays = getHorizonDays(tier)

  // Calculate forecast
  const result = balance && profile
    ? calculateSafeToSpend(balance, profile, anchors || [], tier)
    : null

  const hasPricing = !!(process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cash Flow Forecast
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {horizonDays}-day projection based on your bills and income
          </p>
        </div>
        {tier === 'free' && hasPricing && (
          <Link href="/app/billing" className="btn-secondary text-sm">
            Upgrade for 30-60 day forecast
          </Link>
        )}
      </div>

      {/* No data state */}
      {!result || !anchors?.length ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No forecast data yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add your recurring bills and income to see your cash flow forecast.
          </p>
          <Link href="/app/anchors" className="btn-primary">
            Add Bills & Income
          </Link>
        </div>
      ) : (
        <>
          {/* Calendar View */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Daily Forecast
            </h2>

            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Week headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {result.dailyForecasts.map((forecast, i) => {
                    const dayOfWeek = forecast.date.getDay()
                    const isToday = i === 0
                    const colors = RISK_COLORS[forecast.risk_level]

                    return (
                      <div
                        key={i}
                        style={{ gridColumnStart: i === 0 ? dayOfWeek + 1 : undefined }}
                        className={`p-2 rounded-lg border ${colors.border} ${colors.bg} ${
                          isToday ? 'ring-2 ring-primary-500' : ''
                        }`}
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(forecast.date, 'MMM d')}
                        </div>
                        <div className={`text-sm font-medium ${colors.text}`}>
                          {formatCents(forecast.projected_balance_cents, profile.currency)}
                        </div>
                        {forecast.events.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {forecast.events.slice(0, 2).map((event, j) => (
                              <div
                                key={j}
                                className={`text-xs truncate ${
                                  event.type === 'income'
                                    ? 'text-primary-600'
                                    : 'text-danger-600'
                                }`}
                              >
                                {event.type === 'income' ? '+' : '-'}
                                {formatCents(Math.abs(event.amount_cents))} {event.name.split(' ')[0]}
                              </div>
                            ))}
                            {forecast.events.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{forecast.events.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* List View */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Events
            </h2>

            <div className="space-y-3">
              {result.dailyForecasts
                .filter((f) => f.events.length > 0)
                .slice(0, 15)
                .map((forecast, i) => (
                  <div key={i}>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      {format(forecast.date, 'EEEE, MMMM d')}
                    </div>
                    {forecast.events.map((event, j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              event.type === 'income'
                                ? 'bg-primary-500'
                                : 'bg-danger-500'
                            }`}
                          />
                          <span className="text-gray-900 dark:text-white">
                            {event.name}
                          </span>
                          {!event.is_required && (
                            <span className="text-xs text-gray-500">(optional)</span>
                          )}
                        </div>
                        <span
                          className={`font-medium ${
                            event.type === 'income'
                              ? 'text-primary-600'
                              : 'text-danger-600'
                          }`}
                        >
                          {event.type === 'income' ? '+' : '-'}
                          {formatCents(Math.abs(event.amount_cents), profile.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>

            {result.dailyForecasts.filter((f) => f.events.length > 0).length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No upcoming bills or income in the forecast period.
              </p>
            )}
          </div>

          {/* Legend */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Risk levels:</span>
              {Object.entries(RISK_COLORS).map(([level, colors]) => (
                <div key={level} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${colors.bg} ${colors.border} border`} />
                  <span className="capitalize text-gray-700 dark:text-gray-300">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
