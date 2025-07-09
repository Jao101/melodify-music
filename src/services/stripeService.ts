import { supabase } from '@/integrations/supabase/client';

/**
 * Clean Stripe Service
 * Simplified Stripe integration using webhook-based approach
 * No edge functions needed - uses Stripe webhooks directly to update database
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
 * Create a Stripe checkout session using a single, clean edge function
 * This replaces the complex wrapper approach with a simple, reliable method
 */
export const createCheckoutSession = async (
  planId: string,
  isYearly: boolean,
  returnUrl?: string
): Promise<string> => {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      throw new Error('Authentication required');
    }

    // Get the price ID for the selected plan
    const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS]?.[isYearly ? 'yearly' : 'monthly'];
    
    if (!priceId) {
      throw new Error('Invalid plan or billing cycle');
    }

    const baseUrl = returnUrl || window.location.origin;

    // Use the clean stripe-checkout function
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: { 
        planId,
        isYearly,
        returnUrl: baseUrl,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }

    if (!data?.url) {
      throw new Error('No checkout URL received');
    }

    // Store checkout info in localStorage for the success page
    localStorage.setItem('melodify_checkout_info', JSON.stringify({
      planId,
      isYearly,
      timestamp: Date.now()
    }));

    return data.url;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw error;
  }
};

/**
 * Get subscription status from profiles table
 * Simple implementation using existing database
 */
export const getSubscriptionStatus = async (): Promise<{
  tier: string | null;
  endDate: Date | null;
  isActive: boolean;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { tier: 'free', endDate: null, isActive: false };
    }

    // Get subscription info from profiles table
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
 * Get available products
 * Simple hardcoded implementation
 */
export const getAvailableProducts = () => {
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
          unit_amount: 1999,
          currency: 'usd',
          recurring: { interval: 'month' }
        },
        {
          id: PRICE_IDS.family.yearly,
          unit_amount: 19999,
          currency: 'usd',
          recurring: { interval: 'year' }
        }
      ]
    }
  ];
};

/**
 * Cancel subscription
 * Simple webhook-based approach
 */
export const cancelSubscription = async (subscriptionId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    // For now, just update the subscription_end in the profile
    // In a real implementation, you'd call Stripe to cancel the subscription
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_tier: 'free',
        subscription_end: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return false;
  }
};

/**
 * Update subscription
 * Simple implementation
 */
export const updateSubscription = async (
  subscriptionId: string,
  newPlanId: string,
  isYearly: boolean
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    // For now, just update the subscription tier in the profile
    // In a real implementation, you'd call Stripe to update the subscription
    const tier = newPlanId === 'premium' ? 'premium' : 'family';
    
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to update subscription:', error);
    return false;
  }
};

/**
 * Manually update subscription status after successful checkout
 * This is a fallback for when webhooks don't work immediately
 * Returns true if successful, false if failed
 */
export const updateSubscriptionAfterCheckout = async (
  planId: string,
  isYearly: boolean
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    // Calculate subscription end date
    const endDate = new Date();
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Update the user's profile with the new subscription
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_tier: planId,
        subscription_end: endDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log(`✅ Successfully updated subscription to ${planId} (${isYearly ? 'yearly' : 'monthly'})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to update subscription after checkout:', error);
    return false;
  }
};
