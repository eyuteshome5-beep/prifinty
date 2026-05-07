import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Heart, Film, Music, BookOpen, Loader2, Globe, Play, ExternalLink, Copy } from 'lucide-react';
import { type Item, wishlistAPI, itemsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ItemCardProps {
  item: Item;
  showScore?: boolean;
  score?: number;
  explanation?: string;
  onWishlistClick?: (itemId: number) => void;
  isInWishlist?: boolean;
  isWishlistItem?: boolean;
  onRemove?: () => void;
  isExternal?: boolean;
}

const typeIcons = {
  movie: Film,
  music: Music,
  book: BookOpen,
};

export function ItemCard({ 
  item, 
  showScore, 
  score, 
  explanation,
  onWishlistClick,
  isInWishlist: initialInWishlist,
  isWishlistItem,
  onRemove,
  isExternal
}: ItemCardProps) {
  const { t } = useLanguage();
  const { isAuthenticated, refreshUser } = useAuth();
  const [isFavorite, setIsFavorite] = useState(initialInWishlist || isWishlistItem);
  const [isPending, setIsPending] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const streamingLinks = item.streaming_links || [];
  
  const TypeIcon = typeIcons[item.item_type] || Film;

  // Normalize / format score so it never displays above 100%
  const formattedScore = (() => {
    if (typeof score !== 'number' || isNaN(score)) return null;
    let pct = 0;
    if (score <= 1) {
      // fraction 0..1
      pct = Math.round(Math.max(0, score) * 100);
    } else if (score <= 100) {
      // already a percent value
      pct = Math.round(Math.max(0, score));
    } else {
      // large numbers: try interpreting as basis points, fallback to cap
      pct = Math.round(Math.max(0, Math.min(score / 100, 1)) * 100);
    }
    return Math.min(pct, 100);
  })();

  useEffect(() => {
    if (isAuthenticated && initialInWishlist === undefined && !isWishlistItem && !isExternal && item.id) {
      checkWishlistStatus();
    }
  }, [isAuthenticated, item.id, isExternal]);

  useEffect(() => {
    let mounted = true;
    const fetchSpotify = async () => {
      if (!item?.id) return;
      setSpotifyLoading(true);
      try {
        const res = await itemsAPI.getSpotifyUrl(item.id);
        if (!mounted) return;
        if (res && (res as any).spotify_id) {
          const sid = (res as any).spotify_id;
          let finalUrl = sid;
          if (!sid.startsWith('http')) finalUrl = `https://open.spotify.com/track/${sid}`;
          setSpotifyUrl(finalUrl);
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setSpotifyLoading(false);
      }
    };

    if (item?.item_type === 'music') fetchSpotify();
    return () => {
      mounted = false;
    };
  }, [item?.id, item?.item_type]);

  const checkWishlistStatus = async () => {
    if (!item.id) return;
    try {
      const { in_wishlist } = await wishlistAPI.checkWishlist(item.id);
      setIsFavorite(in_wishlist);
    } catch (error) {}
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please login to save items");
      return;
    }

    setIsPending(true);
    try {
      if (isFavorite) {
        await wishlistAPI.removeFromWishlist(item.id);
        setIsFavorite(false);
        toast.success("Removed from wishlist");
        if (onRemove) onRemove();
      } else {
        await wishlistAPI.addToWishlist(item.id);
        setIsFavorite(true);
        toast.success("Added to wishlist");
      }
      if (onWishlistClick) onWishlistClick(item.id);
      // Refresh global profile and notify app to update counts
      try {
        await refreshUser();
      } catch {}
      try {
        window.dispatchEvent(new Event('prefinity:data-changed'));
      } catch {}
    } catch (error) {
      toast.error("Wishlist update failed");
    } finally {
      setIsPending(false);
    }
  };

  const CardImage = (
    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
      {item.cover_image ? (
        <img
          src={item.cover_image}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-700"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-background">
          <TypeIcon className="h-16 w-16 text-muted-foreground/40" />
        </div>
      )}
      
      {/* Badges Overlay */}
      <div className="absolute top-2 left-2 flex flex-col gap-2">
        {isExternal && (
          <Badge className="bg-indigo-500/80 backdrop-blur-md text-white border-white/20 shadow-md font-bold">
            <Globe className="mr-1 h-3 w-3" />
            GLOBAL
          </Badge>
        )}
        {item.is_ethiopian && (
          <Badge className="bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 text-white border-white/20 shadow-md font-bold">
            <Globe className="mr-1 h-3 w-3 text-white animate-pulse" />
            ETHIOPIAN
          </Badge>
        )}
      </div>
      
      {/* Rating & Score Overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        {item.avg_rating > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/10 shadow-lg group-hover:bg-primary/80 transition-colors">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{item.avg_rating.toFixed(1)}</span>
          </div>
        )}
        
        {showScore && formattedScore !== null && (
          <div className="rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 px-3 py-1 text-[10px] font-black text-white shadow-lg border border-white/20 uppercase tracking-tighter">
            {formattedScore}% Match
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-2 border-white/5 bg-white/5 backdrop-blur-md h-full">
      {/* Wishlist Button */}
      {!isExternal && (
        <Button
          variant="ghost" size="icon" disabled={isPending}
          className={cn(
            "absolute top-2 right-2 z-20 h-9 w-9 rounded-xl backdrop-blur-xl border border-white/10 transition-all duration-300",
            isFavorite ? "bg-rose-500/20 text-rose-500 border-rose-500/30" : "bg-black/20 text-white hover:bg-black/40"
          )}
          onClick={handleWishlistToggle}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4 transition-all duration-500", isFavorite && "fill-rose-500 scale-110")} />}
        </Button>
      )}

      {isExternal ? CardImage : <Link href={`/item/${item.id}`}>{CardImage}</Link>}
      
      <CardContent className="p-4 md:p-5">
        <div className="min-w-0 flex-1">
          {isExternal ? (
            <h3 className="truncate font-bold text-base md:text-lg group-hover:text-primary transition-colors tracking-tight line-clamp-1">{item.title}</h3>
          ) : (
            <Link href={`/item/${item.id}`}>
              <h3 className="truncate font-bold text-base md:text-lg group-hover:text-primary transition-colors tracking-tight line-clamp-1">{item.title}</h3>
            </Link>
          )}
          
          {item.creator && (
            <p className="truncate text-xs text-muted-foreground font-medium uppercase tracking-wider opacity-60 mt-0.5">
              {item.creator}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] font-black uppercase border-white/10 opacity-70">
                {t(`nav.${item.item_type}`)}
              </Badge>
              {item.genre && (
                <Badge variant="secondary" className="text-[10px] font-bold bg-white/5 hover:bg-white/10 transition-colors">
                  {item.genre}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {spotifyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : spotifyUrl ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try { window.open(spotifyUrl, '_blank', 'noopener'); } catch {}
                  }}
                  aria-label="Play on Spotify"
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : null}

              {/* Streaming links (other providers) or fallback link so every item has a link */}
              {streamingLinks.length > 0 ? (
                <div className="flex items-center gap-1">
                  {streamingLinks.slice(0, 3).map((l, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try { window.open(l.url, '_blank', 'noopener'); } catch {}
                        }}
                        title={l.provider}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            if (navigator && (navigator as any).clipboard && l.url) {
                              (navigator as any).clipboard.writeText(l.url);
                              try { window.dispatchEvent(new CustomEvent('prefinity:copied', { detail: l.url })); } catch {}
                            }
                          } catch (err) {}
                        }}
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {streamingLinks.length > 3 && (
                    <Badge className="text-xs">+{streamingLinks.length - 3}</Badge>
                  )}
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      const url = item && item.id ? `/item/${item.id}` : '/';
                      window.open(url, '_blank', 'noopener');
                    } catch {}
                  }}
                  title="Open item details"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {explanation && (
          <div className="mt-4 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] text-primary leading-tight font-medium line-clamp-2 italic">
              {explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
