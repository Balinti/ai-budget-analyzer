'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useDataAccess } from '@/lib/hooks/useDataAccess'
import { CURRENCIES, TIMEZONES, parseToCents } from '@/lib/forecast/utils'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [timezone, setTimezone] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [buffer, setBuffer] = useState('200')
  const [checkingBalance, setCheckingBalance] = useState('')
  const [savingsBalance, setSavingsBalance] = useState('')
  const [dataMode, setDataMode] = useState<'csv' | 'manual'>('csv')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const { isLoading: authLoading } = useAuth()
  const { updateProfile, updateBalance, getProfile } = useDataAccess()

  // Set default timezone from browser
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (TIMEZONES.includes(detectedTimezone)) {
      setTimezone(detectedTimezone)
    } else {
      setTimezone('America/New_York')
    }
  }, [])

  // Check if already onboarded
  useEffect(() => {
    if (authLoading) return

    async function checkOnboarding() {
      try {
        const profile = await getProfile()
        if (profile?.onboarding_completed) {
          router.push('/app')
        }
      } catch (err) {
        // Profile doesn't exist yet, continue with onboarding
      }
    }

    checkOnboarding()
  }, [authLoading, getProfile, router])

  const handleComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      // Update profile
      await updateProfile({
        timezone,
        currency,
        buffer_cents: parseToCents(buffer),
        onboarding_completed: true,
      })

      // Update balances
      await updateBalance({
        checking_cents: parseToCents(checkingBalance || '0'),
        savings_cents: parseToCents(savingsBalance || '0'),
      })

      router.push('/app')
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to AI Budget Analyzer
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Let&apos;s set up your account in a few quick steps.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-primary-600 text-white'
                  : s < step
                    ? 'bg-primary-200 text-primary-800'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s < step ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                s
              )}
            </div>
            {s < 3 && <div className="w-12 h-1 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 p-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      <div className="card p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Basic Settings</h2>

            <div>
              <label htmlFor="timezone" className="label">
                Your Timezone
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
                This is the minimum amount you want to keep as a cushion. We&apos;ll warn you before
                you dip below this.
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
                  placeholder="200"
                />
              </div>
            </div>

            <button onClick={() => setStep(2)} className="btn-primary w-full">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Current Balances
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your current account balances so we can calculate your safe-to-spend.
            </p>

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
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="savings" className="label">
                Savings Account Balance (optional)
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                This won&apos;t be included in safe-to-spend by default, but you can toggle it on.
              </p>
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
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              How will you add transactions?
            </h2>

            <div className="space-y-3">
              <label
                className={`card p-4 flex items-start gap-4 cursor-pointer border-2 transition-colors ${
                  dataMode === 'csv'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="dataMode"
                  value="csv"
                  checked={dataMode === 'csv'}
                  onChange={() => setDataMode('csv')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">CSV Upload</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Export transactions from your bank and upload them. Works with most banks.
                  </p>
                </div>
              </label>

              <label
                className={`card p-4 flex items-start gap-4 cursor-pointer border-2 transition-colors ${
                  dataMode === 'manual'
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="dataMode"
                  value="manual"
                  checked={dataMode === 'manual'}
                  onChange={() => setDataMode('manual')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Manual Entry</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add your recurring bills and income manually. Quick setup, no imports needed.
                  </p>
                </div>
              </label>

              <div className="card p-4 flex items-start gap-4 opacity-50 cursor-not-allowed border-2 border-transparent">
                <input type="radio" disabled className="mt-1" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Bank Sync (Coming Soon)
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect your bank accounts directly for automatic syncing.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={handleComplete} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Saving...' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
