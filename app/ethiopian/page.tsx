"use client";

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { useLanguage } from '@/lib/language-context';
import { itemsAPI, type Item } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Film,
  Music, 
  BookOpen, 
  Loader2,
  MapPin,
  Compass,
  Globe
} from 'lucide-react';

export default function EthiopianPage() {
  const { t } = useLanguage();
  const [allContent, setAllContent] = useState<Item[]>([]);
  const [movies, setMovies] = useState<Item[]>([]);
  const [music, setMusic] = useState<Item[]>([]);
  const [books, setBooks] = useState<Item[]>([]);
  const [ethiopianGenres, setEthiopianGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [allData, moviesData, musicData, booksData, genresData] = await Promise.all([
        itemsAPI.getEthiopianContent(undefined, 200),
        itemsAPI.getEthiopianContent('movie', 50),
        itemsAPI.getEthiopianContent('music', 50),
        itemsAPI.getEthiopianContent('book', 50),
        itemsAPI.getEthiopianGenres(),
      ]);
      
      let allItems = allData.items || [];
      // Fallback: if backend ethiopian endpoint returns few items, try fetching items flagged as ethiopian
      if (allItems.length < 100) {
        try {
          const fallback = await itemsAPI.getItems({ ethiopian: true, per_page: 200 });
          const fallbackItems = fallback.items || [];
          // Merge unique items by id
          const map = new Map<number, any>();
          [...allItems, ...fallbackItems].forEach((it: any) => map.set(it.id, it));
          allItems = Array.from(map.values());
        } catch (e) {
          console.warn('Fallback ethiopian items fetch failed:', e);
        }
      }

      // Ensure we only show items actually flagged as Ethiopian
      const onlyEthiopian = (arr: any[]) => (arr || []).filter((it) => !!it.is_ethiopian);

      setAllContent(onlyEthiopian(allItems));
      setMovies(onlyEthiopian(moviesData.items || []));
      setMusic(onlyEthiopian(musicData.items || []));
      setBooks(onlyEthiopian(booksData.items || []));
      setEthiopianGenres(genresData.ethiopian_genres || []);
    } catch (error) {
      console.error('Failed to fetch Ethiopian content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-full max-w-7xl rounded-full bg-amber-500/10 blur-[120px] opacity-50" />
        
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Badge className="mb-6 bg-amber-500/20 text-amber-500 border-amber-500/30 px-4 py-1.5 rounded-full backdrop-blur-md">
              <Compass className="mr-2 h-4 w-4 animate-spin-slow" />
              {t('ethiopian_page.hero_badge')}
            </Badge>
            <h1 className="mb-6 text-6xl md:text-8xl font-black tracking-tighter text-balance leading-[0.85]">
              {t('ethiopian_page.hero_title')}
              <span className="text-amber-500 block mt-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"> {t('ethiopian_page.hero_title_accent')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground/80 text-pretty max-w-2xl mx-auto leading-relaxed">
              {t('ethiopian_page.hero_desc')}
            </p>
          </div>
        </div>
      </section>

      <main className="container py-8">
        {/* Ethiopian Music Genres */}
        {ethiopianGenres.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Music className="h-6 w-6 text-purple-500" />
              {t('ethiopian_page.genres_title')}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ethiopianGenres.map((genre) => (
                <Card key={genre} className="group cursor-pointer transition-all duration-500 hover:shadow-[0_20px_40px_rgba(245,158,11,0.1)] hover:-translate-y-1 bg-white/5 backdrop-blur-md border-white/5 hover:border-amber-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-2xl bg-amber-500/10 p-4 transition-transform group-hover:scale-110">
                        <Music className="h-6 w-6 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{genre}</h3>
                        <p className="text-xs text-muted-foreground/70 mt-1 leading-tight">
                          {getGenreDescription(genre, t)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              {t('ethiopian_page.tab_all', { count: allContent.length })}
            </TabsTrigger>
            <TabsTrigger value="movies">
              <Film className="mr-1 h-4 w-4" />
              {t('ethiopian_page.tab_movies', { count: movies.length })}
            </TabsTrigger>
            <TabsTrigger value="music">
              <Music className="mr-1 h-4 w-4" />
              {t('ethiopian_page.tab_music', { count: music.length })}
            </TabsTrigger>
            <TabsTrigger value="books">
              <BookOpen className="mr-1 h-4 w-4" />
              {t('ethiopian_page.tab_books', { count: books.length })}
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="all" className="mt-0">
                {allContent.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {allContent.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState t={t} />
                )}
              </TabsContent>

              <TabsContent value="movies" className="mt-0">
                {movies.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {movies.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState t={t} type={t('nav.movie')} />
                )}
              </TabsContent>

              <TabsContent value="music" className="mt-0">
                {music.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {music.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState t={t} type={t('nav.music')} />
                )}
              </TabsContent>

              <TabsContent value="books" className="mt-0">
                {books.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {books.map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState t={t} type={t('nav.book')} />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* About Ethiopian Content */}
        <section className="mt-24 mb-16">
          <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-white/5 backdrop-blur-xl rounded-[32px] overflow-hidden">
            <CardContent className="p-10 md:p-16">
              <div className="grid gap-12 md:grid-cols-2 items-center">
                <div>
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-amber-500" />
                    {t('ethiopian_page.about_title')}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    {t('ethiopian_page.about_desc')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: Music, text: t('ethiopian_page.feature_music') },
                      { icon: Film, text: t('ethiopian_page.feature_cinema') },
                      { icon: BookOpen, text: t('ethiopian_page.feature_lit') },
                      { icon: Globe, text: t('ethiopian_page.feature_heritage') }
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <feature.icon className="h-5 w-5 text-amber-500 shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full animate-pulse" />
                  <div className="h-64 w-64 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center border-8 border-white/10 shadow-2xl relative z-10 overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    <Globe className="h-32 w-32 text-white drop-shadow-2xl transition-transform group-hover:scale-110 duration-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function EmptyState({ t, type }: { t: any, type?: string }) {
  return (
    <div className="text-center py-20">
      <Compass className="mx-auto h-12 w-12 text-amber-500/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {t('ethiopian_page.empty_title', { type: type || t('ethiopian_page.hero_title_accent') })}
      </h3>
      <p className="text-muted-foreground">
        {t('ethiopian_page.empty_desc')}
      </p>
    </div>
  );
}

function getGenreDescription(genre: string, t: any): string {
  const descriptions: Record<string, string> = {
    'Tizita': t('ethiopian_page.genre_tizita'),
    'Bati': t('ethiopian_page.genre_bati'),
    'Anchihoye': t('ethiopian_page.genre_anchihoye'),
    'Ambassel': t('ethiopian_page.genre_ambassel'),
    'Other': t('ethiopian_page.genre_other'),
  };
  return descriptions[genre] || t('ethiopian_page.genre_other');
}
