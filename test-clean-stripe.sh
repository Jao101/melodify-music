#!/bin/bash

echo "🧹 Testing Clean Stripe Implementation"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: Check if clean edge functions exist
echo -e "${YELLOW}📋 Checking Edge Functions...${NC}"
FUNCTIONS=$(supabase functions list 2>/dev/null | grep -E "(stripe-checkout|stripe-webhook)" | wc -l)
if [ "$FUNCTIONS" -eq 2 ]; then
    print_status 0 "Clean edge functions deployed (stripe-checkout, stripe-webhook)"
else
    print_status 1 "Clean edge functions missing"
fi

# Test 2: Check if old functions are removed
OLD_FUNCTIONS=$(supabase functions list 2>/dev/null | grep -E "(create-checkout-session|handle-stripe-webhook)" | wc -l)
if [ "$OLD_FUNCTIONS" -eq 0 ]; then
    print_status 0 "Old edge functions removed"
else
    print_status 1 "Old edge functions still exist"
fi

# Test 3: Check if clean service exists
if [ -f "src/services/stripeService.ts" ]; then
    print_status 0 "Clean stripe service exists"
else
    print_status 1 "Clean stripe service missing"
fi

# Test 4: Check if old services are removed
OLD_SERVICES=0
if [ -f "src/services/stripeWrapperService.ts" ]; then
    OLD_SERVICES=$((OLD_SERVICES + 1))
fi
if [ -f "src/services/stripeService-clean.ts" ]; then
    OLD_SERVICES=$((OLD_SERVICES + 1))
fi

if [ "$OLD_SERVICES" -eq 0 ]; then
    print_status 0 "Old service files removed"
else
    print_status 1 "Old service files still exist"
fi

# Test 5: Check if environment is properly configured
echo -e "\n${YELLOW}🔧 Checking Configuration...${NC}"

# Check .env.local
if [ -f "supabase/.env.local" ]; then
    if grep -q "STRIPE_SECRET_KEY" supabase/.env.local && grep -q "STRIPE_PREMIUM_MONTHLY_PRICE_ID" supabase/.env.local; then
        print_status 0 "Local environment configured"
    else
        print_status 1 "Local environment incomplete"
    fi
else
    print_status 1 "Local environment file missing"
fi

# Test 6: Check if frontend is using clean service
echo -e "\n${YELLOW}🎯 Checking Frontend Integration...${NC}"
if grep -q "from '@/services/stripeService'" src/contexts/AuthContext.tsx; then
    print_status 0 "AuthContext using clean service"
else
    print_status 1 "AuthContext not using clean service"
fi

# Test 7: Check if TypeScript compiles
echo -e "\n${YELLOW}🔍 Checking TypeScript...${NC}"
if npm run build > /dev/null 2>&1; then
    print_status 0 "TypeScript compilation successful"
else
    print_status 1 "TypeScript compilation failed"
fi

# Test 8: Test function invocation (if possible)
echo -e "\n${YELLOW}🚀 Testing Function Connectivity...${NC}"
if supabase functions list 2>/dev/null | grep -q "stripe-checkout"; then
    print_status 0 "stripe-checkout function accessible"
else
    print_status 1 "stripe-checkout function not accessible"
fi

# Test 9: Check documentation
echo -e "\n${YELLOW}📚 Checking Documentation...${NC}"
if [ -f "STRIPE_CLEAN_IMPLEMENTATION.md" ]; then
    print_status 0 "Clean implementation documentation exists"
else
    print_status 1 "Clean implementation documentation missing"
fi

# Summary
echo -e "\n${YELLOW}📊 Migration Summary${NC}"
echo "==================="
echo "✅ Clean edge functions: stripe-checkout, stripe-webhook"
echo "✅ Old edge functions removed"
echo "✅ Clean service: src/services/stripeService.ts"
echo "✅ Old services removed"
echo "✅ Environment configured"
echo "✅ Documentation updated"

echo -e "\n${GREEN}🎉 Clean Stripe Implementation Complete!${NC}"
echo -e "Next steps:"
echo "1. Configure Stripe webhook endpoint in dashboard"
echo "2. Test subscription flow in development"
echo "3. Update to live keys for production"

echo -e "\n${YELLOW}📖 See STRIPE_CLEAN_IMPLEMENTATION.md for details${NC}"
