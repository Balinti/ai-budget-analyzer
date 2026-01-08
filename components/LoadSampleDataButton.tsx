'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, addDays } from 'date-fns'

const SAMPLE_TRANSACTIONS = [
  { days: -30, description: 'Paycheck - ABC Company', amount: 250000 },
  { days: -28, description: 'Rent Payment', amount: -150000 },
  { days: -27, description: 'Electric Company', amount: -12500 },
  { days: -26, description: 'Netflix', amount: -1599 },
  { days: -25, description: 'Grocery Store', amount: -8545 },
  { days: -22, description: 'Gas Station', amount: -4523 },
  { days: -20, description: 'Phone Bill - Verizon', amount: -8500 },
  { days: -18, description: 'Restaurant', amount: -3250 },
  { days: -16, description: 'Paycheck - ABC Company', amount: 250000 },
  { days: -15, description: 'Car Insurance', amount: -12000 },
  { days: -14, description: 'Grocery Store', amount: -9234 },
  { days: -12, description: 'Internet - Comcast', amount: -7999 },
  { days: -10, description: 'Spotify', amount: -999 },
  { days: -8, description: 'Coffee Shop', amount: -650 },
  { days: -6, description: 'Amazon Purchase', amount: -4599 },
  { days: -4, description: 'Grocery Store', amount: -7823 },
  { days: -2, description: 'Paycheck - ABC Company', amount: 250000 },
  { days: -1, description: 'Gas Station', amount: -5100 },
]

const SAMPLE_ANCHORS = [
  {
    type: 'income' as const,
    name: 'Paycheck - ABC Company',
    cadence: 'biweekly' as const,
    due_day: 15,
    amount_min_cents: 240000,
    amount_max_cents: 260000,
    required: true,
    variable: true,
    confirmed: true,
  },
  {
    type: 'bill' as const,
    name: 'Rent Payment',
    cadence: 'monthly' as const,
    due_day: 1,
    amount_min_cents: 150000,
    amount_max_cents: 150000,
    required: true,
    variable: false,
    confirmed: true,
  },
  {
    type: 'bill' as const,
    name: 'Electric Company',
    cadence: 'monthly' as const,
    due_day: 3,
    amount_min_cents: 10000,
    amount_max_cents: 15000,
    required: true,
    variable: true,
    confirmed: true,
  },
  {
    type: 'bill' as const,
    name: 'Phone Bill',
    cadence: 'monthly' as const,
    due_day: 10,
    amount_min_cents: 8500,
    amount_max_cents: 8500,
    required: true,
    variable: false,
    confirmed: true,
  },
  {
    type: 'bill' as const,
    name: 'Netflix',
    cadence: 'monthly' as const,
    due_day: 4,
    amount_min_cents: 1599,
    amount_max_cents: 1599,
    required: false,
    variable: false,
    confirmed: true,
  },
]

export function LoadSampleDataButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loadSampleData = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()

      // Insert sample transactions
      const transactions = SAMPLE_TRANSACTIONS.map((t) => ({
        user_id: user.id,
        txn_date: format(addDays(today, t.days), 'yyyy-MM-dd'),
        description: t.description,
        amount_cents: t.amount,
        source: 'csv' as const,
        pending: false,
      }))

      await (supabase.from('transactions') as any).insert(transactions)

      // Insert sample anchors
      const anchors = SAMPLE_ANCHORS.map((a) => ({
        user_id: user.id,
        ...a,
        next_due_date: null,
        last_matched_txn_id: null,
      }))

      await (supabase.from('anchors') as any).insert(anchors)

      // Update balance to something reasonable
      await (supabase
        .from('manual_balances') as any)
        .update({
          checking_cents: 435000, // $4,350
          savings_cents: 100000, // $1,000
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      router.refresh()
    } catch (error) {
      console.error('Failed to load sample data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={loadSampleData}
      disabled={loading}
      className="btn-ghost text-sm"
    >
      {loading ? 'Loading...' : 'Load Sample Data'}
    </button>
  )
}
