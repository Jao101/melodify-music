import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured')
    }

    // Import Stripe
    const Stripe = (await import('https://esm.sh/stripe@12.18.0')).default
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Verify webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id
        const planId = session.metadata?.plan_id
        const isYearly = session.metadata?.is_yearly === 'true'

        if (userId && planId) {
          // Update user profile with subscription info
          await supabase
            .from('profiles')
            .update({
              subscription_tier: planId,
              subscription_end: null, // Will be set when we get subscription.created
              stripe_customer_id: session.customer,
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          // Calculate subscription end date
          const endDate = new Date(subscription.current_period_end * 1000)
          
          // Determine tier from price ID
          const priceId = subscription.items.data[0]?.price.id
          let tier = 'free'
          
          if (priceId === Deno.env.get('STRIPE_PREMIUM_MONTHLY_PRICE_ID') || 
              priceId === Deno.env.get('STRIPE_PREMIUM_YEARLY_PRICE_ID')) {
            tier = 'premium'
          } else if (priceId === Deno.env.get('STRIPE_FAMILY_MONTHLY_PRICE_ID') || 
                     priceId === Deno.env.get('STRIPE_FAMILY_YEARLY_PRICE_ID')) {
            tier = 'family'
          }

          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_end: endDate.toISOString(),
            })
            .eq('id', profile.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_end: new Date().toISOString(),
            })
            .eq('id', profile.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
