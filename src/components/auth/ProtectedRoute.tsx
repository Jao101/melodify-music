import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Music } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // If we're not loading and we have checked auth state, stop checking
    if (!loading) {
      setIsCheckingAuth(false);
    }
  }, [loading]);

  // Show loading while auth is being determined
  if (loading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center animate-pulse-glow">
            <Music className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your music universe...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no user and not loading, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}