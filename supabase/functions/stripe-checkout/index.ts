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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Authentication required')
    }

    // Parse request body
    const { planId, isYearly, returnUrl } = await req.json()

    // Price mapping
    const priceIds = {
      premium: {
        monthly: Deno.env.get('STRIPE_PREMIUM_MONTHLY_PRICE_ID'),
        yearly: Deno.env.get('STRIPE_PREMIUM_YEARLY_PRICE_ID'),
      },
      family: {
        monthly: Deno.env.get('STRIPE_FAMILY_MONTHLY_PRICE_ID'),
        yearly: Deno.env.get('STRIPE_FAMILY_YEARLY_PRICE_ID'),
      },
    }

    const priceId = priceIds[planId as keyof typeof priceIds]?.[isYearly ? 'yearly' : 'monthly']
    if (!priceId) {
      throw new Error('Invalid plan or billing cycle')
    }

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'customer_email': user.email!,
        'client_reference_id': user.id,
        'success_url': `${returnUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${returnUrl}/subscription-cancel`,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'metadata[user_id]': user.id,
        'metadata[plan_id]': planId,
        'metadata[is_yearly]': isYearly.toString(),
      }),
    })

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text()
      console.error('Stripe API error:', errorText)
      throw new Error('Failed to create checkout session')
    }

    const session = await stripeResponse.json()

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
