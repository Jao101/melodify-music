import { Home, Music, ChevronRight, Search, Library, Heart, Plus, Download, Compass, Clock, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserProfileMenu } from "@/components/profile/UserProfileMenu";

// Spotify-typische Navigationsstruktur
const mainNavItems = [
  { title: "Home", url: "/", icon: Home },
];

// Platzhalter für zukünftige Funktionen
const libraryCategories = [
  { title: "Your Library", icon: Library, url: "/library" },
];

const quickLinks = [
  { title: "Create Playlist", icon: Plus, soon: true },
  { title: "Liked Songs", icon: Heart, url: "/liked-songs" },
];

const discoverLinks = [
  { title: "Explore", icon: Compass, soon: true },
  { title: "Latest Releases", icon: Clock, soon: true },
  { title: "Charts", icon: Globe, soon: true },
];

export function AppSidebar({ onShowSubscriptionPlans }: { onShowSubscriptionPlans?: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border flex flex-col h-full">
        {/* Logo und Branding */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <Music className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold gradient-text">
                Auralia AI
              </span>
            )}
          </div>
        </div>

        {/* Hauptnavigation - Home & Suche */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Hauptnavigation - verbesserte Spotify-Stil Indikation */}
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <div 
                    onClick={() => navigate(item.url)}
                    className={`flex items-center gap-3 p-3 relative hover:text-primary transition-colors cursor-pointer ${
                      location.pathname === item.url ? 'text-primary' : 'text-foreground'
                    }`}
                    style={{
                      backgroundColor: location.pathname === item.url ? 'hsla(var(--primary) / 0.1)' : '',
                      borderLeftWidth: location.pathname === item.url ? '4px' : '0',
                      borderLeftColor: location.pathname === item.url ? 'hsl(var(--primary))' : '',
                      paddingLeft: location.pathname === item.url ? 'calc(0.75rem - 4px)' : '0.75rem'
                    }}
                  >
                    <item.icon className={`h-5 w-5 ${location.pathname === item.url ? 'text-primary' : 'text-foreground'}`} />
                    {!collapsed && <span className={`font-medium ${location.pathname === item.url ? 'text-primary' : 'text-foreground'}`}>{item.title}</span>}
                  </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Suche - Platzhalter für zukünftige Funktion */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div className="flex items-center gap-3 p-3 relative text-muted-foreground opacity-70 cursor-not-allowed">
                    <Search className="h-5 w-5" />
                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className="font-medium">Search</span>
                        <span className="text-xs bg-secondary/70 px-1.5 py-0.5 rounded text-muted-foreground">Soon</span>
                      </div>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bibliothek Sektion - Spotify-ähnlicher Container */}
        {!collapsed && (
          <>
            <div className="mt-2 px-2">
              <div className="bg-secondary/20 rounded-lg p-3">
                {/* Bibliothek Header */}
                {libraryCategories.map((item) => (
                  <div 
                    key={item.title} 
                    className={`flex items-center justify-between mb-4 cursor-pointer hover:bg-secondary/30 p-2 rounded-md transition-colors ${
                      location.pathname === item.url ? 'bg-secondary/50' : ''
                    }`}
                    onClick={() => navigate(item.url)}
                  >
                    <div className="flex items-center gap-2 text-foreground">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
                
                {/* Quick Links */}
                <div className="space-y-1">
                  {quickLinks.map((item) => (
                    <div 
                      key={item.title}
                      className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                        item.soon 
                          ? 'text-muted-foreground/50 cursor-not-allowed' 
                          : `cursor-pointer hover:bg-secondary/30 ${
                              location.pathname === item.url ? 'bg-secondary/50 text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`
                      }`}
                      onClick={() => {
                        if (!item.soon && item.url) {
                          navigate(item.url);
                        }
                      }}
                    >
                      <div className="h-8 w-8 flex items-center justify-center bg-secondary/50 rounded">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.soon && (
                          <span className="text-xs bg-secondary/70 px-1.5 py-0.5 rounded">Soon</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Entdecken Sektion - Spotify-ähnlich */}
            <div className="mt-4 px-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-3 mb-2">
                Discover
              </h3>
              <div className="space-y-1">
                {discoverLinks.map((item) => (
                  <div 
                    key={item.title}
                    className="flex items-center gap-3 px-3 py-2 text-muted-foreground opacity-70 hover:opacity-100 transition-opacity rounded-md cursor-not-allowed"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{item.title}</span>
                    {item.soon && (
                      <span className="ml-auto text-xs bg-secondary/70 px-1.5 py-0.5 rounded">Soon</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Download App Link - Spotify-typisch */}
        {!collapsed && (
          <div className="px-4 mt-2">
            <div className="flex items-center gap-2 py-2 text-muted-foreground hover:text-foreground transition-colors opacity-70">
              <Download className="h-4 w-4" />
              <span className="text-sm">Download App</span>
              <span className="text-xs bg-secondary/70 px-1.5 py-0.5 rounded ml-auto">Soon</span>
            </div>
            <div className="border-t border-sidebar-border my-3"></div>
          </div>
        )}

        {/* Footer Bereich mit Profil und Premium */}
        <div className={`mt-auto p-2 space-y-3 ${collapsed ? '' : 'px-4'}`}>
          {/* User Profile Menu - New Dropdown Component */}
          <UserProfileMenu collapsed={collapsed} />

          {/* Upgrade Banner - Spotify Style */}
          {(!profile?.subscription_tier || profile?.subscription_tier === 'free') && (
            <div className={`rounded-lg overflow-hidden hover:shadow-md transition-shadow ${collapsed ? 'p-2' : ''}`}>
              <div className={`bg-gradient-to-br from-primary/20 via-accent/10 to-primary/10 ${collapsed ? 'p-2 rounded-lg' : 'p-4'} border border-primary/20`}>
                {collapsed ? (
                  <button
                    onClick={onShowSubscriptionPlans}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <span className="sr-only">Get Premium</span>
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </button>
                ) : (
                  <>
                    <h3 className="font-semibold text-sm mb-2 text-foreground">Upgrade to Premium</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Get unlimited music generation and ad-free listening
                    </p>
                    <button 
                      onClick={onShowSubscriptionPlans}
                      className="w-full bg-primary text-primary-foreground rounded-full py-2 text-sm font-medium hover:bg-primary/90 hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
                    >
                      Get Premium
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}