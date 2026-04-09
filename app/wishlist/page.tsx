"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { usersAPI, type WishlistItem } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  Film, 
  Music, 
  BookOpen, 
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated]);

  const fetchWishlist = async () => {
    try {
      const data = await usersAPI.getWishlist();
      setWishlist(data.wishlist);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await usersAPI.removeFromWishlist(itemId);
      setWishlist((prev) => prev.filter((item) => item.id !== itemId));
      toast.success(t('wishlist_page.toast_remove_success'));
    } catch (error) {
      toast.error(t('wishlist_page.toast_remove_failed'));
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const movies = wishlist.filter((item) => item.item_type === 'movie');
  const music = wishlist.filter((item) => item.item_type === 'music');
  const books = wishlist.filter((item) => item.item_type === 'book');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            {t('wishlist_page.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('wishlist_page.subtitle', { count: wishlist.length })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : wishlist.length > 0 ? (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                {t('wishlist_page.tab_all', { count: wishlist.length })}
              </TabsTrigger>
              <TabsTrigger value="movies">
                <Film className="mr-1 h-4 w-4" />
                {t('wishlist_page.tab_movies', { count: movies.length })}
              </TabsTrigger>
              <TabsTrigger value="music">
                <Music className="mr-1 h-4 w-4" />
                {t('wishlist_page.tab_music', { count: music.length })}
              </TabsTrigger>
              <TabsTrigger value="books">
                <BookOpen className="mr-1 h-4 w-4" />
                {t('wishlist_page.tab_books', { count: books.length })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {wishlist.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onWishlistClick={handleRemove}
                    isInWishlist={true}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="movies" className="mt-0">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {movies.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onWishlistClick={handleRemove}
                    isInWishlist={true}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="music" className="mt-0">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {music.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onWishlistClick={handleRemove}
                    isInWishlist={true}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="books" className="mt-0">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {books.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onWishlistClick={handleRemove}
                    isInWishlist={true}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-20">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('wishlist_page.empty_title')}</h3>
            <p className="text-muted-foreground">
              {t('wishlist_page.empty_desc')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
