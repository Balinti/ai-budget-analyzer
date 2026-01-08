import Stripe from 'stripe'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null

export const STRIPE_CONFIG = {
  isConfigured: !!process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
  plusPriceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID,
  proPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  hasPriceIds: !!(process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID),
}

export function getStripeOrThrow(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }
  return stripe
}
