'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportAllGuestData, clearAllGuestData } from '@/lib/storage/guest-storage'
import { formatCents } from '@/lib/forecast/utils'

interface DataMergeDialogProps {
  userId: string
  onComplete: () => void
  onSkip: () => void
}

export function DataMergeDialog({ userId, onComplete, onSkip }: DataMergeDialogProps) {
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guestData = exportAllGuestData()
  const supabase = createClient()

  const handleMerge = async () => {
    setMerging(true)
    setError(null)

    try {
      // Merge profile settings (update existing)
      if (guestData.profile) {
        await (supabase.from('profiles') as any)
          .update({
            timezone: guestData.profile.timezone,
            currency: guestData.profile.currency,
            buffer_cents: guestData.profile.buffer_cents,
            onboarding_completed: guestData.profile.onboarding_completed,
          })
          .eq('user_id', userId)
      }

      // Merge balance
      if (guestData.balance) {
        await (supabase.from('manual_balances') as any)
          .update({
            checking_cents: guestData.balance.checking_cents,
            savings_cents: guestData.balance.savings_cents,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      }

      // Insert transactions (with new user_id)
      if (guestData.transactions.length > 0) {
        const transactions = guestData.transactions.map((t) => ({
          user_id: userId,
          txn_date: t.txn_date,
          description: t.description,
          amount_cents: t.amount_cents,
          account: t.account,
          pending: t.pending,
          source: t.source,
        }))

        await (supabase.from('transactions') as any).insert(transactions)
      }

      // Insert anchors (with new user_id)
      if (guestData.anchors.length > 0) {
        const anchors = guestData.anchors.map((a) => ({
          user_id: userId,
          type: a.type,
          name: a.name,
          cadence: a.cadence,
          due_day: a.due_day,
          next_due_date: a.next_due_date,
          amount_min_cents: a.amount_min_cents,
          amount_max_cents: a.amount_max_cents,
          required: a.required,
          variable: a.variable,
          confirmed: a.confirmed,
          last_matched_txn_id: null,
        }))

        await (supabase.from('anchors') as any).insert(anchors)
      }

      // Clear guest data after successful merge
      clearAllGuestData()
      onComplete()
    } catch (err) {
      console.error('Merge failed:', err)
      setError('Failed to merge data. Please try again.')
    } finally {
      setMerging(false)
    }
  }

  const handleSkip = () => {
    clearAllGuestData()
    onSkip()
  }

  const hasData =
    guestData.transactions.length > 0 ||
    guestData.anchors.length > 0 ||
    (guestData.balance && (guestData.balance.checking_cents > 0 || guestData.balance.savings_cents > 0))

  if (!hasData) {
    // No meaningful data to merge, just clear and continue
    clearAllGuestData()
    onComplete()
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Import Your Guest Data?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          We found data from your guest session. Would you like to import it to your account?
        </p>

        {/* Data summary */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 space-y-2">
          {guestData.transactions.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Transactions:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {guestData.transactions.length}
              </span>
            </div>
          )}
          {guestData.anchors.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Bills & Income:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {guestData.anchors.length}
              </span>
            </div>
          )}
          {guestData.balance && guestData.balance.checking_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Checking Balance:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCents(guestData.balance.checking_cents)}
              </span>
            </div>
          )}
          {guestData.balance && guestData.balance.savings_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Savings Balance:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCents(guestData.balance.savings_cents)}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={merging}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Start Fresh
          </button>
          <button
            onClick={handleMerge}
            disabled={merging}
            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {merging ? 'Importing...' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
