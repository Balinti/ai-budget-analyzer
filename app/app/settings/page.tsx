'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CURRENCIES, TIMEZONES, formatCents, parseToCents } from '@/lib/forecast/utils'
import type { Profile, ManualBalance } from '@/types/database'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<ManualBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [timezone, setTimezone] = useState('')
  const [currency, setCurrency] = useState('')
  const [buffer, setBuffer] = useState('')
  const [checkingBalance, setCheckingBalance] = useState('')
  const [savingsBalance, setSavingsBalance] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const loadedProfile = profileData as Profile | null
      if (loadedProfile) {
        setProfile(loadedProfile)
        setTimezone(loadedProfile.timezone)
        setCurrency(loadedProfile.currency)
        setBuffer((loadedProfile.buffer_cents / 100).toString())
      }

      // Load balances
      const { data: balanceData } = await supabase
        .from('manual_balances')
        .select('*')
        .eq('user_id', user.id)
        .single()

      const loadedBalance = balanceData as ManualBalance | null
      if (loadedBalance) {
        setBalance(loadedBalance)
        setCheckingBalance((loadedBalance.checking_cents / 100).toString())
        setSavingsBalance((loadedBalance.savings_cents / 100).toString())
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await (supabase
        .from('profiles') as any)
        .update({
          timezone,
          currency,
          buffer_cents: parseToCents(buffer),
        })
        .eq('user_id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBalances = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await (supabase
        .from('manual_balances') as any)
        .update({
          checking_cents: parseToCents(checkingBalance),
          savings_cents: parseToCents(savingsBalance),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Balances updated successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update balances' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!confirm('This will permanently delete all your data including transactions, bills, and settings. Type DELETE to confirm.')) {
      return
    }

    setDeleting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete all user data (cascades should handle most of it)
      await (supabase.from('forecasts') as any).delete().eq('user_id', user.id)
      await (supabase.from('anchors') as any).delete().eq('user_id', user.id)
      await (supabase.from('transactions') as any).delete().eq('user_id', user.id)
      await (supabase.from('subscriptions') as any).delete().eq('user_id', user.id)
      await (supabase.from('manual_balances') as any).delete().eq('user_id', user.id)
      await (supabase.from('profiles') as any).delete().eq('user_id', user.id)

      // Sign out
      await supabase.auth.signOut()

      router.push('/')
    } catch (error) {
      console.error('Failed to delete account:', error)
      setMessage({ type: 'error', text: 'Failed to delete account. Please try again.' })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account and preferences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profile Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="timezone" className="label">
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="currency" className="label">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="buffer" className="label">
              Safety Buffer Amount
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Minimum amount you want to keep as a cushion.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="buffer"
                type="number"
                min="0"
                step="50"
                value={buffer}
                onChange={(e) => setBuffer(e.target.value)}
                className="input pl-7"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Profile Settings'}
          </button>
        </div>
      </div>

      {/* Account Balances */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Balances
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Update your current account balances to keep your forecast accurate.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="checking" className="label">
              Checking Account Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="checking"
                type="number"
                min="0"
                step="0.01"
                value={checkingBalance}
                onChange={(e) => setCheckingBalance(e.target.value)}
                className="input pl-7"
              />
            </div>
          </div>

          <div>
            <label htmlFor="savings" className="label">
              Savings Account Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="savings"
                type="number"
                min="0"
                step="0.01"
                value={savingsBalance}
                onChange={(e) => setSavingsBalance(e.target.value)}
                className="input pl-7"
              />
            </div>
          </div>

          <button
            onClick={handleSaveBalances}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Update Balances'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-danger-300 dark:border-danger-800">
        <h2 className="text-lg font-semibold text-danger-600 dark:text-danger-400 mb-4">
          Danger Zone
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="btn-danger"
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
