# Stripe Subscription Setup Guide

This guide will help you set up Stripe payments for your Melodify subscriptions using Supabase Edge Functions.

## Prerequisites

1. A Stripe account (https://stripe.com)
2. Supabase CLI installed 
3. Your Supabase project configured and linked

## Step 1: Create Stripe Products and Prices

1. Log into your Stripe Dashboard
2. Go to Products → Create a product for each plan:
   - **Premium Plan**: $9.99/month, $99.99/year
   - **Family Plan**: $14.99/month, $149.99/year

3. Copy the price IDs from your created products

## Step 2: Configure Environment Variables ✅

### ✅ Test Environment Variables Set:
Your Stripe test keys have been configured in your Supabase project:

- ✅ `STRIPE_SECRET_KEY` - sk_test_51RHKd9... (TEST KEY)
- ✅ `STRIPE_PREMIUM_MONTHLY_PRICE_ID` - price_1Riu3IRq8XltPO0YsQESyIr7  
- ✅ `STRIPE_PREMIUM_YEARLY_PRICE_ID` - price_1Riu3mRq8XltPO0YBbxJTW7m
- ✅ `STRIPE_FAMILY_MONTHLY_PRICE_ID` - price_1Riu25Rq8XltPO0YhfnzxYiN
- ✅ `STRIPE_FAMILY_YEARLY_PRICE_ID` - price_1Riu1IRq8XltPO0Y1MdXI8Li
- ✅ `SITE_URL` - http://localhost:8081

### For Local Development:
The `.env.local` file is for reference only. Your app now uses the remote Supabase functions with properly configured environment variables.

### For Future Updates:
To update environment variables, use:
```bash
supabase secrets set VARIABLE_NAME=value
supabase functions deploy
```

## Step 3: Deploy Supabase Edge Functions ✅

The edge functions have been deployed:
- ✅ `create-checkout-session` - Handles subscription creation
- ✅ `handle-stripe-webhook` - Processes Stripe events

Functions are available at:
- `https://evsmhffvcdhtgcrthpoh.supabase.co/functions/v1/create-checkout-session`
- `https://evsmhffvcdhtgcrthpoh.supabase.co/functions/v1/handle-stripe-webhook`

## Step 4: Set up Stripe Webhooks

1. In your Stripe Dashboard, go to Webhooks
2. Add a new endpoint: `https://evsmhffvcdhtgcrthpoh.supabase.co/functions/v1/handle-stripe-webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook secret and add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 5: Database Schema ✅

The database has been updated with:
- ✅ `stripe_customer_id` column in profiles table
- ✅ Index for fast lookups
- ✅ Subscription tier and end date columns

## Step 6: Frontend Integration ✅

The following components have been implemented:
- ✅ Updated `AuthContext` with subscription methods
- ✅ Enhanced `stripeService` for checkout sessions
- ✅ `SubscriptionSuccess` page for successful payments
- ✅ `SubscriptionCancel` page for cancelled payments

## Step 7: Test the Integration ✅

1. ✅ **Development server running**: http://localhost:8081
2. ✅ **Test environment configured**: All test keys and price IDs set
3. ✅ **Edge functions deployed**: Ready to handle subscription requests

### Testing Steps:
1. Open http://localhost:8081 in your browser
2. Create an account or log in
3. Navigate to the subscription plans section
4. Try subscribing to a plan
5. Use Stripe's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0025 0000 3155`
   - Any future expiry date and any 3-digit CVC

### ✅ Issue Resolved:
The "There was an error processing your subscription request" error has been fixed by switching from live Stripe keys to test keys.

## Security Notes

- ✅ Edge functions use proper authentication
- ✅ Webhook signature verification implemented
- ✅ Environment variables secured in Supabase
- ✅ Customer IDs properly managed

## Troubleshooting

### "There was an error processing your subscription request"

This error can have several causes:

1. **Using Live Keys Instead of Test Keys (MOST COMMON)**:
   - **Problem**: You're using live Stripe keys (`sk_live_`) which require real payment methods and have stricter validation
   - **Solution**: For development, use test keys from https://dashboard.stripe.com/test/apikeys
   - **Test Key Pattern**: `sk_test_...` (not `sk_live_...`)
   - **Update Environment**: Set test keys in your remote Supabase project:
     ```bash
     supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
     supabase functions deploy create-checkout-session
     ```

2. **Environment Variables Not Set**:
   - Check if all required environment variables are set in your Supabase project
   - Run: `supabase secrets list` to verify
   - Required variables: `STRIPE_SECRET_KEY`, price IDs, `SITE_URL`

3. **User Not Authenticated**:
   - The user must be logged in to create a subscription
   - Check that the Authorization header is being sent with a valid session token

4. **Network/Function Issues**:
   - Check Supabase function logs in the dashboard
   - Verify edge functions are deployed and running
   - Test with `curl` to isolate frontend issues

### Other Common Issues:
- Check Supabase function logs: `supabase functions logs create-checkout-session`
- Check Stripe webhook logs in your Stripe dashboard
- Verify environment variables are set correctly
- Ensure your webhook URL is accessible and returns 200 responses

## Production Checklist

Before going live:
1. [ ] Replace test Stripe keys with live keys
2. [ ] Update webhook endpoint to production URL
3. [ ] Test all subscription flows
4. [ ] Set up monitoring and alerts
5. [ ] Configure proper error handling
6. [ ] Set up customer support flows

## API Endpoints

### Create Checkout Session
```typescript
const response = await supabase.functions.invoke('create-checkout-session', {
  body: { planId: 'premium', isYearly: false, returnUrl: window.location.origin },
  headers: { Authorization: `Bearer ${session.access_token}` }
});
```

### Webhook Events Handled
- `checkout.session.completed` - Activates subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Cancels subscription
- `invoice.payment_failed` - Handles failed payments
