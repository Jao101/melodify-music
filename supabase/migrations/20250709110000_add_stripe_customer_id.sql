-- Add Stripe customer ID to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx ON public.profiles(stripe_customer_id);

-- Add comment to the column
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID for subscription management';
