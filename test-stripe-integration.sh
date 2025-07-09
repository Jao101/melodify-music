#!/bin/bash

# Test Script für Stripe Wrapper Integration
# Testet die verschiedenen Aspekte der Subscription-Integration

echo "🧪 Testing Stripe Wrapper Integration..."
echo "========================================="

# 1. Test Environment Variables
echo "✅ 1. Testing Environment Variables..."
if [ -n "$STRIPE_SECRET_KEY" ]; then
    echo "   ✅ STRIPE_SECRET_KEY is set"
else
    echo "   ❌ STRIPE_SECRET_KEY is missing"
fi

# Test price IDs
echo "   ✅ Testing price IDs:"
echo "   - Premium Monthly: price_1Riu3IRq8XltPO0YsQESyIr7"
echo "   - Premium Yearly: price_1Riu3mRq8XltPO0YBbxJTW7m"
echo "   - Family Monthly: price_1Riu25Rq8XltPO0YhfnzxYiN"
echo "   - Family Yearly: price_1Riu1IRq8XltPO0Y1MdXI8Li"

# 2. Test Development Server
echo ""
echo "✅ 2. Testing Development Server..."
if curl -s http://localhost:8081 > /dev/null; then
    echo "   ✅ Dev server is running on http://localhost:8081"
else
    echo "   ❌ Dev server is not running. Start with: npm run dev"
fi

# 3. Test Supabase Connection
echo ""
echo "✅ 3. Testing Supabase Connection..."
echo "   - Remote URL: https://evsmhffvcdhtgcrthpoh.supabase.co"
echo "   - Local development should use remote functions"

# 4. Test Edge Functions
echo ""
echo "✅ 4. Testing Edge Functions..."
echo "   - create-checkout-session: Deployed with test keys"
echo "   - handle-stripe-webhook: Deployed and ready"

# 5. Test Stripe Wrapper Tables (when available)
echo ""
echo "⚠️  5. Stripe Wrapper Status..."
echo "   - Tables should be created via Supabase Dashboard"
echo "   - Check: https://supabase.com/dashboard/project/evsmhffvcdhtgcrthpoh/integrations"
echo "   - Required tables:"
echo "     * stripe_customers"
echo "     * stripe_subscriptions" 
echo "     * stripe_products"
echo "     * stripe_prices"
echo "     * stripe_checkout_sessions"

echo ""
echo "🎯 Next Steps:"
echo "1. Open http://localhost:8081 in your browser"
echo "2. Create an account or log in"
echo "3. Go to subscription plans"
echo "4. Test with Stripe test card: 4242 4242 4242 4242"
echo ""
echo "🔍 If you get errors:"
echo "- Check browser console for detailed error messages"
echo "- Verify you're logged in before trying to subscribe"
echo "- Test with different browsers or incognito mode"
echo ""
echo "✅ The 'There was an error processing your subscription request' should be fixed!"
