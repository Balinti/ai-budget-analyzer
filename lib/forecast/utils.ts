import type { PlanTier, Subscription } from '@/types/database'

// Determine plan tier from subscription status and price ID
export function getPlanTier(subscription: Subscription | null): PlanTier {
  if (!subscription) return 'free'

  const activeStatuses = ['active', 'trialing']
  if (!subscription.status || !activeStatuses.includes(subscription.status)) {
    return 'free'
  }

  const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
  const plusPriceId = process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID

  if (proPriceId && subscription.price_id === proPriceId) return 'pro'
  if (plusPriceId && subscription.price_id === plusPriceId) return 'plus'

  // If subscribed but price ID doesn't match known tiers, treat as plus
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return 'plus'
  }

  return 'free'
}

// Format cents as currency string
export function formatCents(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

// Parse currency string back to cents
export function parseToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

// Get currency symbol
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    JPY: '¥',
  }
  return symbols[currency] || currency
}

// Common currencies list
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
]

// Common timezones list
export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

// Cadence display names
export const CADENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  unknown: 'Unknown',
}

// Risk level colors for UI
export const RISK_COLORS = {
  none: { bg: 'bg-primary-100', text: 'text-primary-800', border: 'border-primary-200' },
  low: { bg: 'bg-warning-100', text: 'text-warning-800', border: 'border-warning-200' },
  medium: { bg: 'bg-warning-200', text: 'text-warning-900', border: 'border-warning-300' },
  high: { bg: 'bg-danger-100', text: 'text-danger-800', border: 'border-danger-200' },
}

// Calculate days until date
export function daysUntil(date: Date | string): number {
  const target = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
