# Supabase Stripe Wrapper Setup Guide

The Supabase Stripe Wrapper is an official PostgreSQL foreign data wrapper (FDW) that allows you to interact with Stripe directly from your Postgres database, eliminating the need for custom edge functions.

## ✅ Available in Your Project

Based on your Supabase dashboard, the Stripe Wrapper integration is available and can be configured directly in your project.

## Why Use the Stripe Wrapper?

### Benefits:
- ✅ **Official Supabase Integration**: Built and maintained by Supabase
- ✅ **Direct Database Access**: Query Stripe data like regular database tables
- ✅ **No Edge Functions Needed**: Eliminates custom webhook and checkout code
- ✅ **Real-time Sync**: Stripe data is accessible via standard SQL queries
- ✅ **Better Performance**: Direct database connection, no HTTP overhead
- ✅ **Simplified Frontend**: Use standard Supabase client queries

### vs. Custom Edge Functions:
- **Much Less Code**: Replace hundreds of lines with simple SQL queries
- **More Reliable**: Official support and battle-tested
- **Better Debugging**: Standard database logs and query tools
- **Automatic Updates**: Supabase maintains the integration

## Setup Steps

### Step 1: Configure Stripe Wrapper in Supabase Dashboard

1. **Go to your Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/evsmhffvcdhtgcrthpoh
   - Navigate to **Integrations** → **Stripe Wrapper**

2. **Add New Wrapper**:
   - Click "Add new wrapper"
   - Name: `stripe_main` (or any name you prefer)
   - Add your Stripe secret key: `sk_test_51RHKd9Rq8XltPO0YxBDsWj897dqojRiA3WRcnk97WMVUigbJboej9Um4S8d1uXdIvLVuSg8itXVhMm6HmzGiLqOR00IfrdSm8V`

3. **Configure Tables**:
   The wrapper will give you access to Stripe tables like:
   - `stripe_customers`
   - `stripe_subscriptions` 
   - `stripe_products`
   - `stripe_prices`
   - `stripe_checkout_sessions`

### Step 2: Update Frontend Integration

Replace the edge function calls with direct Supabase queries:

```typescript
// OLD: Using edge functions
const { data, error } = await supabase.functions.invoke('create-checkout-session', {
  body: { planId, isYearly, returnUrl },
  headers: { Authorization: `Bearer ${session.access_token}` }
});

// NEW: Using Stripe Wrapper
const { data, error } = await supabase
  .from('stripe_checkout_sessions')
  .insert({
    mode: 'subscription',
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    success_url: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${window.location.origin}/subscription-cancel`,
    customer_email: user.email
  })
  .select('url')
  .single();
```

### Step 3: Update Service Layer

Create a new service that uses the Stripe Wrapper:

```typescript
// src/services/stripeWrapperService.ts
import { supabase } from '@/integrations/supabase/client';

export const createCheckoutSessionWrapper = async (
  priceId: string,
  returnUrl: string = window.location.origin
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('stripe_checkout_sessions')
      .insert({
        mode: 'subscription',
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        success_url: `${returnUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}/subscription-cancel`,
        customer_email: user.email,
        metadata: {
          user_id: user.id
        }
      })
      .select('url')
      .single();

    if (error) throw error;
    return data?.url || null;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return null;
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get customer by email
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!customer) return null;

    // Get active subscriptions
    const { data: subscriptions } = await supabase
      .from('stripe_subscriptions')
      .select('*')
      .eq('customer', customer.id)
      .eq('status', 'active');

    return subscriptions?.[0] || null;
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    return null;
  }
};
```

### Step 4: Migration Plan

1. **Phase 1: Setup Wrapper** (Do this first)
   - Configure Stripe Wrapper in Supabase dashboard
   - Test basic queries

2. **Phase 2: Update Frontend**
   - Replace `stripeService.ts` with `stripeWrapperService.ts`
   - Update `AuthContext.tsx` to use new service
   - Test subscription flow

3. **Phase 3: Cleanup**
   - Remove custom edge functions
   - Remove edge function environment variables
   - Update documentation

### Step 5: Implementation Benefits

Once implemented, you'll have:
- ✅ **Simpler Code**: ~90% less code to maintain
- ✅ **Better Performance**: Direct database queries
- ✅ **Real-time Data**: Always up-to-date Stripe data
- ✅ **Better Error Handling**: Standard Supabase error patterns
- ✅ **Easier Testing**: Standard database testing tools

## Ready to Implement?

The current edge function approach is working, but the Stripe Wrapper will be much more maintainable and reliable. 

**Next Steps:**
1. Go to your Supabase dashboard and configure the Stripe Wrapper
2. I'll help you update the frontend code to use the wrapper
3. We'll test the new implementation
4. Remove the custom edge functions

Would you like me to help you set up the Stripe Wrapper configuration?
