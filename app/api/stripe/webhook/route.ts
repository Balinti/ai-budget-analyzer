import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // Always return 200 to acknowledge receipt
  // This webhook may be called by n8n as the source

  try {
    if (!stripe) {
      console.log('Stripe not configured, skipping webhook processing')
      return NextResponse.json({ received: true })
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event: Stripe.Event

    // Verify signature only if webhook secret exists
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err) {
        console.error('Webhook signature verification failed:', err)
        // Still return 200 to prevent retries
        return NextResponse.json({ received: true })
      }
    } else {
      // Parse event without verification
      try {
        event = JSON.parse(body) as Stripe.Event
      } catch {
        console.error('Failed to parse webhook body')
        return NextResponse.json({ received: true })
      }
    }

    // Get service client for database updates
    const supabase = createServiceClient()

    // Process relevant events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Only process if from our app
        if (session.metadata?.app_name !== 'ai-budget-analyzer') {
          console.log('Ignoring webhook from different app')
          break
        }

        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionData = await stripe.subscriptions.retrieve(
            session.subscription as string
          ) as any

          const userId = session.metadata?.user_id

          if (userId) {
            await supabase.from('subscriptions').upsert({
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionData.id,
              status: subscriptionData.status,
              price_id: subscriptionData.items?.data?.[0]?.price?.id,
              current_period_end: subscriptionData.current_period_end
                ? new Date(subscriptionData.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
              updated_at: new Date().toISOString(),
            } as any)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any

        // Only process if from our app
        if (subscription.metadata?.app_name !== 'ai-budget-analyzer') {
          console.log('Ignoring webhook from different app')
          break
        }

        const userId = subscription.metadata?.user_id

        if (userId) {
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            price_id: subscription.items?.data?.[0]?.price?.id,
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            updated_at: new Date().toISOString(),
          } as any)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any

        // Only process if from our app
        if (subscription.metadata?.app_name !== 'ai-budget-analyzer') {
          console.log('Ignoring webhook from different app')
          break
        }

        const userId = subscription.metadata?.user_id

        if (userId) {
          await (supabase.from('subscriptions') as any).update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Always return 200 to prevent retries
    return NextResponse.json({ received: true })
  }
}

// Disable body parsing to get raw body for signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
