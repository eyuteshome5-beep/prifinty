"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Film, 
  Music, 
  BookOpen, 
  ArrowRight, 
  Star,
  Users,
  Brain,
  Globe,
  Coins,
  Activity
} from 'lucide-react';
import { itemsAPI, discoverAPI, type Item } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [popularMovies, setPopularMovies] = useState<Item[]>([]);
  const [popularMusic, setPopularMusic] = useState<Item[]>([]);
  const [popularBooks, setPopularBooks] = useState<Item[]>([]);
  const [ethiopianContent, setEthiopianContent] = useState<Item[]>([]);
  const [trendingGlobal, setTrendingGlobal] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const [movies, music, books, ethiopian] = await Promise.all([
          itemsAPI.getPopular('movie', 4),
          itemsAPI.getPopular('music', 4),
          itemsAPI.getPopular('book', 4),
          itemsAPI.getEthiopianContent(undefined, 4),
        ]);
        setPopularMovies(movies.items);
        setPopularMusic(music.items);
        setPopularBooks(books.items);
        setEthiopianContent(ethiopian.items);
        try {
          const trending = await discoverAPI.getTrending('movie', 6);
          setTrendingGlobal(trending.results || []);
        } catch (err) {
          console.error('Failed to fetch global trending:', err);
        }
      } catch (error) {
        console.error('Failed to fetch content:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden py-20 md:py-32">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/hero-bg.png")' }}
        />
        <div className="absolute inset-0 z-1 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 z-1 bg-gradient-to-t from-background via-transparent to-background/30" />

        <div className="container relative z-10 text-foreground">
          <div className="max-w-3xl text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            <h1 className="mb-6 text-3xl font-black tracking-tighter md:text-6xl lg:text-7xl text-balance leading-[0.9]">
              {t('hero.title')}
              <span className="text-primary block mt-4 bg-gradient-to-r from-primary via-amber-200 to-primary bg-clip-text text-transparent animate-pulse">{t('hero.subtitle')}</span>
            </h1>
            <div className="h-1 w-24 bg-primary mb-8 rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)]"></div>
            <p className="mb-10 text-base md:text-xl text-muted-foreground/80 text-pretty max-w-2xl leading-relaxed">
              {t('hero.description')}
            </p>
            <div className="flex flex-wrap items-center justify-start gap-6">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="h-14 px-8 text-lg rounded-2xl gap-3 shadow-[0_10px_30px_-10px_rgba(var(--primary),0.5)] hover:shadow-[0_15px_40px_-5px_rgba(var(--primary),0.6)] transition-all">
                    {t('hero.cta_dashboard')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="h-14 px-8 text-lg rounded-2xl gap-3 shadow-[0_10px_30px_-10px_rgba(var(--primary),0.5)] hover:shadow-[0_15px_40px_-5px_rgba(var(--primary),0.6)] transition-all">
                      {t('hero.cta_start')}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/browse">
                    <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-2xl border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all">
                      {t('hero.cta_browse')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        </div>
      </section>


      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">{t('features.title')}</h2>
            <p className="text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-full bg-teal-500/10 p-3">
                  <Brain className="h-6 w-6 text-teal-500" />
                </div>
                <h3 className="mb-2 font-semibold">{t('features.ai_title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('features.ai_desc')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-full bg-amber-500/10 p-3">
                  <Activity className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="mb-2 font-semibold">{t('features.eth_title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('features.eth_desc')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-full bg-purple-500/10 p-3">
                  <Film className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="mb-2 font-semibold">{t('features.cross_title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('features.cross_desc')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-full bg-blue-500/10 p-3">
                  <Coins className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="mb-2 font-semibold">{t('features.credits_title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('features.credits_desc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ethiopian Content Section */}
      {ethiopianContent.length > 0 && (
        <section className="bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 py-16">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 rounded-sm overflow-hidden border border-gray-200 shadow-sm">
                    <div className="flex h-full">
                      <span className="block w-1/3 bg-green-600" />
                      <span className="block w-1/3 bg-yellow-400" />
                      <span className="block w-1/3 bg-red-600" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-emerald-700">{t('nav.ethiopian')}</h2>
                    <p className="text-muted-foreground">{t('hero.subtitle')}</p>
                  </div>
                </div>
              </div>
              <Link href="/ethiopian">
                <Button variant="outline" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ethiopianContent.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GLOBAL DISCOVERY - Trending Live from TMDB & Beyond */}
      {trendingGlobal.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-sky-50 via-white to-slate-50">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-200/30 p-2">
                  <Globe className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">GLOBAL DISCOVERY</h2>
                  <p className="text-sm text-muted-foreground">Trending Live from TMDB & Beyond — Recommendations by %</p>
                </div>
              </div>
              <Link href="/browse">
                <Button variant="outline" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trendingGlobal.map((item, idx) => (
                <ItemCard
                  key={item.external_id || idx}
                  item={item}
                  isExternal={true}
                  showScore={true}
                  score={item.score_percent || item.popularity || 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Movies */}
      {popularMovies.length > 0 && (
        <section className="py-16">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Film className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-500">Popular Movies</h2>
                  <p className="text-sm text-muted-foreground">Trending films this week</p>
                </div>
              </div>
              <Link href="/browse?type=movie">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {popularMovies.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Music */}
      {popularMusic.length > 0 && (
        <section className="bg-secondary/30 py-16">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Music className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-purple-500">Popular Music</h2>
                  <p className="text-sm text-muted-foreground">Top tracks and albums</p>
                </div>
              </div>
              <Link href="/browse?type=music">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {popularMusic.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Books */}
      {popularBooks.length > 0 && (
        <section className="py-16">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-emerald-500">Popular Books</h2>
                  <p className="text-sm text-muted-foreground">Must-read titles</p>
                </div>
              </div>
              <Link href="/browse?type=book">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {popularBooks.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-16">
          <div className="container">
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
              <CardContent className="flex flex-col items-center p-12 text-center">
                <h2 className="mb-4 text-3xl font-bold">
                  {t('home_page.cta_title')}
                </h2>
                <p className="mb-6 max-w-md text-muted-foreground">
                  {t('home_page.cta_desc')}
                </p>
                <div className="flex items-center gap-4">
                  <Link href="/register">
                    <Button size="lg">{t('home_page.btn_create_account')}</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">{t('nav.login')}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-12 items-center justify-center rounded-lg overflow-hidden bg-black/5 p-1 border border-black/5">
                <img src="/logo.png" alt="Prefinity" className="h-full w-full object-contain" style={{ imageRendering: 'crisp-edges' }} />
              </div>
              <span className="font-bold text-lg">Prefinity</span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Prefinity. {t('footer.all_rights')}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/browse" className="hover:text-foreground">{t('footer.browse')}</Link>
              <Link href="/ethiopian" className="hover:text-foreground">{t('footer.ethiopian')}</Link>
              <Link href="/about" className="hover:text-foreground">{t('footer.about')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
