-- AI Budget Analyzer Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE anchor_type AS ENUM ('bill', 'income');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE anchor_cadence AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_source AS ENUM ('csv', 'manual', 'bank_sync');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('none', 'low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    currency TEXT NOT NULL DEFAULT 'USD',
    buffer_cents BIGINT NOT NULL DEFAULT 20000, -- $200 default
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual balances table (user-entered current balances)
CREATE TABLE IF NOT EXISTS manual_balances (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    checking_cents BIGINT NOT NULL DEFAULT 0,
    savings_cents BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table (from CSV uploads or manual entry)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    txn_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount_cents BIGINT NOT NULL, -- negative for expenses, positive for income
    account TEXT,
    pending BOOLEAN NOT NULL DEFAULT false,
    source transaction_source NOT NULL DEFAULT 'csv',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_description ON transactions(user_id, description);

-- Anchors table (recurring bills and income)
CREATE TABLE IF NOT EXISTS anchors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type anchor_type NOT NULL,
    name TEXT NOT NULL,
    cadence anchor_cadence NOT NULL DEFAULT 'monthly',
    due_day INT, -- day of month (1-31) or day of week (0-6) for weekly
    next_due_date DATE,
    amount_min_cents BIGINT NOT NULL,
    amount_max_cents BIGINT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT true,
    variable BOOLEAN NOT NULL DEFAULT false,
    confirmed BOOLEAN NOT NULL DEFAULT false,
    last_matched_txn_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anchors_user ON anchors(user_id);
CREATE INDEX IF NOT EXISTS idx_anchors_user_confirmed ON anchors(user_id, confirmed);

-- Forecasts table (computed projections)
CREATE TABLE IF NOT EXISTS forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    projected_balance_cents BIGINT NOT NULL,
    safe_to_spend_cents BIGINT NOT NULL,
    risk_level risk_level NOT NULL DEFAULT 'none',
    explanation JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_user_date ON forecasts(user_id, forecast_date);

-- Subscriptions table (Stripe subscription state)
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status subscription_status,
    price_id TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for manual_balances
CREATE POLICY "Users can view own balances"
    ON manual_balances FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balances"
    ON manual_balances FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balances"
    ON manual_balances FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for anchors
CREATE POLICY "Users can view own anchors"
    ON anchors FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own anchors"
    ON anchors FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own anchors"
    ON anchors FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own anchors"
    ON anchors FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for forecasts
CREATE POLICY "Users can view own forecasts"
    ON forecasts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own forecasts"
    ON forecasts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forecasts"
    ON forecasts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own forecasts"
    ON forecasts FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for subscriptions
-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own subscription (initial setup)
CREATE POLICY "Users can insert own subscription"
    ON subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can update any subscription (for webhooks)
-- Note: This policy allows the service role key to update subscriptions
-- The service role bypasses RLS, so this is handled by using the service role key in webhooks

-- Function to automatically create profile and balance records on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id)
    VALUES (NEW.id);

    INSERT INTO public.manual_balances (user_id)
    VALUES (NEW.id);

    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_manual_balances_updated_at ON manual_balances;
CREATE TRIGGER update_manual_balances_updated_at
    BEFORE UPDATE ON manual_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_anchors_updated_at ON anchors;
CREATE TRIGGER update_anchors_updated_at
    BEFORE UPDATE ON anchors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
