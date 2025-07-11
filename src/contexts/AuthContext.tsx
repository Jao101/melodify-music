import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createCheckoutSession, getSubscriptionStatus } from '@/services/stripeService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  profile: any;
  refreshProfile: () => Promise<void>;
  // Add new subscription methods
  subscribeToplan: (planId: string, isYearly: boolean) => Promise<string | null>;
  isSubscriptionActive: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cleanup function to prevent auth limbo states
export const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no profile exists, create one
      if (!data) {
        const newProfile = {
          id: user.id,
          display_name: user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          bio: '',
          website: '',
          avatar_url: null,
          subscription_tier: 'free'
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) throw createError;
        setProfile(createdProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Defer profile fetching to prevent deadlocks
          setTimeout(() => {
            if (mounted) {
              refreshProfile();
            }
          }, 100);
          
          // Redirect to home if we're on auth page
          if (window.location.pathname === '/auth') {
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session and handle OAuth redirect
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setTimeout(() => {
              if (mounted) {
                refreshProfile();
              }
            }, 100);
          }
          
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: username || email.split('@')[0],
            full_name: username || email.split('@')[0]
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Force page reload for clean state
        window.location.href = '/';
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Force page reload for clean state
        window.location.href = '/';
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Add new method to subscribe to a plan
  const subscribeToplan = async (planId: string, isYearly: boolean) => {
    if (!user) {
      console.error('User must be logged in to subscribe');
      return null;
    }
    
    // If selecting the free plan, update directly
    if (planId === 'free') {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_tier: 'free', subscription_end: null })
          .eq('id', user.id);
        
        if (error) throw error;
        await refreshProfile();
        return '/';
      } catch (error) {
        console.error('Error downgrading to free plan:', error);
        return null;
      }
    }
    
    // For paid plans, create a checkout session
    return await createCheckoutSession(planId, isYearly, window.location.origin);
  };

  // Check if user has an active subscription
  const isSubscriptionActive = () => {
    if (!profile) return false;
    
    // Free tier is considered "active" for basic features
    if (profile.subscription_tier === 'free') return true;
    
    // Check if paid subscription has expired
    if (!profile.subscription_end) return false;
    
    const endDate = new Date(profile.subscription_end);
    return endDate > new Date();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    profile,
    refreshProfile,
    // Add new subscription methods to context
    subscribeToplan,
    isSubscriptionActive,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}