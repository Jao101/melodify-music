# Stripe Integration Environment Setup

## Required Environment Variables

You need to set these environment variables in your Supabase project:

### In Supabase Dashboard > Settings > Edge Functions > Environment Variables:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret
SITE_URL=https://your-domain.com # Your app's URL

# Price IDs from Stripe Dashboard
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
STRIPE_FAMILY_MONTHLY_PRICE_ID=price_...
STRIPE_FAMILY_YEARLY_PRICE_ID=price_...
```

## Stripe Setup Steps

1. **Create Stripe Account**: Go to https://stripe.com and create an account

2. **Get API Keys**: 
   - Go to Dashboard > Developers > API Keys
   - Copy your Secret Key (starts with `sk_test_`)

3. **Create Products and Prices**:
   - Go to Dashboard > Products
   - Create products for Premium and Family plans
   - Create both monthly and yearly prices for each
   - Copy the price IDs (start with `price_`)

4. **Set up Webhook**:
   - Go to Dashboard > Developers > Webhooks
   - Add endpoint: `https://evsmhffvcdhtgcrthpoh.supabase.co/functions/v1/handle-stripe-webhook`
   - Select events: 
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the webhook secret (starts with `whsec_`)

5. **Update Service Configuration**:
   Update the price IDs in `/src/services/stripeService.ts`:
   ```typescript
   const STRIPE_PRICES = {
     premium: {
       monthly: 'price_your_premium_monthly_id',
       yearly: 'price_your_premium_yearly_id',
     },
     family: {
       monthly: 'price_your_family_monthly_id',
       yearly: 'price_your_family_yearly_id',
     },
   };
   ```

## Testing

1. Use Stripe's test mode
2. Use test card numbers from Stripe docs
3. Monitor webhook calls in Stripe Dashboard

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint to production URL
- [ ] Test all subscription flows
- [ ] Set up proper error monitoring
- [ ] Configure customer support flows
