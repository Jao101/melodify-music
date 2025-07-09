import { useState } from 'react';
import { UserCircle, Settings, LogOut, User, CreditCard, Bell, ChevronRight, Edit3, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserProfileEditDialog } from "@/components/profile/UserProfileEditDialog";

interface UserProfileMenuProps {
  collapsed?: boolean;
}

export function UserProfileMenu({ collapsed = false }: UserProfileMenuProps) {
  const { profile, signOut } = useAuth();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  
  const navigateTo = (path: string) => {
    window.location.href = path;
  };
  
  return (
    <>
      <DropdownMenu>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center justify-center p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile?.display_name || 'User'} 
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary-foreground">
                        {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Your Profile</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile?.display_name || 'User'} 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-primary-foreground">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium truncate">
                    {profile?.display_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {profile?.subscription_tier || 'free'} plan
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </DropdownMenuTrigger>
        )}
          
        <DropdownMenuContent align="end" className="w-56 bg-secondary border-secondary-border">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{profile?.display_name || 'User'}</p>
              <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowProfileEdit(true)} className="cursor-pointer">
            <Edit3 className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => alert("Account settings coming soon")}>
            <User className="mr-2 h-4 w-4" />
            <span>Account</span>
            <span className="text-xs ml-auto opacity-60">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => navigateTo('/subscription')}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Subscription</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => alert("Notification preferences coming soon")}>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
            <span className="text-xs ml-auto opacity-60">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => alert("Settings coming soon")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <span className="text-xs ml-auto opacity-60">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => alert("About Auralia AI")}>
            <Info className="mr-2 h-4 w-4" />
            <span>About</span>
            <span className="text-xs ml-auto opacity-60">v1.0</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserProfileEditDialog 
        open={showProfileEdit} 
        onOpenChange={setShowProfileEdit} 
        profile={profile} 
      />
    </>
  );
}
