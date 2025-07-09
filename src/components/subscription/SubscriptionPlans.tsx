import { Check, Zap, Users, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  icon: any;
  popular?: boolean;
  features: PlanFeature[];
  color: string;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic music streaming',
    price: { monthly: 0, yearly: 0 },
    icon: Zap,
    color: 'muted',
    features: [
      { text: 'Limited playtime per month', included: true },
      { text: 'Ads between songs', included: true },
      { text: '2 AI songs per month', included: true },
      { text: 'Basic music library', included: true },
      { text: 'Standard audio quality', included: true },
      { text: 'Offline downloads', included: false },
      { text: 'Unlimited skips', included: false },
      { text: 'Premium audio quality', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Unlimited music with premium features',
    price: { monthly: 9.99, yearly: 99.99 },
    icon: Crown,
    popular: true,
    color: 'primary',
    features: [
      { text: '500 hours playtime per month', included: true },
      { text: 'Ad-free listening', included: true },
      { text: 'Unlimited AI song generation', included: true },
      { text: 'Offline downloads', included: true },
      { text: 'Unlimited skips', included: true },
      { text: 'Premium audio quality (FLAC)', included: true },
      { text: 'Early access to new features', included: true },
      { text: 'Priority customer support', included: true },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Premium for the whole family',
    price: { monthly: 14.99, yearly: 149.99 },
    icon: Users,
    color: 'accent',
    features: [
      { text: '300 hours per person (up to 5)', included: true },
      { text: 'Ad-free for all members', included: true },
      { text: 'Unlimited AI songs for all', included: true },
      { text: 'Offline downloads for all', included: true },
      { text: 'Unlimited skips for all', included: true },
      { text: 'Premium audio quality (FLAC)', included: true },
      { text: 'Family mix playlists', included: true },
      { text: 'Parental controls', included: true },
    ],
  },
];

interface SubscriptionPlansProps {
  onSelectPlan: (planId: string, isYearly: boolean) => void;
  currentPlan?: string;
  isYearly?: boolean;
}

export function SubscriptionPlans({ 
  onSelectPlan, 
  currentPlan = 'free',
  isYearly = false 
}: SubscriptionPlansProps) {
  const getPrice = (plan: SubscriptionPlan) => {
    if (plan.price.monthly === 0) return 'Free';
    const price = isYearly ? plan.price.yearly : plan.price.monthly;
    const period = isYearly ? '/year' : '/month';
    return `$${price}${period}`;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (plan.price.monthly === 0) return null;
    const monthlyTotal = plan.price.monthly * 12;
    const savings = monthlyTotal - plan.price.yearly;
    const percentage = Math.round((savings / monthlyTotal) * 100);
    return { amount: savings, percentage };
  };

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 p-1 bg-muted rounded-lg w-fit mx-auto">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !isYearly 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {/* Handle monthly toggle */}}
        >
          Monthly
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
            isYearly 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => {/* Handle yearly toggle */}}
        >
          Yearly
          <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs bg-accent text-accent-foreground">
            Save 17%
          </Badge>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const savings = getSavings(plan);
          const isCurrentPlan = currentPlan === plan.id;

          return (
            <Card 
              key={plan.id}
              className={`music-card relative p-6 ${
                plan.popular ? 'ring-2 ring-primary shadow-[var(--shadow-glow)]' : ''
              } ${
                isCurrentPlan ? 'bg-primary/5 border-primary/30' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                  plan.color === 'primary' ? 'bg-primary text-primary-foreground' :
                  plan.color === 'accent' ? 'bg-accent text-accent-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold">{getPrice(plan)}</div>
                  {isYearly && savings && (
                    <div className="text-sm text-accent">
                      Save ${savings.amount}/year ({savings.percentage}% off)
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      feature.included 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Check className="h-3 w-3" />
                    </div>
                    <span className={`text-sm ${
                      feature.included ? 'text-foreground' : 'text-muted-foreground line-through'
                    }`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className={`w-full ${
                  plan.color === 'primary' ? 'bg-primary hover:bg-primary/90' :
                  plan.color === 'accent' ? 'bg-accent hover:bg-accent/90 text-accent-foreground' :
                  ''
                }`}
                variant={plan.color === 'muted' ? 'outline' : 'default'}
                onClick={() => onSelectPlan(plan.id, isYearly)}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? 'Current Plan' : 
                 plan.price.monthly === 0 ? 'Get Started' : 'Upgrade Now'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}