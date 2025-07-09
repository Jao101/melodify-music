import { supabase } from '@/integrations/supabase/client';

/**
 * Get checkout session details from Stripe to determine the correct subscription
 * This ensures we have the exact same information that Stripe webhooks will use
 */
export const getCheckoutSessionDetails = async (sessionId: string) => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      throw new Error('Authentication required');
    }

    // Call a simple edge function to get session details from Stripe
    const { data, error } = await supabase.functions.invoke('stripe-checkout-details', {
      body: { sessionId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error getting checkout session details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get checkout session details:', error);
    return null;
  }
};

/**
 * Smart subscription update that uses Stripe session data
 * This ensures consistency with webhook processing
 */
export const updateSubscriptionFromSession = async (sessionId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get session details from Stripe
    const sessionDetails = await getCheckoutSessionDetails(sessionId);
    if (!sessionDetails) {
      console.log('Could not get session details, falling back to localStorage method');
      return false;
    }

    // Extract subscription info from session
    const { customer, subscription, metadata } = sessionDetails;
    const planId = metadata?.plan_id || 'premium';
    const isYearly = metadata?.is_yearly === 'true';

    // Calculate subscription end date based on billing cycle
    const endDate = new Date();
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Update the user's profile with exact session data
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_tier: planId,
        subscription_end: endDate.toISOString(),
        stripe_customer_id: customer || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating subscription from session:', error);
      throw error;
    }

    console.log(`Successfully updated subscription from session: ${planId} (${isYearly ? 'yearly' : 'monthly'})`);
    return true;
  } catch (error) {
    console.error('Failed to update subscription from session:', error);
    return false;
  }
};
