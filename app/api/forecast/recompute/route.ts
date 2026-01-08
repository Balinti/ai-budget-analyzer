import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateSafeToSpend,
  toForecastRecords,
  generateMitigationSuggestions,
  getPlanTier,
} from '@/lib/forecast'
import type { Anchor, Transaction, Profile, ManualBalance, Subscription } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const includeSavings = body.includeSavings ?? false
    const persist = body.persist ?? false

    // Fetch user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found. Please complete onboarding.' },
        { status: 400 }
      )
    }

    // Fetch manual balances
    const { data: balance, error: balanceError } = await supabase
      .from('manual_balances')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (balanceError || !balance) {
      return NextResponse.json(
        { error: 'Balance not found. Please set your current balance.' },
        { status: 400 }
      )
    }

    // Fetch confirmed anchors
    const { data: anchorsData, error: anchorsError } = await supabase
      .from('anchors')
      .select('*')
      .eq('user_id', user.id)
      .eq('confirmed', true)

    if (anchorsError) {
      return NextResponse.json(
        { error: 'Failed to fetch anchors' },
        { status: 500 }
      )
    }

    const anchors = (anchorsData || []) as Anchor[]

    // Fetch subscription for tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const tier = getPlanTier(subscription)

    // Fetch historical transactions for variable income estimation
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('txn_date', { ascending: false })
      .limit(100)

    const transactions = (transactionsData || []) as Transaction[]

    // Build historical amounts map
    const historicalAmounts = new Map<string, number[]>()

    if (transactions.length > 0 && anchors.length > 0) {
      for (const anchor of anchors) {
        if (anchor.variable && anchor.last_matched_txn_id) {
          // Find similar transactions
          const matchingTxns = transactions.filter((t) =>
            t.description
              .toLowerCase()
              .includes(anchor.name.toLowerCase().split(' ')[0])
          )
          if (matchingTxns.length > 0) {
            historicalAmounts.set(
              anchor.id,
              matchingTxns.map((t) => Math.abs(t.amount_cents))
            )
          }
        }
      }
    }

    // Calculate safe-to-spend
    const result = calculateSafeToSpend(
      balance,
      profile,
      anchors || [],
      tier,
      includeSavings,
      historicalAmounts
    )

    // Generate mitigation suggestions if there are risk days
    const mitigations = generateMitigationSuggestions(result, anchors || [])

    // Optionally persist forecast records
    if (persist) {
      const forecastRecords = toForecastRecords(user.id, result)

      // Delete existing forecasts for this user
      await supabase
        .from('forecasts')
        .delete()
        .eq('user_id', user.id)

      // Insert new forecasts
      if (forecastRecords.length > 0) {
        await supabase.from('forecasts').insert(forecastRecords as any)
      }
    }

    return NextResponse.json({
      safeToSpendToday: result.today,
      safeToSpendThisWeek: result.thisWeek,
      currentBalance: result.currentBalance,
      upcomingBills: result.upcomingBills,
      expectedIncome: result.expectedIncome,
      buffer: result.buffer,
      riskDays: result.riskDays.map((d) => ({
        date: d.date.toISOString(),
        riskLevel: d.risk_level,
        projectedBalance: d.projected_balance_cents,
      })),
      incomeGapWarning: result.incomeGapWarning,
      mitigations,
      tier,
      horizonDays: result.dailyForecasts.length,
    })
  } catch (error) {
    console.error('Forecast recompute error:', error)
    return NextResponse.json(
      { error: 'Failed to compute forecast' },
      { status: 500 }
    )
  }
}
