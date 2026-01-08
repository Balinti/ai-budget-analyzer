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
    const { priceId } = await request.json()

    // Validate price ID
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    // Verify price ID is one of our configured prices
    const validPriceIds = [
      STRIPE_CONFIG.plusPriceId,
      STRIPE_CONFIG.proPriceId,
    ].filter(Boolean)

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create Stripe customer
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const subscription = subscriptionData as { stripe_customer_id: string | null } | null
    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          app_name: 'ai-budget-analyzer',
        },
      })
      customerId = customer.id

      // Save customer ID to subscription record
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        } as any)
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/app/billing?success=true`,
      cancel_url: `${appUrl}/app/billing?canceled=true`,
      metadata: {
        app_name: 'ai-budget-analyzer',
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          app_name: 'ai-budget-analyzer',
          user_id: user.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
