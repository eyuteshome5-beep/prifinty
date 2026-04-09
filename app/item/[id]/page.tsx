"use client";

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { ItemCard } from '@/components/item-card';
import { StarRating } from '@/components/star-rating';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { 
  itemsAPI, 
  usersAPI, 
  recommendationsAPI,
  type Item, 
  type ItemDetails, 
  type EthiopianMetadata,
  type ItemRating 
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Film, 
  Music, 
  BookOpen, 
  Heart, 
  Zap, 
  Calendar,
  Clock,
  User,
  Globe,
  Star,
  Loader2,
  ArrowLeft,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ id: string }>;
}

const typeIcons = {
  movie: Film,
  music: Music,
  book: BookOpen,
};

export default function ItemDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [item, setItem] = useState<Item | null>(null);
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [ethiopianMetadata, setEthiopianMetadata] = useState<EthiopianMetadata | null>(null);
  const [ratings, setRatings] = useState<ItemRating[]>([]);
  const [similarItems, setSimilarItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [spotifyId, setSpotifyId] = useState<string | null>(null);

  useEffect(() => {
    fetchItemData();
  }, [id]);

  const fetchItemData = async () => {
    setIsLoading(true);
    
    try {
      const [itemData, similarData] = await Promise.all([
        itemsAPI.getItem(parseInt(id)),
        isAuthenticated ? recommendationsAPI.getSimilarItems(parseInt(id), 4) : Promise.resolve({ similar_items: [] }),
      ]);
      
      setItem(itemData.item);
      setDetails(itemData.details);
      setEthiopianMetadata(itemData.ethiopian_metadata);
      setRatings(itemData.ratings);
      setSimilarItems(similarData.similar_items);

      // Check wishlist status
      if (isAuthenticated) {
        const wishlistData = await usersAPI.getWishlist();
        setIsInWishlist(wishlistData.wishlist.some((w) => w.id === parseInt(id)));
      }

      // Check for Spotify embed if music
      if (itemData.item.item_type === 'music' && itemData.details.spotify_id) {
        setSpotifyId(itemData.details.spotify_id);
      }
    } catch (error) {
      console.error('Failed to fetch item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error(t('item_page.login_required_wishlist'));
      return;
    }

    try {
      if (isInWishlist) {
        await usersAPI.removeFromWishlist(parseInt(id));
        setIsInWishlist(false);
        toast.success(t('item_page.wishlist_remove_success'));
      } else {
        await usersAPI.addToWishlist(parseInt(id));
        setIsInWishlist(true);
        toast.success(t('item_page.wishlist_add_success'));
      }
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleRatingSubmit = async () => {
    if (!isAuthenticated) {
      toast.error(t('item_page.login_required_rate'));
      return;
    }

    if (userRating === 0) {
      toast.error(t('item_page.select_rating_error'));
      return;
    }

    setIsSubmittingRating(true);
    try {
      await usersAPI.rateItem(parseInt(id), userRating, review);
      toast.success(t('item_page.rating_success'));
      setUserRating(0);
      setReview('');
      fetchItemData();
    } catch (error) {
      toast.error('Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('item_page.not_found')}</h1>
          <Link href="/browse">
            <Button>{t('item_page.back_to_browse')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcons[item.item_type];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-8">
        {/* Immersive Background Blur */}
        <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 opacity-30">
          {item.cover_image ? (
            <img 
              src={item.cover_image} 
              alt="" 
              className="w-full h-full object-cover blur-[100px] scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-amber-500/20 blur-[100px]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>

        {/* Back Button */}
        <Link href="/browse" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group">
          <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium italic">{t('item_page.back_to_browse')}</span>
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Image and Quick Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Cover Image */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-[32px] bg-muted mb-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-white/5 group">
                {item.cover_image ? (
                  <img
                    src={item.cover_image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                    <TypeIcon className="h-24 w-24 text-muted-foreground/40" />
                  </div>
                )}
                
                {/* Ethiopian Badge */}
                {item.is_ethiopian && (
                  <Badge className="absolute top-6 left-6 bg-amber-500/90 text-white border-0 backdrop-blur-md px-3 py-1 text-xs">
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    {t('nav.ethiopian')}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant={isInWishlist ? "default" : "outline"} 
                  className="flex-1"
                  onClick={handleWishlistToggle}
                >
                  <Heart className={`mr-2 h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
                  {isInWishlist ? t('item_page.in_wishlist') : t('item_page.add_to_wishlist')}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Meta */}
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge variant="outline" className="capitalize bg-black/20 backdrop-blur-md border-white/10 px-3 py-1">
                  <TypeIcon className="mr-2 h-4 w-4 text-primary" />
                  {t(`nav.${item.item_type}`)}
                </Badge>
                {item.genre && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    {item.genre}
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  <span className="text-2xl font-black">{item.avg_rating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-sm text-muted-foreground italic mt-1">
                    {t('item_page.ratings_count', { count: item.rating_count || 0 })}
                  </span>
                </div>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-none italic">
                {item.title}
              </h1>
              
              {ethiopianMetadata?.amharic_title && (
                <p className="text-3xl font-bold text-amber-500 mb-6 font-serif drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  {ethiopianMetadata.amharic_title}
                </p>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">{t('item_page.description')}</h2>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            )}

            {/* Spotify Player */}
            {spotifyId && (
              <Card className="overflow-hidden border-green-500/20 shadow-green-500/5">
                <CardHeader className="bg-green-500/5 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center text-green-600">
                    <Music className="mr-2 h-4 w-4" /> Listen on Spotify
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <iframe 
                    src={`https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator`} 
                    width="100%" 
                    height="152" 
                    frameBorder="0" 
                    allowFullScreen={false} 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                    className="block"
                  ></iframe>
                </CardContent>
              </Card>
            )}

            {/* Details Card */}
            <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">{t('item_page.details')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {details?.author && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('item_page.author')}:</span>
                    <span className="text-sm font-medium">{details.author}</span>
                  </div>
                )}
                {details?.director && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('item_page.director')}:</span>
                    <span className="text-sm font-medium">{details.director}</span>
                  </div>
                )}
                {details?.artist && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('item_page.artist')}:</span>
                    <span className="text-sm font-medium">{details.artist}</span>
                  </div>
                )}
                {(details?.publication_year || details?.release_year) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('item_page.year')}:</span>
                    <span className="text-sm font-medium">
                      {details.publication_year || details.release_year}
                    </span>
                  </div>
                )}
                {details?.duration_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('item_page.duration')}:</span>
                    <span className="text-sm font-medium">{t('item_page.duration_unit', { min: details.duration_minutes })}</span>
                  </div>
                )}
                {details?.language && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('item_page.language')}:</span>
                    <span className="text-sm font-medium">{details.language}</span>
                  </div>
                )}
                {details?.ethiopian_genre && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">{t('item_page.eth_genre')}:</span>
                    <span className="text-sm font-medium">{details.ethiopian_genre}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ethiopian Metadata */}
            {ethiopianMetadata && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    {t('item_page.eth_heritage')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ethiopianMetadata.cultural_significance && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('item_page.cultural_sig')}</p>
                      <p className="text-sm">{ethiopianMetadata.cultural_significance}</p>
                    </div>
                  )}
                  {ethiopianMetadata.region && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('item_page.region')}</p>
                      <p className="text-sm">{ethiopianMetadata.region}</p>
                    </div>
                  )}
                  {ethiopianMetadata.traditional_genre && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('item_page.trad_genre')}</p>
                      <p className="text-sm">{ethiopianMetadata.traditional_genre}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Rate This Item */}
            <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">{t('item_page.rate_title', { type: t(`nav.${item.item_type}`) })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{t('item_page.your_rating')}:</span>
                  <StarRating
                    rating={userRating}
                    size="lg"
                    interactive
                    onRatingChange={setUserRating}
                  />
                </div>
                <Textarea
                  placeholder={t('item_page.review_placeholder')}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleRatingSubmit} disabled={isSubmittingRating}>
                  {isSubmittingRating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t('item_page.submit_rating')}
                </Button>
              </CardContent>
            </Card>

            {/* User Reviews */}
            {ratings.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">{t('item_page.user_reviews')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ratings.map((rating, index) => (
                      <div key={index}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{rating.username}</p>
                            <StarRating rating={rating.rating} size="sm" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {rating.review && (
                          <p className="mt-2 text-sm text-muted-foreground">{rating.review}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Similar Items */}
        {similarItems.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">{t('item_page.similar_items', { type: t(`nav.${item.item_type}`) })}</h2>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              {similarItems.map((similar) => (
                <ItemCard key={similar.id} item={similar} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
