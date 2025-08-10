import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Music, 
  Heart, 
  Users, 
  Star, 
  Github, 
  Globe, 
  Mail, 
  Coffee,
  ExternalLink,
  Code,
  Sparkles,
  Shield,
  Headphones
} from "lucide-react";
import { toast } from 'sonner';

export default function About() {
  const [showCredits, setShowCredits] = useState(false);

  const features = [
    { icon: Music, title: "High-Quality Streaming", desc: "Crystal clear audio up to lossless quality" },
    { icon: Heart, title: "Smart Recommendations", desc: "AI-powered music discovery" },
    { icon: Users, title: "Social Features", desc: "Share playlists and discover with friends" },
    { icon: Sparkles, title: "AI Integration", desc: "Advanced metadata enhancement" },
    { icon: Shield, title: "Privacy First", desc: "Your data stays secure and private" },
    { icon: Headphones, title: "Cross-Platform", desc: "Seamless experience across all devices" }
  ];

  const team = [
    { name: "Development Team", role: "Core Engineering", avatar: "🚀" },
    { name: "Design Team", role: "UI/UX Design", avatar: "🎨" },
    { name: "Audio Team", role: "Audio Engineering", avatar: "🎵" },
    { name: "AI Team", role: "Machine Learning", avatar: "🤖" }
  ];

  const technologies = [
    "React", "TypeScript", "Supabase", "Tailwind CSS", "Vite", "Lucide Icons"
  ];

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sendFeedback = () => {
    toast.success('Feedback form opened! (Feature coming soon)');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center">
              <Music className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Auralia AI</h1>
              <p className="text-muted-foreground">Your Intelligent Music Companion</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            Version 1.0.0 Beta
          </Badge>
        </div>

        <div className="space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About Auralia AI</CardTitle>
              <CardDescription>
                The future of music streaming, powered by artificial intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                Auralia AI is a next-generation music streaming platform that combines high-quality audio 
                with intelligent features. Our AI-powered system enhances your music experience through 
                smart recommendations, metadata enrichment, and personalized discovery.
              </p>
              
              <p className="text-sm leading-relaxed">
                Built with modern web technologies and designed for music lovers who want more than just 
                streaming - we provide an intelligent companion that understands your taste and helps you 
                discover your next favorite song.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {technologies.map((tech) => (
                  <Badge key={tech} variant="outline" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
              <CardDescription>
                What makes Auralia AI special
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
                    <feature.icon className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Statistics</CardTitle>
              <CardDescription>
                Live stats from our growing community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">1M+</p>
                  <p className="text-xs text-muted-foreground">Songs Available</p>
                </div>
                <div className="text-center p-4 bg-green-500/5 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">50K+</p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
                <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">100+</p>
                  <p className="text-xs text-muted-foreground">Countries</p>
                </div>
                <div className="text-center p-4 bg-purple-500/5 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">99.9%</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Credits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Team & Credits
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowCredits(!showCredits)}
                >
                  {showCredits ? 'Hide' : 'Show'} Credits
                </Button>
              </CardTitle>
              <CardDescription>
                The people behind Auralia AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showCredits && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {team.map((member, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                        <div className="text-2xl">{member.avatar}</div>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Special Thanks</p>
                    <p className="text-xs text-muted-foreground">
                      Open source libraries, design inspiration from Spotify & Apple Music,
                      and our amazing beta testing community.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legal & Links */}
          <Card>
            <CardHeader>
              <CardTitle>Legal & Resources</CardTitle>
              <CardDescription>
                Important information and useful links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Documentation</p>
                  <div className="space-y-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start h-auto p-1 text-xs"
                      onClick={() => openLink('/terms')}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Terms of Service
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start h-auto p-1 text-xs"
                      onClick={() => openLink('/privacy')}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Privacy Policy
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start h-auto p-1 text-xs"
                      onClick={() => openLink('/api-docs')}
                    >
                      <Code className="h-3 w-3 mr-2" />
                      API Documentation
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Connect</p>
                  <div className="space-y-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start h-auto p-1 text-xs"
                      onClick={() => openLink('https://github.com/auralia-ai')}
                    >
                      <Github className="h-3 w-3 mr-2" />
                      GitHub Repository
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start h-auto p-1 text-xs"
                      onClick={() => openLink('https://auralia.ai')}
                    >
                      <Globe className="h-3 w-3 mr-2" />
                      Official Website
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start h-auto p-1 text-xs"
                      onClick={sendFeedback}
                    >
                      <Mail className="h-3 w-3 mr-2" />
                      Send Feedback
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  © 2025 Auralia AI. All rights reserved.
                </p>
                <p className="text-xs text-muted-foreground">
                  Made with ❤️ for music lovers everywhere.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Support Development
              </CardTitle>
              <CardDescription>
                Help us continue building amazing music experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Auralia AI is built by passionate developers who believe music should be intelligent, 
                beautiful, and accessible to everyone. Your support helps us continue innovating.
              </p>
              
              <div className="flex gap-2">
                <Button onClick={() => toast.success('Support page coming soon!')}>
                  <Star className="h-4 w-4 mr-2" />
                  Become a Supporter
                </Button>
                <Button variant="outline" onClick={() => toast.success('GitHub sponsors coming soon!')}>
                  <Github className="h-4 w-4 mr-2" />
                  Sponsor on GitHub
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
