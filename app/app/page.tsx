import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateSafeToSpend, getPlanTier, formatCents, getHorizonDays, generateMitigationSuggestions } from '@/lib/forecast'
import { SafeToSpendCard } from '@/components/SafeToSpendCard'
import { RiskBanner } from '@/components/RiskBanner'
import { QuickActions } from '@/components/QuickActions'
import { LoadSampleDataButton } from '@/components/LoadSampleDataButton'
import type { Profile, ManualBalance, Anchor, Subscription } from '@/types/database'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check onboarding status
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

  // Fetch transaction count
  const { count: transactionCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const tier = getPlanTier(subscription)
  const horizonDays = getHorizonDays(tier)

  // Calculate safe-to-spend
  const result = balance && profile
    ? calculateSafeToSpend(balance, profile, anchors || [], tier)
    : null

  const mitigations = result && anchors
    ? generateMitigationSuggestions(result, anchors)
    : []

  const hasData = (transactionCount || 0) > 0 || (anchors?.length || 0) > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your cash flow at a glance
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/upload" className="btn-secondary">
            Import Transactions
          </Link>
          <Link href="/app/anchors" className="btn-primary">
            Manage Bills
          </Link>
        </div>
      </div>

      {/* No data state */}
      {!hasData && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Let&apos;s get started!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Import your transactions or add your bills manually to see your safe-to-spend forecast.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/app/upload" className="btn-primary">
              Import CSV
            </Link>
            <Link href="/app/anchors" className="btn-secondary">
              Add Bills Manually
            </Link>
            <LoadSampleDataButton />
          </div>
        </div>
      )}

      {/* Main dashboard content */}
      {hasData && result && (
        <>
          {/* Risk Banner */}
          {result.riskDays.length > 0 && (
            <RiskBanner
              riskDays={result.riskDays}
              incomeGapWarning={result.incomeGapWarning}
            />
          )}

          {/* Safe-to-Spend Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SafeToSpendCard
              title="Safe to Spend Today"
              amount={result.today}
              currency={profile?.currency || 'USD'}
              subtitle="Without touching your buffer"
            />
            <SafeToSpendCard
              title="Safe to Spend This Week"
              amount={result.thisWeek}
              currency={profile?.currency || 'USD'}
              subtitle={`Next ${horizonDays} days forecast`}
            />
          </div>

          {/* Breakdown */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              How we calculated this
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCents(result.currentBalance, profile?.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Bills</p>
                <p className="text-xl font-semibold text-danger-600">
                  -{formatCents(result.upcomingBills, profile?.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expected Income</p>
                <p className="text-xl font-semibold text-primary-600">
                  +{formatCents(result.expectedIncome, profile?.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Safety Buffer</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCents(result.buffer, profile?.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Mitigations */}
          {mitigations.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Suggestions
              </h2>
              <ul className="space-y-3">
                {mitigations.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary-600">{i + 1}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Actions */}
          <QuickActions
            hasAnchors={(anchors?.length || 0) > 0}
            tier={tier}
          />
        </>
      )}

      {/* Show sample data button if we have data but maybe want to reset */}
      {hasData && (
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Want to explore with demo data?
          </p>
          <LoadSampleDataButton />
        </div>
      )}
    </div>
  )
}
