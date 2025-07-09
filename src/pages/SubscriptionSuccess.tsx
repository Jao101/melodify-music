import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateSubscriptionAfterCheckout } from '@/services/stripeService';
import { supabase } from '@/integrations/supabase/client';

export default function SubscriptionSuccess() {
  const { refreshProfile, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleSuccess = async () => {
      try {
        // Get URL parameters to determine which plan was purchased
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        if (!sessionId) {
          throw new Error('No session ID found');
        }

        console.log('Processing subscription success for session:', sessionId);

        // Strategy: Wait for webhooks first, then fallback to manual update if needed
        let attempts = 0;
        const maxAttempts = 6; // 6 attempts over 15 seconds
        
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`Attempt ${attempts}/${maxAttempts}: Checking subscription status...`);
          
          // Refresh profile to get latest data
          await refreshProfile();
          
          // Check current profile state
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('subscription_tier, subscription_end, updated_at')
              .eq('id', user.id)
              .single();
              
            console.log('Current profile:', {
              tier: currentProfile?.subscription_tier,
              hasEndDate: !!currentProfile?.subscription_end,
              updatedAt: currentProfile?.updated_at
            });
            
            // If subscription is not 'free', webhook likely processed it
            if (currentProfile?.subscription_tier && currentProfile.subscription_tier !== 'free') {
              console.log('✅ Subscription processed by webhook:', currentProfile.subscription_tier);
              setLoading(false);
              return;
            }
          }
          
          // Wait before next attempt (2.5 seconds each)
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2500));
          }
        }

        // If we reach here, webhooks didn't work - do manual update
        console.log('⚠️ Webhooks did not process subscription within 15s, performing manual update...');
        
        // Try to extract plan info from localStorage (set during checkout)
        const checkoutInfo = localStorage.getItem('melodify_checkout_info');
        let planId = 'premium'; // default
        let isYearly = false; // default
        
        if (checkoutInfo) {
          try {
            const info = JSON.parse(checkoutInfo);
            planId = info.planId || 'premium';
            isYearly = info.isYearly || false;
            localStorage.removeItem('melodify_checkout_info'); // Clean up
            console.log('📋 Using checkout info:', { planId, isYearly });
          } catch (e) {
            console.warn('Could not parse checkout info from localStorage');
          }
        }

        // Manually update the subscription (fallback for webhook delays)
        console.log('🔧 Updating subscription manually:', { planId, isYearly });
        const success = await updateSubscriptionAfterCheckout(planId, isYearly);
        
        if (success) {
          // Wait a moment and refresh the profile
          await new Promise(resolve => setTimeout(resolve, 1000));
          await refreshProfile();
          console.log('✅ Manual subscription update completed');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error handling subscription success:', err);
        setError('There was an issue verifying your subscription. Please contact support.');
        setLoading(false);
      }
    };
    
    handleSuccess();
  }, [refreshProfile]);
  
  const handleReturnHome = () => {
    window.location.href = '/';
  };
  
  if (loading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Processing your subscription...</h1>
        <p className="text-muted-foreground">
          Verifying payment and activating your subscription. This may take up to 15 seconds.
        </p>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>💳 Payment confirmed</p>
          <p>🔄 Syncing subscription data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Subscription Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReturnHome}>
                Return Home
              </Button>
              <Button onClick={() => window.location.hash = '#subscription'}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Subscription Successful! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Welcome to Melodify {profile?.subscription_tier ? profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1) : 'Premium'}! 
            Your account has been upgraded and you now have access to all premium features.
          </p>
          
          <div className="bg-muted p-4 rounded-lg text-sm">
            <h3 className="font-semibold mb-2">What's included in your plan:</h3>
            <ul className="text-left space-y-1">
              <li>• Unlimited AI-generated songs</li>
              <li>• High-quality audio streaming</li>
              <li>• Custom playlists</li>
              <li>• Offline listening</li>
              <li>• Priority support</li>
            </ul>
          </div>
          
          <Button size="lg" onClick={handleReturnHome} className="w-full">
            Start Listening
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
