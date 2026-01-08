'use client'

import { STRIPE_CONFIG } from './config'

export function getStripePublishableKey(): string | null {
  return STRIPE_CONFIG.publishableKey || null
}

export function isStripeConfigured(): boolean {
  return STRIPE_CONFIG.isConfigured
}

export function hasPriceIds(): boolean {
  return STRIPE_CONFIG.hasPriceIds
}
