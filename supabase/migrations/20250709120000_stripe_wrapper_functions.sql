-- Migration: Create Stripe Wrapper RPC Functions
-- This enables direct Stripe operations via PostgreSQL functions

-- Create a new migration for Stripe Wrapper support
-- Run this after the Stripe Wrapper is configured in Supabase Dashboard

-- Function to create checkout sessions via Stripe Wrapper
CREATE OR REPLACE FUNCTION create_stripe_checkout_session(
  p_mode TEXT DEFAULT 'subscription',
  p_price_id TEXT DEFAULT NULL,
  p_success_url TEXT DEFAULT NULL,
  p_cancel_url TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_client_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be replaced by actual Stripe Wrapper implementation
  -- For now, it returns a placeholder that triggers fallback to edge functions
  
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate required parameters
  IF p_price_id IS NULL THEN
    RAISE EXCEPTION 'Price ID is required';
  END IF;

  -- When Stripe Wrapper is fully configured, this will create actual Stripe checkout sessions
  -- For now, return NULL to trigger fallback to edge function
  RETURN QUERY SELECT NULL::TEXT;
END;
$$;

-- Function to get user subscription from Stripe
CREATE OR REPLACE FUNCTION get_user_subscription(
  p_user_email TEXT
)
RETURNS TABLE(
  id TEXT,
  customer TEXT,
  status TEXT,
  current_period_start BIGINT,
  current_period_end BIGINT,
  items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- This will query the Stripe Wrapper tables once they're available
  -- For now, return empty result to trigger fallback to profiles table
  RETURN;
END;
$$;

-- Function to get Stripe products
CREATE OR REPLACE FUNCTION get_stripe_products()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- This will query stripe_products table once Stripe Wrapper is configured
  -- For now, return NULL to trigger fallback to hardcoded products
  RETURN NULL;
END;
$$;

-- Function to cancel Stripe subscription
CREATE OR REPLACE FUNCTION cancel_stripe_subscription(
  p_subscription_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- This will use Stripe Wrapper to cancel subscription
  -- For now, return false to indicate not implemented
  RETURN FALSE;
END;
$$;

-- Function to update Stripe subscription
CREATE OR REPLACE FUNCTION update_stripe_subscription(
  p_subscription_id TEXT,
  p_new_price_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- This will use Stripe Wrapper to update subscription
  -- For now, return false to indicate not implemented
  RETURN FALSE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_stripe_checkout_session TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION get_stripe_products TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_stripe_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION update_stripe_subscription TO authenticated;

-- Add RLS policies if needed
-- These functions are already security definer and check auth.uid()

COMMENT ON FUNCTION create_stripe_checkout_session IS 'Creates Stripe checkout session via Stripe Wrapper';
COMMENT ON FUNCTION get_user_subscription IS 'Gets user subscription data from Stripe';
COMMENT ON FUNCTION get_stripe_products IS 'Gets available Stripe products and prices';
COMMENT ON FUNCTION cancel_stripe_subscription IS 'Cancels a Stripe subscription';
COMMENT ON FUNCTION update_stripe_subscription IS 'Updates a Stripe subscription plan';
