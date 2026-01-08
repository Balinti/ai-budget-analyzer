'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPlanTier, formatCents } from '@/lib/forecast/utils'
import type { Subscription } from '@/types/database'
import { format } from 'date-fns'

const PLUS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID
const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
const HAS_STRIPE = !!(PLUS_PRICE_ID || PRO_PRICE_ID)

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [managingPortal, setManagingPortal] = useState(false)

  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const supabase = createClient()

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSubscription(data)
    } catch (error) {
      console.error('Failed to load subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (priceId: string) => {
    setUpgrading(priceId)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  const handleManageSubscription = async () => {
    setManagingPortal(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      // Redirect to Stripe Billing Portal
      window.location.href = data.url
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setManagingPortal(false)
    }
  }

  const tier = getPlanTier(subscription)
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // If Stripe is not configured, show a simple message
  if (!HAS_STRIPE) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Billing
        </h1>
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            You&apos;re on the Free Plan
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Premium plans are not currently available. Enjoy all the free features!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Billing
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your subscription and billing
        </p>
      </div>

      {/* Success/Canceled messages */}
      {success && (
        <div className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium">Subscription successful!</p>
              <p className="text-sm">Thank you for upgrading. Your new features are now available.</p>
            </div>
          </div>
        </div>
      )}

      {canceled && (
        <div className="bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 p-4 rounded-lg">
          <p>Checkout was canceled. No charges were made.</p>
        </div>
      )}

      {/* Current Plan */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current Plan
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {tier}
            </p>
            {isActive && subscription?.current_period_end && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subscription.cancel_at_period_end
                  ? `Cancels on ${format(new Date(subscription.current_period_end), 'MMM d, yyyy')}`
                  : `Renews on ${format(new Date(subscription.current_period_end), 'MMM d, yyyy')}`}
              </p>
            )}
          </div>

          {isActive && (
            <button
              onClick={handleManageSubscription}
              disabled={managingPortal}
              className="btn-secondary"
            >
              {managingPortal ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}
        </div>

        {/* Plan features */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your features:
          </h3>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {tier === 'free' ? '7-day' : tier === 'plus' ? '30-day' : '60-day'} forecast horizon
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {tier === 'free' ? 'Up to 5' : tier === 'plus' ? 'Up to 20' : 'Unlimited'} bills & income
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              CSV transaction import
            </li>
            {tier !== 'free' && (
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Income gap warnings
              </li>
            )}
            {tier === 'pro' && (
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Multiple budget plans
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Upgrade Options */}
      {tier === 'free' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upgrade Your Plan
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Plus Plan */}
            {PLUS_PRICE_ID && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Plus</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  $5<span className="text-lg font-normal text-gray-500">/mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    30-day forecast
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Up to 20 bills/income
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Income gap warnings
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgrade(PLUS_PRICE_ID)}
                  disabled={upgrading === PLUS_PRICE_ID}
                  className="btn-primary w-full mt-6"
                >
                  {upgrading === PLUS_PRICE_ID ? 'Loading...' : 'Upgrade to Plus'}
                </button>
              </div>
            )}

            {/* Pro Plan */}
            {PRO_PRICE_ID && (
              <div className="border-2 border-primary-600 rounded-lg p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-600 text-white text-xs px-3 py-1 rounded-full">Best Value</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Pro</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  $12<span className="text-lg font-normal text-gray-500">/mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    60-day forecast
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Unlimited bills/income
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Multiple budget plans
                  </li>
                </ul>
                <button
                  onClick={() => handleUpgrade(PRO_PRICE_ID)}
                  disabled={upgrading === PRO_PRICE_ID}
                  className="btn-primary w-full mt-6"
                >
                  {upgrading === PRO_PRICE_ID ? 'Loading...' : 'Upgrade to Pro'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Can I cancel anytime?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Yes! You can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              What happens to my data if I downgrade?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Your data is safe. You&apos;ll just lose access to premium features like longer forecasts. Bills over the limit will still be saved but won&apos;t appear in forecasts.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Is my payment information secure?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Absolutely. We use Stripe for payment processing and never store your card details on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
