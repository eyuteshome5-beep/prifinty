"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { useLanguage } from '@/lib/language-context';
import { itemsAPI, type Item } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Film,
  Music, 
  BookOpen, 
  Loader2,
  MapPin,
  Globe,
  Play,
  Info,
  Flame,
  Star,
  ChevronRight,
  Search,
  X,
  SlidersHorizontal
} from 'lucide-react';

type CategoryTab = 'all' | 'movie' | 'music' | 'book';

export default function EthiopianPage() {
  const { t, lang } = useLanguage();
  const [allContent, setAllContent] = useState<Item[]>([]);
  const [movies, setMovies] = useState<Item[]>([]);
  const [music, setMusic] = useState<Item[]>([]);
  const [books, setBooks] = useState<Item[]>([]);
  const [ethiopianGenres, setEthiopianGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
      if (allItems.length < 100) {
        try {
          const fallback = await itemsAPI.getItems({ ethiopian: true, per_page: 200 });
          const fallbackItems = fallback.items || [];
          const map = new Map<number, any>();
          [...allItems, ...fallbackItems].forEach((it: any) => map.set(it.id, it));
          allItems = Array.from(map.values());
        } catch (e) {
          console.warn('Fallback ethiopian items fetch failed:', e);
        }
      }

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

  // Filter items by search query
  const filterBySearch = useCallback((items: Item[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.creator && item.creator.toLowerCase().includes(q)) ||
      (item.genre && item.genre.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      ((item as any).amharic_title && (item as any).amharic_title.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredMovies = useMemo(() => filterBySearch(movies), [movies, filterBySearch]);
  const filteredMusic = useMemo(() => filterBySearch(music), [music, filterBySearch]);
  const filteredBooks = useMemo(() => filterBySearch(books), [books, filterBySearch]);
  const filteredAll = useMemo(() => filterBySearch(allContent), [allContent, filterBySearch]);

  // Get items for the current active tab
  const currentItems = useMemo(() => {
    switch (activeTab) {
      case 'movie': return filteredMovies;
      case 'music': return filteredMusic;
      case 'book': return filteredBooks;
      default: return filteredAll;
    }
  }, [activeTab, filteredMovies, filteredMusic, filteredBooks, filteredAll]);

  const featuredItem = movies.length > 0 ? movies[0] : (allContent.length > 0 ? allContent[0] : null);

  const tabs: { key: CategoryTab; label: string; icon: any; count: number }[] = [
    { key: 'all', label: 'All', icon: Flame, count: filteredAll.length },
    { key: 'movie', label: 'Movies', icon: Film, count: filteredMovies.length },
    { key: 'music', label: 'Music', icon: Music, count: filteredMusic.length },
    { key: 'book', label: 'Books', icon: BookOpen, count: filteredBooks.length },
  ];

  return (
    <div className="min-h-screen bg-[#141414] text-white selection:bg-[#E50914] selection:text-white">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .tab-active {
          background: linear-gradient(135deg, #E50914 0%, #b80710 100%);
          box-shadow: 0 8px 32px rgba(229, 9, 20, 0.35), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .search-glow {
          box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.4), 0 8px 32px rgba(229, 9, 20, 0.15);
        }
        .card-grid-item {
          animation: fadeUp 0.5s ease forwards;
          opacity: 0;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <Navbar />
      
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-[#141414]">
          <Loader2 className="h-10 w-10 animate-spin text-[#E50914]" />
        </div>
      ) : (
        <>
          {/* Cinematic Hero Section */}
          <section className="relative h-[70vh] w-full flex items-end pb-16 md:pb-24 overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
              style={{ 
                backgroundImage: `url(${featuredItem?.cover_image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1920'})`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/30 to-transparent" />
              <div className="absolute inset-0 bg-black/30" />
            </div>
            
            <div className="container relative z-10 px-4 md:px-0">
              <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex gap-0 w-12 h-7 rounded-md overflow-hidden border border-white/20 shadow-xl">
                    <span className="block h-full w-1/3 bg-[#22c55e]" />
                    <span className="block h-full w-1/3 bg-[#eab308]" />
                    <span className="block h-full w-1/3 bg-[#ef4444]" />
                  </div>
                  <Badge className="bg-[#E50914] text-white hover:bg-[#E50914] border-none px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-[#E50914]/30">
                    {t('ethiopian_page.hero_badge') || "ETHIOPIAN HERITAGE"}
                  </Badge>
                </div>
                
                <h1 className="text-4xl md:text-7xl font-extrabold tracking-tighter text-white mb-4 uppercase italic leading-none drop-shadow-md">
                  {featuredItem ? (
                    (lang === 'am' && (featuredItem.title_am || (featuredItem as any).amharic_title)) ? 
                    (featuredItem.title_am || (featuredItem as any).amharic_title) : 
                    (featuredItem.title || 'Untitled')
                  ) : t('ethiopian_page.hero_title')}
                </h1>
                
                <p className="text-sm md:text-lg text-gray-300/90 mb-6 line-clamp-3 md:line-clamp-4 leading-relaxed font-medium drop-shadow-sm max-w-2xl">
                  {featuredItem ? featuredItem.description : t('ethiopian_page.hero_desc')}
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Button 
                    className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold px-8 py-6 rounded-md flex items-center gap-2.5 text-lg transition-all duration-300 active:scale-95 shadow-xl shadow-[#E50914]/20"
                    onClick={() => {
                      if (featuredItem?.id) {
                        window.open(`/item/${featuredItem.id}`, '_self');
                      }
                    }}
                  >
                    <Play className="h-6 w-6 fill-white" />
                    Explore Title
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-none font-bold px-8 py-6 rounded-md flex items-center gap-2.5 text-lg backdrop-blur-md transition-all duration-300 active:scale-95"
                    onClick={() => {
                      const target = document.getElementById('content-section');
                      if (target) target.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <Info className="h-6 w-6" />
                    Browse Collection
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* ===== SEARCH + CATEGORY TABS + GRID ===== */}
          <main id="content-section" className="container relative z-20 py-8 scroll-mt-20">
            
            {/* Search Bar */}
            <div className="mb-8">
              <div className={`relative max-w-2xl mx-auto transition-all duration-500 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
                <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
                  isSearchFocused 
                    ? 'bg-white/10 border-[#E50914]/50 search-glow' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}>
                  <Search className={`absolute left-4 h-5 w-5 transition-colors duration-300 ${isSearchFocused ? 'text-[#E50914]' : 'text-gray-400'}`} />
                  <input
                    id="ethiopian-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search Ethiopian movies, music, books..."
                    className="w-full bg-transparent text-white placeholder:text-gray-500 py-4 pl-12 pr-12 rounded-2xl outline-none text-base font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-white" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                    Found <span className="text-[#E50914] font-bold">{currentItems.length}</span> results for &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="mb-10">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        group relative flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider
                        transition-all duration-500 ease-out
                        ${isActive 
                          ? 'tab-active text-white scale-[1.03]' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/15'
                        }
                      `}
                    >
                      <TabIcon className={`h-4.5 w-4.5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span>{tab.label}</span>
                      <span className={`
                        inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[10px] font-black
                        transition-all duration-300
                        ${isActive 
                          ? 'bg-white/25 text-white' 
                          : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-gray-300'
                        }
                      `}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Display - different layout per tab */}
            {activeTab === 'all' ? (
              /* ALL tab: show horizontal rails */
              <div className="space-y-12">
                <HorizontalRail 
                  title="🔥 Trending In Ethiopia" 
                  items={filteredAll.slice(0, 15)} 
                  icon={Flame} 
                />
                {filteredMovies.length > 0 && (
                  <HorizontalRail 
                    title="🎬 Ethiopian Movies" 
                    items={filteredMovies} 
                    icon={Film}
                    onSeeAll={() => setActiveTab('movie')}
                  />
                )}
                {filteredMusic.length > 0 && (
                  <HorizontalRail 
                    title="🎵 Ethiopian Music" 
                    items={filteredMusic} 
                    icon={Music}
                    onSeeAll={() => setActiveTab('music')}
                  />
                )}
                {filteredBooks.length > 0 && (
                  <HorizontalRail 
                    title="📚 Ethiopian Literature" 
                    items={filteredBooks} 
                    icon={BookOpen}
                    onSeeAll={() => setActiveTab('book')}
                  />
                )}
              </div>
            ) : (
              /* Category tab: show full grid */
              <div>
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-8">
                  {activeTab === 'movie' && <Film className="h-7 w-7 text-[#E50914]" />}
                  {activeTab === 'music' && <Music className="h-7 w-7 text-[#E50914]" />}
                  {activeTab === 'book' && <BookOpen className="h-7 w-7 text-[#E50914]" />}
                  <h2 className="text-2xl md:text-3xl font-black uppercase italic text-white tracking-tight">
                    {activeTab === 'movie' && 'Ethiopian Cinematic Masterpieces'}
                    {activeTab === 'music' && 'Classical & Modern Ethiopian Melodies'}
                    {activeTab === 'book' && 'Inspiring Ethiopian Literature'}
                  </h2>
                </div>

                {currentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="rounded-full bg-white/5 p-6 mb-4">
                      <Search className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-300 mb-2">No results found</h3>
                    <p className="text-gray-500 text-sm max-w-md">
                      No Ethiopian {activeTab === 'movie' ? 'movies' : activeTab === 'music' ? 'music' : 'books'} match your search. Try different keywords.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {currentItems.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className="card-grid-item"
                        style={{ animationDelay: `${Math.min(idx * 60, 600)}ms` }}
                      >
                        <ItemCard item={item} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Music Modes / Genres Grid - only show on all or music tab */}
            {(activeTab === 'all' || activeTab === 'music') && ethiopianGenres.length > 0 && (
              <section className="pt-12">
                <div className="flex items-center gap-2 mb-6">
                  <Music className="h-6 w-6 text-[#E50914]" />
                  <h2 className="text-2xl font-black uppercase italic text-white tracking-tight">
                    {t('ethiopian_page.genres_title') || "Traditional Musical Scales (Qenet)"}
                  </h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {ethiopianGenres.map((genre) => (
                    <Card key={genre} className="group cursor-pointer transition-all duration-500 hover:shadow-[0_20px_40px_rgba(229,9,20,0.15)] hover:-translate-y-1 bg-white/5 backdrop-blur-md border-white/5 hover:border-[#E50914]/30 rounded-2xl overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="rounded-2xl bg-[#E50914]/15 p-4 transition-transform group-hover:scale-110">
                            <Music className="h-6 w-6 text-[#E50914]" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-lg text-white">{genre}</h3>
                            <p className="text-xs text-gray-400/80 mt-1 leading-tight font-medium">
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

            {/* About Ethiopian Content Showcase */}
            <section id="about-section" className="scroll-mt-24 pt-12 pb-16">
              <Card className="bg-gradient-to-br from-indigo-950/20 via-slate-900/10 to-transparent border-white/5 backdrop-blur-xl rounded-[32px] overflow-hidden">
                <CardContent className="p-10 md:p-16">
                  <div className="grid gap-12 md:grid-cols-2 items-center">
                    <div>
                      <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase italic text-white tracking-tight">
                        <MapPin className="h-8 w-8 text-[#E50914]" />
                        {t('ethiopian_page.about_title') || "Ethiopian Cultural Signature"}
                      </h2>
                      <p className="text-lg text-gray-300 leading-relaxed font-medium mb-8">
                        {t('ethiopian_page.about_desc')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { icon: Music, text: t('ethiopian_page.feature_music') || "Scales (Qenet)" },
                          { icon: Film, text: t('ethiopian_page.feature_cinema') || "Cinematic Tales" },
                          { icon: BookOpen, text: t('ethiopian_page.feature_lit') || "Amharic Classics" },
                          { icon: Globe, text: t('ethiopian_page.feature_heritage') || "Global Heritage" }
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                            <feature.icon className="h-5 w-5 text-[#E50914] shrink-0" />
                            <span className="text-xs font-bold text-gray-300">{feature.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-[#E50914]/10 blur-[100px] rounded-full animate-pulse" />
                      <div className="h-64 w-64 rounded-full bg-gradient-to-br from-[#E50914] to-[#80050a] flex items-center justify-center border-8 border-white/10 shadow-2xl relative z-10 overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                        <Globe className="h-32 w-32 text-white drop-shadow-2xl transition-transform group-hover:scale-110 duration-500" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </>
      )}
    </div>
  );
}

interface RailProps {
  title: string;
  items: Item[];
  icon: any;
  onSeeAll?: () => void;
}

function HorizontalRail({ title, items, icon: Icon, onSeeAll }: RailProps) {
  if (items.length === 0) return null;
  
  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[#E50914]" />
          <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-wider italic text-white">
            {title}
          </h2>
        </div>
        {onSeeAll && (
          <button 
            onClick={onSeeAll}
            className="text-xs font-bold text-[#E50914] hover:text-[#E50914]/80 flex items-center gap-0.5 cursor-pointer uppercase tracking-widest transition-opacity duration-300"
          >
            See All <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-4 md:px-0 no-scrollbar scroll-smooth snap-x">
          {items.map((item) => (
            <div key={item.id} className="w-[190px] md:w-[230px] shrink-0 snap-start transition-all duration-300 hover:scale-[1.03] hover:z-20">
              <ItemCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getGenreDescription(genre: string, t: any): string {
  const descriptions: Record<string, string> = {
    'Tizita': t('ethiopian_page.genre_tizita') || 'Scale of nostalgia and longing.',
    'Bati': t('ethiopian_page.genre_bati') || 'Warm, uplifting folk modes.',
    'Anchihoye': t('ethiopian_page.genre_anchihoye') || 'Epic and spiritual scales.',
    'Ambassel': t('ethiopian_page.genre_ambassel') || 'Highland narrative and historic modes.',
    'Other': t('ethiopian_page.genre_other') || 'Traditional fusion.',
  };
  return descriptions[genre] || t('ethiopian_page.genre_other') || 'Traditional scale.';
}
