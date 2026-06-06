"use client";
 
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { itemsAPI, usersAPI, discoveryAPI, type Item, type Pagination } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
 
function CatalogSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i} className="overflow-hidden border-white/5 bg-white/5 backdrop-blur-md h-full">
          <Skeleton className="aspect-[3/4] w-full bg-white/10" />
          <CardContent className="p-4 md:p-5 space-y-3">
            <Skeleton className="h-5 w-3/4 bg-white/10" />
            <Skeleton className="h-4 w-1/2 bg-white/10" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-6 w-16 bg-white/10 rounded-full" />
              <Skeleton className="h-8 w-8 bg-white/10 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Film, 
  Music, 
  BookOpen, 
  Loader2,
  Globe,
  ChevronLeft,
  ChevronRight,
  X,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';

function BrowseContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [type, setType] = useState<string>(searchParams.get('type') || '');
  const [genre, setGenre] = useState<string>('');
  const [ethiopianOnly, setEthiopianOnly] = useState(false);
  const [sort, setSort] = useState<string>('popularity');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      setType(typeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchItems();
    fetchGenres();
  }, [type, genre, ethiopianOnly, sort, page]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated]);

  const fetchItems = async () => {
    setIsLoading(true);
    
    try {
      const data = await itemsAPI.getItems({
        type: type || undefined,
        genre: genre || undefined,
        ethiopian: ethiopianOnly,
        sort,
        page,
        per_page: 12,
      });
      let combinedResults: any[] = [...data.items];

      // Automatically inject live global trending items when browsing without a search
      if (page === 1 && !searchQuery) {
        try {
          const trendingType = type && type !== 'all' ? type : 'movie';
          const trendingData = await discoveryAPI.getTrending(trendingType);
          if (trendingData.results && trendingData.results.length > 0) {
            const localExternalIds = new Set(combinedResults.map(i => i.external_id).filter(Boolean));
            const newTrending = trendingData.results.filter((t: any) => !localExternalIds.has(t.external_id));
            combinedResults = [...combinedResults, ...newTrending];
          }
        } catch (err: any) {
          console.error("Live auto-populate failed:", err);
          toast.error("Global Feed Error: " + (err.message || "Invalid API Keys in Settings"));
        }
      }

      setItems(combinedResults as Item[]);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItems([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const data = await itemsAPI.getGenres(type || undefined);
      setGenres(data.genres);
    } catch (error) {
      console.error('Failed to fetch genres:', error);
      setGenres([]);
    }
  };

  const fetchWishlist = async () => {
    try {
      const data = await usersAPI.getWishlist();
      setWishlistIds(new Set(data.wishlist.map((item) => item.id)));
    } catch (error: any) {
      if (!error.message?.includes('Authentication required') && !error.message?.includes('401')) {
        console.error('Failed to fetch wishlist:', error);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchItems();
      return;
    }

    if (!isAuthenticated) {
      toast.error(t('browse.toast_search_login'));
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch Local DB Results
      const data = await itemsAPI.search(searchQuery, type || undefined);
      let combinedResults: any[] = [...data.results];

      // 2. Fetch Live Global Results (TMDB / Spotify)
      try {
        const globalData = await discoveryAPI.searchExternalPublic(type || 'movie', searchQuery);
        if (globalData.results && globalData.results.length > 0) {
          // Add global results that aren't already locally mapped
          const localExternalIds = new Set(combinedResults.map(i => i.external_id).filter(Boolean));
          const newGlobalItems = globalData.results.filter((g: any) => !localExternalIds.has(g.external_id));
          combinedResults = [...combinedResults, ...newGlobalItems];
        }
      } catch (extErr: any) {
        console.error("Live Global Search Failed:", extErr);
        toast.error("External search failed: " + (extErr.message || "Invalid API Keys"));
      }

      setItems(combinedResults as Item[]);
      setPagination(null);
    } catch (error) {
      toast.error(t('browse.toast_search_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync a TMDB card to DB when they wish to interact
  const handleItemSyncAndNavigate = async (item: any) => {
    // If it's already a full local item with an ID, we just need the Link to perform naturally
    // If it's an external-only item, sync it before proceeding
    if (!item.id) {
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
            release_year: item.release_year,
            creator: item.creator,
            album: (item as any).album
          });
          toast.success('Successfully synchronized!', { id: toastId });
          // Force hard navigation to new item page
          window.location.href = `/item/${result.item_id}`;
       } catch (err) {
          toast.error('Sync failed', { id: toastId });
       }
    }
  };

  const handleWishlistToggle = async (itemId: number) => {
    if (!isAuthenticated) {
      toast.error(t('browse.toast_wishlist_login'));
      return;
    }

    try {
      if (wishlistIds.has(itemId)) {
        await usersAPI.removeFromWishlist(itemId);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        toast.success(t('browse.toast_wishlist_remove'));
      } else {
        await usersAPI.addToWishlist(itemId);
        setWishlistIds((prev) => new Set([...prev, itemId]));
        toast.success(t('browse.toast_wishlist_add'));
      }
    } catch (error) {
      toast.error(t('browse.toast_wishlist_failed'));
    }
  };

  const clearFilters = () => {
    setType('');
    setGenre('');
    setEthiopianOnly(false);
    setSort('popularity');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = type || genre || ethiopianOnly || searchQuery;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('browse.title')}</h1>
          <p className="text-muted-foreground">
            {t('browse.subtitle')}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('browse.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-lg h-12"
              />
            </div>
            <Button onClick={handleSearch} className="rounded-xl h-12 px-6 shadow-lg shadow-primary/20">
              {t('browse.search_button')}
            </Button>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] border-white/10 bg-white/5">
                  <SelectValue placeholder={t('browse.filter_all_types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('browse.filter_all_types')}</SelectItem>
                  <SelectItem value="movie">
                    <span className="flex items-center gap-2">
                      <Film className="h-4 w-4" /> {t('browse.filter_movies')}
                    </span>
                  </SelectItem>
                  <SelectItem value="music">
                    <span className="flex items-center gap-2">
                      <Music className="h-4 w-4" /> {t('browse.filter_music')}
                    </span>
                  </SelectItem>
                  <SelectItem value="book">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> {t('browse.filter_books')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Genre Filter */}
            <Select value={genre} onValueChange={(v) => { setGenre(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] border-white/10 bg-white/5">
                <SelectValue placeholder={t('browse.filter_all_genres')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('browse.filter_all_genres')}</SelectItem>
                {genres.map((g, idx) => (
                  <SelectItem key={`${g}-${idx}`} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] border-white/10 bg-white/5">
                <SelectValue placeholder={t('browse.sort_by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">{t('browse.sort_popularity')}</SelectItem>
                <SelectItem value="rating">{t('browse.sort_rating')}</SelectItem>
                <SelectItem value="recent">{t('browse.sort_recent')}</SelectItem>
                <SelectItem value="title">{t('browse.sort_alphabetical')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Ethiopian Only */}
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              <Checkbox 
                id="ethiopian" 
                checked={ethiopianOnly}
                onCheckedChange={(checked) => { 
                  setEthiopianOnly(!!checked); 
                  setPage(1); 
                }}
                className="border-amber-500/50 data-[state=checked]:bg-amber-500"
              />
              <Label htmlFor="ethiopian" className="flex items-center gap-2 cursor-pointer text-amber-500 font-medium text-sm">
                <Globe className="h-4 w-4" />
                {t('browse.ethiopian_only')}
              </Label>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                <X className="mr-1 h-4 w-4" />
                {t('browse.clear_filters')}
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {type && type !== 'all' && (
                <Badge variant="secondary" className="capitalize">
                  {t('browse.filter_type_label', { type: t(`nav.${type}`) })}
                </Badge>
              )}
              {genre && genre !== 'all' && (
                <Badge variant="secondary">
                  {t('browse.filter_genre_label', { genre })}
                </Badge>
              )}
              {ethiopianOnly && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                  <Globe className="mr-1 h-3 w-3" />
                  {t('nav.ethiopian')}
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary">
                  {t('browse.filter_search_label', { query: searchQuery })}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <CatalogSkeleton />
        ) : items.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {items.map((item, idx) => (
                <div key={item.id ? `local-${item.id}` : `ext-${(item as any).external_id || idx}`} onClick={() => handleItemSyncAndNavigate(item)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                  <ItemCard
                    item={item}
                    isExternal={!item.id}
                    onWishlistClick={handleWishlistToggle}
                    isInWishlist={item.id ? wishlistIds.has(item.id) : false}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('browse.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('browse.page_of', { page, total: pagination.pages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('browse.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('browse.no_results')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('browse.adjust_filters')}
            </p>
            <Button onClick={clearFilters}>{t('browse.clear_filters')}</Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
