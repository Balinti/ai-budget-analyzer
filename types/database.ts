export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AnchorType = 'bill' | 'income'
export type AnchorCadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'unknown'
export type TransactionSource = 'csv' | 'manual' | 'bank_sync'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'
export type PlanTier = 'free' | 'plus' | 'pro'

export interface Profile {
  user_id: string
  timezone: string
  currency: string
  buffer_cents: number
  created_at: string
  onboarding_completed: boolean
}

export interface ManualBalance {
  user_id: string
  checking_cents: number
  savings_cents: number
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  txn_date: string
  description: string
  amount_cents: number
  account: string | null
  pending: boolean
  source: TransactionSource
  created_at: string
}

export interface Anchor {
  id: string
  user_id: string
  type: AnchorType
  name: string
  cadence: AnchorCadence
  due_day: number | null
  next_due_date: string | null
  amount_min_cents: number
  amount_max_cents: number
  required: boolean
  variable: boolean
  confirmed: boolean
  last_matched_txn_id: string | null
  created_at: string
  updated_at: string
}

export interface Forecast {
  id: string
  user_id: string
  forecast_date: string
  projected_balance_cents: number
  safe_to_spend_cents: number
  risk_level: 'none' | 'low' | 'medium' | 'high'
  explanation: Json
  created_at: string
}

export interface Subscription {
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus | null
  price_id: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'user_id' | 'created_at'>>
      }
      manual_balances: {
        Row: ManualBalance
        Insert: ManualBalance
        Update: Partial<Omit<ManualBalance, 'user_id'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at'>
        Update: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>
      }
      anchors: {
        Row: Anchor
        Insert: Omit<Anchor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Anchor, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      forecasts: {
        Row: Forecast
        Insert: Omit<Forecast, 'id' | 'created_at'>
        Update: Partial<Omit<Forecast, 'id' | 'user_id' | 'created_at'>>
      }
      subscriptions: {
        Row: Subscription
        Insert: Subscription
        Update: Partial<Omit<Subscription, 'user_id'>>
      }
    }
  }
}
