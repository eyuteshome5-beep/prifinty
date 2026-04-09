"use client";

import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Globe, 
  Heart, 
  ShieldCheck, 
  Activity, 
  Award,
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-20 relative overflow-hidden">
        {/* Glow Decoration */}
        <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5 text-primary px-4 py-1.5 rounded-full backdrop-blur-md">
            <Globe className="h-3 w-3 mr-2" />
            Empowering Ethiopian Culture
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[0.9]">
            The Intersection of <span className="text-primary">Heritage</span> & <span className="text-amber-500">Intelligence</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Prefinity is a state-of-the-art recommendation engine designed to preserve, promote, and personalized Ethiopian cultural content through advanced machine learning.
          </p>
        </div>

        {/* Vision Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-32">
          <Card className="bg-white/5 backdrop-blur-md border-white/5 hover:border-primary/20 transition-all duration-500 group">
            <CardContent className="p-8">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">Precision AI</h3>
              <p className="text-muted-foreground leading-relaxed">
                Utilizing hybrid collaborative and content-based filtering to understand your unique taste in Ethiopian movies, music, and literature.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/5 hover:border-amber-500/20 transition-all duration-500 group">
            <CardContent className="p-8">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">Cultural Preservation</h3>
              <p className="text-muted-foreground leading-relaxed">
                Digitalizing the rich history of Ethiopian arts, making classic masterpieces accessible to a global audience in the digital age.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border-white/5 hover:border-emerald-500/20 transition-all duration-500 group">
            <CardContent className="p-8">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">Global Reach</h3>
              <p className="text-muted-foreground leading-relaxed">
                Breaking barriers and sharing the beauty of "Liba", "Ethio-Jazz", and Ethiopian Cinema with culture enthusiasts worldwide.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Our Approach */}
        <div className="bg-gradient-to-br from-primary/5 to-amber-500/5 rounded-[40px] p-12 md:p-24 border border-white/5 relative overflow-hidden mb-32">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <ShieldCheck className="h-48 w-48 text-primary" />
          </div>
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold mb-6">Our Design Philosophy</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We believe technology should feel human. Prefinity combines high-performance backend systems with a "Black-Brown" premium aesthetic that respects the warmth of Ethiopian traditions while embracing modern minimalism.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 border border-white/5 backdrop-blur-sm">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Quality content</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 border border-white/5 backdrop-blur-sm">
                <Heart className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">Community first</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-8 italic text-balance">
            "Culture is the widening of the mind and of the spirit."
          </h2>
          <Link href="/register">
            <Button size="lg" className="h-14 px-10 text-lg rounded-2xl gap-3 shadow-[0_15px_40px_-5px_rgba(var(--primary),0.5)]">
              Join the Experience
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-background/50 backdrop-blur-lg">
        <div className="container text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Prefinity Recommendation Engine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
