import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeOrThrow, STRIPE_CONFIG } from '@/lib/stripe/config'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!STRIPE_CONFIG.isConfigured) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 400 }
      )
    }

    const stripe = getStripeOrThrow()

    // Get authenticated user
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get Stripe customer ID
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const subscription = subscriptionData as { stripe_customer_id: string | null } | null

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 400 }
      )
    }

    // Create billing portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/app/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
