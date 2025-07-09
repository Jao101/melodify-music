import { supabase } from '@/integrations/supabase/client';

/**
 * Pure Stripe Wrapper Service
 * Uses Supabase Stripe Wrapper for all Stripe operations
 * Clean implementation without edge function fallbacks
 */

// Price ID mapping for easy reference
const PRICE_IDS = {
  premium: {
    monthly: 'price_1Riu3IRq8XltPO0YsQESyIr7',
    yearly: 'price_1Riu3mRq8XltPO0YBbxJTW7m',
  },
  family: {
    monthly: 'price_1Riu25Rq8XltPO0YhfnzxYiN',
    yearly: 'price_1Riu1IRq8XltPO0Y1MdXI8Li',
  },
};

/**
 * Create a Stripe checkout session using pure Stripe Wrapper
 * Clean implementation using only Supabase Stripe foreign data wrapper
 */
export const createCheckoutSessionWrapper = async (
  planId: string,
  isYearly: boolean,
  returnUrl?: string
): Promise<string | null> => {
  try {
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User not authenticated');
      throw new Error('Authentication required');
    }

    // Get the price ID for the selected plan
    const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS]?.[isYearly ? 'yearly' : 'monthly'];
    
    if (!priceId) {
      throw new Error('Invalid plan or billing cycle');
    }

    const baseUrl = returnUrl || window.location.origin;

    // Create checkout session using Stripe foreign data wrapper
    const { data, error } = await supabase
      .from('stripe_checkout_sessions')
      .insert({
        mode: 'subscription',
        customer_email: user.email,
        client_reference_id: user.id,
        success_url: `${baseUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription-cancel`,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          }
        ],
        metadata: {
          user_id: user.id,
          plan_id: planId,
          is_yearly: isYearly.toString()
        }
      })
      .select('url')
      .single();

    if (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }

    return data?.url || null;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw error;
  }
};

/**
 * Fallback to edge function if Stripe Wrapper is not available
 * This provides backward compatibility during migration
 */
const createCheckoutSessionFallback = async (
  planId: string,
  isYearly: boolean,
  returnUrl?: string
): Promise<string | null> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('User not authenticated for fallback');
      return null;
    }

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { 
        planId,
        isYearly,
        returnUrl: returnUrl || window.location.origin,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error with fallback edge function:', error);
      return null;
    }

    return data?.url || null;
  } catch (error) {
    console.error('Fallback edge function failed:', error);
    return null;
  }
};

/**
 * Get subscription status using Stripe Wrapper with fallback
 */
export const getSubscriptionStatusWrapper = async (): Promise<{
  tier: string | null;
  endDate: Date | null;
  isActive: boolean;
  subscription?: any;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { tier: 'free', endDate: null, isActive: false };
    }

    // Try to get subscription from Stripe Wrapper first
    try {
      const { data: subscription, error } = await supabase.rpc('get_user_subscription', {
        p_user_email: user.email
      });

      if (!error && subscription) {
        const tier = determineTierFromSubscription(subscription);
        const endDate = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000) 
          : null;
        const isActive = ['active', 'trialing'].includes(subscription.status);

        return { tier, endDate, isActive, subscription };
      }
    } catch (wrapperError) {
      console.log('Stripe Wrapper not available, falling back to profiles table');
    }

    // Fallback to profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_end')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { tier: 'free', endDate: null, isActive: false };
    }

    const tier = profile?.subscription_tier || 'free';
    const endDate = profile?.subscription_end ? new Date(profile.subscription_end) : null;
    const isActive = tier !== 'free' && (!endDate || endDate > new Date());

    return { tier, endDate, isActive };
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    return { tier: 'free', endDate: null, isActive: false };
  }
};

/**
 * Determine subscription tier from Stripe subscription data
 */
const determineTierFromSubscription = (subscription: any): string => {
  if (!subscription.items || subscription.items.length === 0) {
    return 'free';
  }

  const priceId = subscription.items[0].price_id;
  
  // Check if it's a premium plan
  if (Object.values(PRICE_IDS.premium).includes(priceId)) {
    return 'premium';
  }
  // Check if it's a family plan
  else if (Object.values(PRICE_IDS.family).includes(priceId)) {
    return 'family';
  }

  return 'free';
};

/**
 * Get all available products and prices from Stripe Wrapper
 */
export const getAvailableProducts = async () => {
  try {
    // Try to get products from Stripe Wrapper
    const { data: products, error } = await supabase.rpc('get_stripe_products');

    if (!error && products) {
      return products;
    }

    // Fallback to hardcoded product data
    console.log('Stripe Wrapper not available, using fallback product data');
    return getFallbackProducts();
  } catch (error) {
    console.error('Failed to get available products:', error);
    return getFallbackProducts();
  }
};

/**
 * Fallback product data when Stripe Wrapper is not available
 */
const getFallbackProducts = () => {
  return [
    {
      id: 'premium',
      name: 'Premium Plan',
      description: 'Unlimited music with premium features',
      prices: [
        {
          id: PRICE_IDS.premium.monthly,
          unit_amount: 999,
          currency: 'usd',
          recurring: { interval: 'month' }
        },
        {
          id: PRICE_IDS.premium.yearly,
          unit_amount: 9999,
          currency: 'usd',
          recurring: { interval: 'year' }
        }
      ]
    },
    {
      id: 'family',
      name: 'Family Plan',
      description: 'Premium for the whole family',
      prices: [
        {
          id: PRICE_IDS.family.monthly,
          unit_amount: 1499,
          currency: 'usd',
          recurring: { interval: 'month' }
        },
        {
          id: PRICE_IDS.family.yearly,
          unit_amount: 14999,
          currency: 'usd',
          recurring: { interval: 'year' }
        }
      ]
    }
  ];
};

/**
 * Check if user has access to a specific feature based on their subscription
 */
export const hasFeatureAccess = async (feature: string): Promise<boolean> => {
  const { tier, isActive } = await getSubscriptionStatusWrapper();
  
  if (!isActive || tier === 'free') {
    // Free tier permissions
    const freeFeatures = ['basic_streaming', 'limited_ai_songs'];
    return freeFeatures.includes(feature);
  }

  if (tier === 'premium') {
    const premiumFeatures = [
      'basic_streaming', 
      'unlimited_ai_songs', 
      'offline_downloads', 
      'premium_audio', 
      'unlimited_skips'
    ];
    return premiumFeatures.includes(feature);
  }

  if (tier === 'family') {
    const familyFeatures = [
      'basic_streaming', 
      'unlimited_ai_songs', 
      'offline_downloads', 
      'premium_audio', 
      'unlimited_skips',
      'family_sharing',
      'parental_controls'
    ];
    return familyFeatures.includes(feature);
  }

  return false;
};

/**
 * Get price information for display
 */
export const getPriceInfo = (planId: string, isYearly: boolean) => {
  const prices = {
    premium: { monthly: 9.99, yearly: 99.99 },
    family: { monthly: 14.99, yearly: 149.99 }
  };

  const planPrices = prices[planId as keyof typeof prices];
  if (!planPrices) return null;

  const price = isYearly ? planPrices.yearly : planPrices.monthly;
  const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS]?.[isYearly ? 'yearly' : 'monthly'];

  return {
    amount: price,
    currency: 'USD',
    interval: isYearly ? 'year' : 'month',
    priceId
  };
};

/**
 * Cancel a subscription using Stripe Wrapper
 */
export const cancelSubscription = async (subscriptionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('cancel_stripe_subscription', {
      p_subscription_id: subscriptionId
    });

    if (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return false;
  }
};

/**
 * Update subscription plan using Stripe Wrapper
 */
export const updateSubscriptionPlan = async (
  subscriptionId: string, 
  newPriceId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('update_stripe_subscription', {
      p_subscription_id: subscriptionId,
      p_new_price_id: newPriceId
    });

    if (error) {
      console.error('Error updating subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return false;
  }
};
