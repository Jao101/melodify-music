import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionCancel() {
  const handleReturnHome = () => {
    window.location.href = '/';
  };

  const handleTryAgain = () => {
    window.location.href = '/#subscription-plans';
  };
  
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center">
      <XCircle className="h-24 w-24 text-red-500 mb-6" />
      <h1 className="text-3xl font-bold mb-4">Subscription Cancelled</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Your subscription process was cancelled. You can try again whenever you're ready.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={handleReturnHome}>
          Return to Home
        </Button>
        <Button onClick={handleTryAgain}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
