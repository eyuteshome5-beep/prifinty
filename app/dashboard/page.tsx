"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { recommendationsAPI, usersAPI, wishlistAPI, discoveryAPI, type RecommendedItem, type UserStats } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateCredits } = useAuth();
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

  const fetchDashboardData = async () => {
    try {
      const [recsData, trendingData, wishlistData, profileData] = await Promise.all([
        recommendationsAPI.getRecommendations({ limit: 8, algorithm: 'hybrid' }),
        discoveryAPI.getTrending('movie'),
        wishlistAPI.getWishlist(),
        usersAPI.getProfile(),
      ]);
      setRecommendations(recsData.recommendations);
      setDiscoveryItems(trendingData.results || []);
      setWishlist(wishlistData.wishlist || []);
      setUserStats(profileData.stats);
      
      // Update credits after fetching recommendations (they cost credits)
      // Admin users don't pay credits
      if (user && user.role !== 'admin') {
        const newCredits = user.credits - 1; // recommendation cost
        updateCredits(Math.max(0, newCredits));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRecommendations = async (type?: string) => {
    if (!user || (user.role !== 'admin' && user.credits < 1)) {
      toast.error('Insufficient credits', {
        description: 'You need at least 1 credit to get recommendations.',
      });
      return;
    }

    setIsRefreshing(true);
    setActiveType(type);
    
    try {
      const data = await recommendationsAPI.getRecommendations({ 
        type, 
        limit: 8, 
        algorithm: 'hybrid' 
      });
      setRecommendations(data.recommendations);
      if (user.role !== 'admin') {
        updateCredits(user.credits - 1);
      }
      toast.success('Recommendations refreshed!', {
        description: user.role === 'admin' ? 'Free for admin' : '-1 credit',
      });
    } catch (error) {
      toast.error('Failed to refresh recommendations');
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-8">
        {/* Welcome Header */}
        {/* Welcome Header */}
        <div className="relative mb-12 p-8 md:p-12 rounded-[40px] overflow-hidden border border-white/5 bg-white/5 backdrop-blur-xl group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-colors group-hover:bg-primary/20" />
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 italic">
              {t('dashboard.welcome', { name: user?.username })}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t('dashboard.description')}
            </p>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          
          <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl transition-all duration-500 hover:shadow-indigo-500/5 hover:border-indigo-500/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-indigo-500/10 p-3">
                <Star className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.stats_ratings')}</p>
                <p className="text-2xl font-bold">{userStats?.total_ratings || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl transition-all duration-500 hover:shadow-rose-500/5 hover:border-rose-500/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-rose-500/10 p-3">
                <Heart className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.stats_wishlist')}</p>
                <p className="text-2xl font-bold">{userStats?.wishlist_items || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl transition-all duration-500 hover:shadow-primary/5 hover:border-primary/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.stats_avg_rating')}</p>
                <p className="text-2xl font-bold">
                  {userStats?.average_rating?.toFixed(1) || '0.0'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Link href="/browse?type=movie">
            <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Film className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t('dashboard.action_movies')}</p>
                  <p className="text-sm text-muted-foreground">
                    {userStats?.movie_ratings || 0} rated
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/browse?type=music">
            <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-cyan-500/10 p-2">
                  <Music className="h-5 w-5 text-cyan-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t('dashboard.action_music')}</p>
                  <p className="text-sm text-muted-foreground">
                    {userStats?.music_ratings || 0} rated
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/browse?type=book">
            <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t('dashboard.action_books')}</p>
                  <p className="text-sm text-muted-foreground">
                    {userStats?.book_ratings || 0} rated
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
        
        {/* Platform Features */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-xl transition-all hover:shadow-teal-500/5 hover:border-teal-500/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-teal-500/10 p-3">
                <Brain className="h-6 w-6 text-teal-500" />
              </div>
              <div>
                <p className="font-semibold text-teal-500">{t('features.ai_title')}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{t('features.ai_desc')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-xl transition-all hover:shadow-amber-500/5 hover:border-amber-500/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-amber-500/10 p-3">
                <Music className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-amber-500">{t('features.eth_title')}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{t('features.eth_desc')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-xl transition-all hover:shadow-purple-500/5 hover:border-purple-500/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-purple-500/10 p-3">
                <Film className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-purple-500">{t('features.cross_title')}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{t('features.cross_desc')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-xl transition-all hover:shadow-blue-500/5 hover:border-blue-500/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Coins className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-blue-500">{t('features.credits_title')}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{t('features.credits_desc')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations Section */}
        <Card id="recommendations" className="scroll-mt-24">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                  {t('dashboard.recs_title')}
                <CardDescription>
                  {t('dashboard.recs_desc')}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refreshRecommendations(activeType)}
                disabled={isRefreshing || (user?.role !== 'admin' && (user?.credits || 0) < 1)}
              >
                {isRefreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('dashboard.refresh')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all" onClick={() => setActiveType(undefined)}>
                  {t('dashboard.tab_all')}
                </TabsTrigger>
                <TabsTrigger value="movie" onClick={() => setActiveType('movie')}>
                  <Film className="mr-1 h-4 w-4" />
                  {t('dashboard.tab_movies')}
                </TabsTrigger>
                <TabsTrigger value="music" onClick={() => setActiveType('music')}>
                  <Music className="mr-1 h-4 w-4" />
                  {t('dashboard.tab_music')}
                </TabsTrigger>
                <TabsTrigger value="book" onClick={() => setActiveType('book')}>
                  <BookOpen className="mr-1 h-4 w-4" />
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
          </CardContent>
        </Card>

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
          />
        </div>
      ))}
    </div>
  );
}
