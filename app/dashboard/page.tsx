"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { recommendationsAPI, usersAPI, wishlistAPI, discoveryAPI, type RecommendedItem, type UserStats } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Film, 
  Music, 
  BookOpen, 
  Star, 
  Heart, 
  Coins,
  RefreshCw,
  Loader2,
  ArrowRight,
  TrendingUp,
  Brain,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateCredits, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [discoveryItems, setDiscoveryItems] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeType, setActiveType] = useState<string | undefined>(undefined);
  const [ratingsNeeded, setRatingsNeeded] = useState(false);
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState<'collaborative' | 'content' | 'hybrid' | 'cross_domain' | 'survey_based' | 'trend_ai'>('hybrid');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  // Refresh when the user navigates to the dashboard route
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/dashboard' && isAuthenticated) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAuthenticated]);

  // Listen for app-wide data changes (ratings, wishlist) and refresh dashboard
  useEffect(() => {
    const handler = () => {
      if (isAuthenticated) fetchDashboardData();
    };
    window.addEventListener('prefinity:data-changed', handler);
    return () => window.removeEventListener('prefinity:data-changed', handler);
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const promises = [
        recommendationsAPI.getRecommendations({ limit: 8, algorithm: selectedAlgo }),
        discoveryAPI.getTrending('movie'),
        wishlistAPI.getWishlist(),
        usersAPI.getProfile(),
      ];

      const results = await Promise.allSettled(promises);

      // Recommendations (may fail; we don't want it to block other data)
      let baseRecs: RecommendedItem[] = [];
      if (results[0].status === 'fulfilled') {
        baseRecs = results[0].value.recommendations || [];
        setRatingsNeeded(false);
      } else {
        console.warn('Recommendations failed to load:', results[0]);
        const err = results[0].reason;
        if (err && err.message && (err.message.includes('rate at least 5') || err.message.includes('rating') || err.message.includes('threshold'))) {
          setRatingsNeeded(true);
          // Fetch popular items for the taste profiling interface
          try {
            setPopularLoading(true);
            const pop = await itemsAPI.getPopular(undefined, 8);
            setPopularItems(pop.items || []);
          } catch (e) {
            console.error('Failed to fetch popular items:', e);
          } finally {
            setPopularLoading(false);
          }
        }
        // Try cold-start fallback (popular/cached)
        try {
          const cold = await recommendationsAPI.getColdStart(undefined, 8);
          baseRecs = cold.recommendations || [];
        } catch (e) {
          baseRecs = [];
        }
      }

      setRecommendations(baseRecs);

      // Trending
      if (results[1].status === 'fulfilled') {
        setDiscoveryItems(results[1].value.results || []);
      }

      // Wishlist
      if (results[2].status === 'fulfilled') {
        setWishlist(results[2].value.wishlist || []);
      }

      // Profile / Stats
      if (results[3].status === 'fulfilled') {
        setUserStats(results[3].value.stats);
      }

      // Refresh user info to get accurate credits (server-side deduction)
      try {
        await refreshUser();
      } catch (e) {
        // ignore refresh errors
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRecommendations = async (type?: string, algo?: 'collaborative' | 'content' | 'hybrid' | 'cross_domain' | 'survey_based' | 'trend_ai') => {
    if (!user || (user.role !== 'admin' && user.credits < 1)) {
      toast.error('Insufficient credits', {
        description: 'You need at least 1 credit to get recommendations.',
      });
      return;
    }

    setIsRefreshing(true);
    setActiveType(type);
    const algoToUse = algo || selectedAlgo;
    
    try {
      const data = await recommendationsAPI.getRecommendations({
        type,
        limit: 8,
        algorithm: algoToUse,
      });

      setRecommendations(data.recommendations || []);
      // Refresh user to sync credits deducted by server
      try {
        await refreshUser();
      } catch (e) {
        // ignore refresh errors
      }
      toast.success('Recommendations refreshed!', {
        description: user.role === 'admin' ? 'Free for admin' : '-1 credit',
      });
    } catch (error: any) {
      if (error && error.message && (error.message.includes('rate at least 5') || error.message.includes('rating') || error.message.includes('threshold'))) {
        setRatingsNeeded(true);
        // Fetch popular items
        try {
          setPopularLoading(true);
          const pop = await itemsAPI.getPopular(undefined, 8);
          setPopularItems(pop.items || []);
        } catch (e) {
          console.error('Failed to fetch popular items:', e);
        } finally {
          setPopularLoading(false);
        }
      }
      // Attempt cold-start fallback when personalized recs fail
      try {
        const cold = await recommendationsAPI.getColdStart(type, 8);
        setRecommendations(cold.recommendations || []);
        toast.success('Showing trending recommendations');
      } catch (e) {
        toast.error('Failed to refresh recommendations');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchTrending = async (type: string) => {
    setDiscoveryLoading(true);
    try {
      const data = await discoveryAPI.getTrending(type);
      setDiscoveryItems(data.results || []);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleSyncAndNavigate = async (item: any) => {
    if (item.id) {
      router.push(`/item/${item.id}`);
      return;
    }

    const toastId = toast.loading('Synchronizing content...');
    try {
      const result = await discoveryAPI.syncExternalItem({
        external_id: item.external_id,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        genre: item.genre,
        cover_image: item.cover_image,
        popularity: item.popularity,
        release_year: item.release_year
      });
      
      toast.success('Successfully synchronized!', { id: toastId });
      router.push(`/item/${result.item_id}`);
    } catch (error) {
      toast.error('Sync failed', { id: toastId });
    }
  };

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    try {
      const data = await wishlistAPI.getWishlist();
      setWishlist(data.wishlist || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white relative overflow-hidden">
      {/* Immersive Rotating Ambient Blur Nodes */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-violet-600/10 rounded-full blur-[150px] -z-10 animate-pulse pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[180px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-[130px] -z-10 pointer-events-none animate-pulse" />

      <Navbar />
      
      <main className="container py-8 max-w-7xl relative z-10 space-y-12">
        {/* Dynamic Premium Glass Console Hero Banner */}
        <div className="relative p-8 md:p-12 rounded-[32px] border border-white/5 bg-gradient-to-br from-[#121214]/90 via-[#18181b]/80 to-[#121214]/90 backdrop-blur-3xl group shadow-[0_30px_70px_rgba(0,0,0,0.8)] hover:shadow-violet-500/5 transition-all duration-700 hover:border-violet-500/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] -mr-32 -mt-32 transition-all duration-1000 group-hover:bg-violet-600/25 group-hover:scale-110 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] -ml-32 -mb-32 transition-all duration-1000 group-hover:bg-cyan-500/15 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <span className="inline-flex items-center gap-2 text-[10px] tracking-widest font-black text-violet-400 bg-violet-400/10 border border-violet-400/20 px-3.5 py-1.5 rounded-full uppercase leading-none shadow-[0_0_15px_rgba(167,139,250,0.1)]">
                <Brain className="h-3 w-3 animate-pulse" /> AI TASTE CONTROLLER
              </span>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none italic bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
                {t('dashboard.welcome', { name: user?.username })}
              </h1>
              
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl font-medium">
                {t('dashboard.description') || "Your personalized AI recommendation dashboard, trained on hybrid filtering algorithms."}
              </p>
            </div>

            {/* Quick Session Console Info */}
            <div className="flex flex-row md:flex-col items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 backdrop-blur-md shadow-inner md:min-w-[200px] justify-between">
              <div className="text-left w-full">
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-0.5">CURRENT TASTE LEVEL</span>
                <span className="text-2xl font-black text-white italic">HYBRID AI v2</span>
              </div>
              <div className="h-px w-full bg-white/5 hidden md:block" />
              <div className="text-left w-full">
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-0.5">ALGORITHM IN USE</span>
                <span className="text-xs font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 rounded-full inline-block mt-1">COLLABORATIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breathtaking Glass Console Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          
          <div className="relative group overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl p-6 transition-all duration-300 hover:border-violet-500/20 hover:from-white/10 hover:shadow-[0_15px_30px_-10px_rgba(139,92,246,0.15)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-violet-500/20 transition-all" />
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-3 shadow-inner">
                <Star className="h-6 w-6 text-violet-400 fill-violet-400/20" />
              </div>
              <span className="text-[10px] font-black tracking-widest text-violet-400/60 uppercase">RATINGS</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{t('dashboard.stats_ratings')}</p>
            <p className="text-3xl font-black text-white italic tracking-tight">{userStats?.total_ratings || 0}</p>
          </div>
          
          <div className="relative group overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl p-6 transition-all duration-300 hover:border-rose-500/20 hover:from-white/10 hover:shadow-[0_15px_30px_-10px_rgba(244,63,94,0.15)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-rose-500/20 transition-all" />
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 shadow-inner">
                <Heart className="h-6 w-6 text-rose-400 fill-rose-400/20" />
              </div>
              <span className="text-[10px] font-black tracking-widest text-rose-400/60 uppercase">WISHLIST</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{t('dashboard.stats_wishlist')}</p>
            <p className="text-3xl font-black text-white italic tracking-tight">{userStats?.wishlist_items || 0}</p>
          </div>
          
          <div className="relative group overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl p-6 transition-all duration-300 hover:border-emerald-500/20 hover:from-white/10 hover:shadow-[0_15px_30px_-10px_rgba(16,185,129,0.15)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 shadow-inner">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black tracking-widest text-emerald-400/60 uppercase">AVERAGE</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{t('dashboard.stats_avg_rating')}</p>
            <p className="text-3xl font-black text-white italic tracking-tight">
              {userStats?.average_rating?.toFixed(1) || '0.0'} <span className="text-sm font-black text-amber-400">★</span>
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl p-6 transition-all duration-300 hover:border-cyan-500/20 hover:from-white/10 hover:shadow-[0_15px_30px_-10px_rgba(6,182,212,0.15)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-3 shadow-inner">
                <Coins className="h-6 w-6 text-cyan-400" />
              </div>
              <Link href="/credits">
                <Button size="xs" variant="outline" className="text-[9px] h-6 px-2 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-all uppercase tracking-widest font-black">
                  + Add
                </Button>
              </Link>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{t('dashboard.stats_credits')}</p>
            <p className="text-3xl font-black text-white italic tracking-tight">{user?.credits ?? 0}</p>
          </div>
        </div>

        {/* Glowing Interactive Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          
          <Link href="/browse?type=movie">
            <div className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-r from-blue-950/20 to-[#121214] p-6 hover:border-blue-500/30 transition-all duration-300 hover:shadow-[0_10px_30px_-15px_rgba(59,130,246,0.3)] hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-blue-500/15 border border-blue-500/20 p-3 shadow-inner">
                    <Film className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white group-hover:text-blue-400 transition-colors">{t('dashboard.action_movies')}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{userStats?.movie_ratings || 0} Rated Movies</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
          
          <Link href="/browse?type=music">
            <div className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-r from-cyan-950/20 to-[#121214] p-6 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_10px_30px_-15px_rgba(6,182,212,0.3)] hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-cyan-500/15 border border-cyan-500/20 p-3 shadow-inner">
                    <Music className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white group-hover:text-cyan-400 transition-colors">{t('dashboard.action_music')}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{userStats?.music_ratings || 0} Rated Tracks</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-all group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
          
          <Link href="/browse?type=book">
            <div className="group relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-r from-emerald-950/20 to-[#121214] p-6 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-[0_10px_30px_-15px_rgba(16,185,129,0.3)] hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/20 p-3 shadow-inner">
                    <BookOpen className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white group-hover:text-emerald-400 transition-colors">{t('dashboard.action_books')}</h3>
                    <p className="text-xs text-muted-foreground font-medium">{userStats?.book_ratings || 0} Rated Books</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-400 transition-all group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

        </div>

        {/* Platform Premium Features */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
            <div className="rounded-xl bg-violet-500/10 p-2.5">
              <Brain className="h-5 w-5 text-violet-400" />
            </div>
            <div className="truncate">
              <p className="font-bold text-xs text-violet-400">{t('features.ai_title')}</p>
              <p className="text-[10px] text-muted-foreground truncate">{t('features.ai_desc')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <Music className="h-5 w-5 text-amber-400" />
            </div>
            <div className="truncate">
              <p className="font-bold text-xs text-amber-400">{t('features.eth_title')}</p>
              <p className="text-[10px] text-muted-foreground truncate">{t('features.eth_desc')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
            <div className="rounded-xl bg-purple-500/10 p-2.5">
              <Film className="h-5 w-5 text-purple-400" />
            </div>
            <div className="truncate">
              <p className="font-bold text-xs text-purple-400">{t('features.cross_title')}</p>
              <p className="text-[10px] text-muted-foreground truncate">{t('features.cross_desc')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <Coins className="h-5 w-5 text-blue-400" />
            </div>
            <div className="truncate">
              <p className="font-bold text-xs text-blue-400">{t('features.credits_title')}</p>
              <p className="text-[10px] text-muted-foreground truncate">{t('features.credits_desc')}</p>
            </div>
          </div>

        </div>

        {/* Premium Recommendations Card Panel */}
        <div id="recommendations" className="scroll-mt-24 rounded-[32px] border border-white/5 bg-gradient-to-b from-[#121214]/80 to-[#09090b]/80 backdrop-blur-2xl shadow-3xl overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tighter italic text-white flex items-center gap-2">
                <Brain className="h-6 w-6 text-violet-400" />
                {t('dashboard.recs_title') || "AI RECOMMENDATIONS"}
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mt-1">
                {t('dashboard.recs_desc') || "Personalized AI-powered picks (1 credit per refresh)"}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Algorithm:</span>
                <Select
                  value={selectedAlgo}
                  onValueChange={(val: any) => {
                    setSelectedAlgo(val);
                    refreshRecommendations(activeType, val);
                  }}
                  disabled={isRefreshing}
                >
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/10 rounded-xl text-xs font-bold text-white">
                    <SelectValue placeholder="Select Algorithm" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121214] border-white/10 text-white rounded-xl">
                    <SelectItem value="hybrid" className="text-xs font-medium hover:bg-white/5">Hybrid (Recommended)</SelectItem>
                    <SelectItem value="collaborative" className="text-xs font-medium hover:bg-white/5">Collaborative Filtering</SelectItem>
                    <SelectItem value="content" className="text-xs font-medium hover:bg-white/5">Content-Based</SelectItem>
                    <SelectItem value="survey_based" className="text-xs font-medium hover:bg-white/5">Survey-Based (Matches Prefs)</SelectItem>
                    <SelectItem value="trend_ai" className="text-xs font-bold text-violet-400 hover:bg-white/5">🔥 Trend AI (Discover New)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => refreshRecommendations(activeType, selectedAlgo)}
                disabled={isRefreshing || (user?.role !== 'admin' && (user?.credits || 0) < 1)}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all font-black text-xs uppercase px-4"
              >
                {isRefreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4 text-white" />
                )}
                {t('dashboard.refresh')}
              </Button>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {ratingsNeeded ? (
              <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl p-8 md:p-12 text-center shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10" />
                
                <div className="mx-auto w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-inner animate-bounce">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2 italic">
                  AI RECOMMENDATIONS LOCKED 🔒
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                  Our advanced hybrid algorithm builds recommendations personalized to your exact taste. Submit at least 5 ratings to unlock your custom feed!
                </p>
                
                {/* Progress Tracker */}
                <div className="max-w-md mx-auto bg-white/5 border border-white/5 rounded-3xl p-6 mb-12 shadow-lg backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Taste Profiling Progress</span>
                    <span className="text-sm font-black text-primary">{(userStats?.total_ratings || 0)} / 5 Rated</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 via-yellow-400 to-emerald-500 transition-all duration-1000 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                      style={{ width: `${Math.min(((userStats?.total_ratings || 0) / 5) * 100, 100)}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4 font-medium italic">
                    {(userStats?.total_ratings || 0) >= 5 ? "Tastes analyzed! Unlocking..." : `Rate ${5 - (userStats?.total_ratings || 0)} more item(s) to unlock.`}
                  </p>
                </div>
                
                {/* Quick Rate Section */}
                <div>
                  <h4 className="text-sm uppercase tracking-widest font-black text-white mb-6">
                    ✨ QUICKLY RATE THESE POPULAR ITEMS TO UNLOCK
                  </h4>
                  
                  {popularLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto">
                      {popularItems.slice(0, 4).map((item) => (
                        <QuickRateCard key={item.id} item={item} onRated={fetchDashboardData} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-8 bg-white/5 border border-white/5 p-1 rounded-2xl gap-2 w-full max-w-lg flex overflow-x-auto">
                  <TabsTrigger 
                    value="all" 
                    onClick={() => setActiveType(undefined)} 
                    className="flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                  >
                    {t('dashboard.tab_all')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="movie" 
                    onClick={() => setActiveType('movie')}
                    className="flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                  >
                    <Film className="mr-2 h-4 w-4" />
                    {t('dashboard.tab_movies')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="music" 
                    onClick={() => setActiveType('music')}
                    className="flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                  >
                    <Music className="mr-2 h-4 w-4" />
                    {t('dashboard.tab_music')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="book" 
                    onClick={() => setActiveType('book')}
                    className="flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t('dashboard.tab_books')}
                  </TabsTrigger>
                </TabsList>
  
                <TabsContent value="all" className="mt-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {recommendations.map((item) => (
                        <ItemCard 
                          key={item.id} 
                          item={item} 
                          showScore
                          score={item.score}
                          explanation={item.explanation}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Brain className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">{t('dashboard.no_recs')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('dashboard.rate_to_get_recs')}
                      </p>
                      <Link href="/browse">
                        <Button>{t('dashboard.start_browsing')}</Button>
                      </Link>
                    </div>
                  )}
                </TabsContent>
  
                {['movie', 'music', 'book'].map((type) => (
                  <TabsContent key={type} value={type} className="mt-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {recommendations
                          .filter((item) => item.item_type === type)
                          .map((item) => (
                            <ItemCard 
                              key={item.id} 
                              item={item} 
                              showScore
                              score={item.score}
                              explanation={item.explanation}
                            />
                          ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>

        {/* Global Discovery Section */}
        <div className="mt-16 mb-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter italic">
                  GLOBAL DISCOVERY
                </h2>
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
                  Trending Live from TMDB & Beyond
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="movie" className="w-full">
            <TabsList className="bg-white/5 p-1 rounded-xl mb-8">
              <TabsTrigger value="movie" onClick={() => fetchTrending('movie')} className="rounded-lg data-[state=active]:bg-primary">
                <Film className="h-4 w-4 mr-2" />
                Movies
              </TabsTrigger>
              <TabsTrigger value="music" onClick={() => fetchTrending('music')} className="rounded-lg data-[state=active]:bg-primary">
                <Music className="h-4 w-4 mr-2" />
                Music
              </TabsTrigger>
              <TabsTrigger value="book" onClick={() => fetchTrending('book')} className="rounded-lg data-[state=active]:bg-primary">
                <BookOpen className="h-4 w-4 mr-2" />
                Books
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movie" className="mt-0">
              <DiscoveryGrid items={discoveryItems} loading={discoveryLoading} onSync={handleSyncAndNavigate} />
            </TabsContent>
            <TabsContent value="music" className="mt-0">
              <DiscoveryGrid items={discoveryItems} loading={discoveryLoading} onSync={handleSyncAndNavigate} />
            </TabsContent>
            <TabsContent value="book" className="mt-0">
              <DiscoveryGrid items={discoveryItems} loading={discoveryLoading} onSync={handleSyncAndNavigate} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Wishlist Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
                {t('dashboard.wishlist_title') || "Your Wishlist"}
              </h2>
              <p className="text-muted-foreground">{t('dashboard.wishlist_desc') || "Items you've saved for later"}</p>
            </div>
            {wishlist.length > 0 && (
              <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 border-rose-500/20">
                {wishlist.length} Items
              </Badge>
            )}
          </div>

          {wishlistLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : wishlist.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {wishlist.map((item) => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  isWishlistItem
                  onRemove={() => fetchWishlist()}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-secondary p-4 mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <h3 className="text-lg font-medium mb-1">Your wishlist is empty</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Save items you're interested in while browsing to see them here.
                </p>
                <Link href="/browse">
                  <Button variant="outline">Start Browsing</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function DiscoveryGrid({ items, loading, onSync }: { items: any[], loading: boolean, onSync: (item: any) => void }) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[1, 2, 4, 8].map((i) => (
          <div key={i} className="aspect-[2/3] bg-white/5 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
        <p className="text-muted-foreground font-medium">No trending items found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.external_id || item.id} className="cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => onSync(item)}>
          <ItemCard 
            item={item} 
            isExternal={!item.id}
            showScore
            score={item.popularity || item.popularity_score || 0}
          />
        </div>
      ))}
    </div>
  );
}

function QuickRateCard({ item, onRated }: { item: any; onRated: () => void }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleRate = async (val: number) => {
    setRating(val);
    setIsSubmitting(true);
    const toastId = toast.loading(`Submitting rating for ${item.title}...`);
    try {
      await usersAPI.rateItem(item.id, val, 'Quick taste profiling rating');
      toast.success(`Rated ${item.title} ${val}/5 Stars!`, { id: toastId });
      // Call parent onRated
      onRated();
    } catch (e: any) {
      toast.error(e.message || 'Rating submission failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-white/5 bg-white/5 backdrop-blur-md flex flex-col h-full text-left">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {item.cover_image && !imgError ? (
          <img
            src={item.cover_image}
            alt={item.title}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary/50 to-background animate-pulse">
            <Star className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <CardContent className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h5 className="font-bold text-sm text-white truncate line-clamp-1 mb-0.5">{item.title}</h5>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70 mb-2">{item.item_type}</p>
        </div>
        
        {/* Star Rating Selector */}
        <div className="flex items-center justify-center gap-1 mt-2">
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            [1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                disabled={isSubmitting}
                className="transition-transform active:scale-95 hover:scale-110"
                onMouseEnter={() => setHoverRating(val)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRate(val)}
              >
                <Star
                  className={cn(
                    "h-5 w-5 stroke-1 transition-all duration-200",
                    (hoverRating || rating) >= val
                      ? "fill-amber-400 stroke-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                      : "text-muted-foreground/40 hover:text-amber-300"
                  )}
                />
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

