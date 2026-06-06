"use client";

import { useEffect, useState, use, useRef } from 'react';
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
  type ItemRating,
  type ExternalLink,
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
  Activity, 
  Calendar,
  Clock,
  User,
  Globe,
  Star as StarIcon,
  ExternalLink as ExternalLinkIcon,
  Loader2,
  ArrowLeft,
  Send,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ThumbsDown
   } from 'lucide-react';
   import { Copy } from 'lucide-react';
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
  const { isAuthenticated, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
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
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isNotInterested, setIsNotInterested] = useState(false);
  const [lastfmUrl, setLastfmUrl] = useState<string | null>(null);
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);

  // Music Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const playlist = [
    {
      title: "Tizita (Acoustic Masinko)",
      artist: "Traditional Instrumental",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
      title: "Bati (Krar Improvisation)",
      artist: "Ethiopian Folk Ensemble",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    {
      title: "Ambassel (Washint Flute)",
      artist: "Traditional Winds",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    }
  ];

  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (item?.item_type === 'music') {
      const newAudio = new Audio(playlist[currentTrackIndex].url);
      setAudio(newAudio);
      newAudio.volume = isMuted ? 0 : volume;

      const updateTime = () => {
        if (newAudio.currentTime >= 20) {
          newAudio.pause();
          newAudio.currentTime = 0;
          setCurrentTime(0);
          setIsPlaying(false);
          toast.success("20-second premium preview completed! Unlock full streaming with credits.");
        } else {
          setCurrentTime(newAudio.currentTime);
        }
      };
      
      const updateDuration = () => {
        setDuration(20); // Fixed 20-second preview duration for perfect streaming snippet
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      newAudio.addEventListener('timeupdate', updateTime);
      newAudio.addEventListener('loadedmetadata', updateDuration);
      newAudio.addEventListener('ended', handleEnded);

      return () => {
        try {
          newAudio.pause();
        } catch (e) {}
        newAudio.removeEventListener('timeupdate', updateTime);
        newAudio.removeEventListener('loadedmetadata', updateDuration);
        newAudio.removeEventListener('ended', handleEnded);
      };
    }
  }, [item, currentTrackIndex]);

  const togglePlay = () => {
    if (!audio) return;
    
    if (isPlaying) {
      // If a play Promise is currently resolving, wait for it before calling pause()
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            audio.pause();
            setIsPlaying(false);
          })
          .catch(() => {
            audio.pause();
            setIsPlaying(false);
          });
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromiseRef.current = playPromise;
        setIsPlaying(true);
        
        playPromise
          .then(() => {
            playPromiseRef.current = null;
          })
          .catch((err) => {
            playPromiseRef.current = null;
            setIsPlaying(false);
            
            // Suppress the warning message for standard user-initiated aborts
            if (err.name !== 'AbortError') {
              console.error("Audio play failed:", err);
            } else {
              console.log("Audio play request safely interrupted (user paused/switched tracks).");
            }
          });
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audio) {
      audio.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    fetchItemData();
  }, [id]);

  const fetchItemData = async (isRetry = false) => {
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
      setExternalLinks(itemData.external_links || (itemData.item && (itemData.item.streaming_links || [])) || []);

      // Check wishlist status
      if (isAuthenticated) {
        const wishlistData = await usersAPI.getWishlist();
        setIsInWishlist(wishlistData.wishlist.some((w) => w.id === parseInt(id)));
      }

      // Check for Last.fm link (previously used spotify_id column)
      if (itemData.item.item_type === 'music' && itemData.details && itemData.details.spotify_id) {
        setLastfmUrl(itemData.details.spotify_id);
      }
    } catch (error: any) {
      // Smart Retry: If not found, wait 1.5s and try one last time (handles DB sync latency)
      if (!isRetry && (error.message?.includes('404') || error.message?.includes('not found'))) {
        console.log("Item not found, retrying in 1.5s...");
        setTimeout(() => fetchItemData(true), 1500);
        return;
      }
      if (!error.message?.includes('Authentication required') && !error.message?.includes('401')) {
        console.error('Failed to fetch item:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const displayProvider = (p: string) => {
    if (!p) return '';
    return p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
      // Update global state (profile/wishlist count) so other pages refresh
      try {
        await refreshUser();
      } catch {}
      try {
        window.dispatchEvent(new Event('prefinity:data-changed'));
      } catch {}
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
      // Optimistic logic would go here if we were using a state for ratings list, 
      // but for now we'll just clear inputs immediately for a snappy feel
      const ratingValue = userRating;
      setUserRating(0); 
      setReview('');
      
      await usersAPI.rateItem(parseInt(id), ratingValue, review);
      toast.success(t('item_page.rating_success'));
      // Refresh local item data and global profile/stats
      fetchItemData();
      try {
        await refreshUser();
      } catch {}
      try {
        window.dispatchEvent(new Event('prefinity:data-changed'));
      } catch {}
    } catch (error) {
      toast.error('Failed to submit rating');
      // On error, we could restore the values if needed
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleNotInterested = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to provide feedback");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await recommendationsAPI.provideFeedback(parseInt(id), 'not_helpful');
      setIsNotInterested(true);
      toast.success("Feedback saved. We won't recommend this to you again!");
      setTimeout(() => {
        window.location.href = '/browse';
      }, 1500);
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
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
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover blur-[28px] scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-amber-500/20 blur-[20px]" />
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
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                    <TypeIcon className="h-24 w-24 text-muted-foreground/40" />
                  </div>
                )}
                
                {/* Ethiopian Badge */}
                {item.is_ethiopian && (
                  <Badge className="absolute top-6 left-6 bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 text-white border-0 backdrop-blur-md px-4 py-1.5 text-[10px] font-black shadow-2xl animate-pulse">
                    <Globe className="mr-2 h-4 w-4" />
                    ETHIOPIAN HERITAGE
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
                  <StarIcon className="h-5 w-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  <span className="text-2xl font-black">{item.avg_rating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-sm text-muted-foreground italic mt-1">
                    {t('item_page.ratings_count', { count: item.rating_count || 0 })}
                  </span>
                </div>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-none italic">
                {lang === 'am' && item.title_am ? item.title_am : item.title}
              </h1>
              
              {ethiopianMetadata?.amharic_title && (
                <p className="text-3xl font-bold text-amber-500 mb-6 font-serif drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  {ethiopianMetadata.amharic_title}
                </p>
              )}
            </div>

            {/* Detailed Description & Analysis */}
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
              <Card className="bg-white/5 backdrop-blur-md border border-white/5 shadow-2xl p-6 overflow-hidden rounded-[24px]">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-primary">
                  <Activity className="h-5 w-5" />
                  {t('item_page.description')}
                </h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {lang === 'am' && item.description_am ? item.description_am : item.description}
                  </p>
                </div>
              </Card>

              {/* Music Streaming Player Card */}
              {item.item_type === 'music' && (
                <Card className="bg-gradient-to-br from-violet-950/40 via-background to-purple-950/40 backdrop-blur-md border border-purple-500/20 shadow-2xl p-6 rounded-[24px] overflow-hidden relative group">
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes bar-bounce {
                      0% { transform: scaleY(0.15); }
                      100% { transform: scaleY(1); }
                    }
                    .bar-animated {
                      animation: bar-bounce 0.6s ease-in-out infinite alternate;
                      transform-origin: bottom;
                    }
                    @keyframes spin-record {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                    .animate-spin-record {
                      animation: spin-record 12s linear infinite;
                    }
                  `}} />
                  
                  {/* Visual Glow */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-700" />
                  
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-400">
                    <Music className="h-5 w-5 animate-pulse" />
                    Live Audio Streaming Preview
                  </h3>

                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Spinning Vinyl Record Visual */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <div className="absolute inset-0 bg-black rounded-full border-4 border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                        {item.cover_image ? (
                          <img
                            src={item.cover_image}
                            alt=""
                            className={`w-full h-full object-cover rounded-full select-none`}
                            style={{
                              animation: isPlaying ? 'spin-record 12s linear infinite' : 'none',
                            }}
                          />
                        ) : (
                          <Music className="w-12 h-12 text-purple-500/50" />
                        )}
                        {/* Center Hole */}
                        <div className="absolute w-6 h-6 bg-background rounded-full border-2 border-white/10 flex items-center justify-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        </div>
                      </div>
                    </div>

                    {/* Player Controls */}
                    <div className="flex-1 w-full space-y-4">
                      <div>
                        <h4 className="text-xl font-bold text-white tracking-tight truncate">
                          {playlist[currentTrackIndex].title}
                        </h4>
                        <p className="text-sm text-purple-300 font-medium truncate">
                          {playlist[currentTrackIndex].artist}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground font-mono">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div 
                          className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden cursor-pointer relative"
                          onClick={(e) => {
                            if (!audio) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            audio.currentTime = percent * duration;
                            setCurrentTime(audio.currentTime);
                          }}
                        >
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-100"
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={togglePlay}
                            className="h-12 w-12 rounded-full bg-purple-500/10 hover:bg-purple-500 hover:text-white border border-purple-500/20 text-purple-400 transition-all flex items-center justify-center shadow-lg"
                          >
                            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                          </Button>
                          
                          {/* Track Selection Tabs */}
                          <div className="flex gap-1.5 bg-black/20 p-1 rounded-lg border border-white/5">
                            {playlist.map((t, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setCurrentTrackIndex(idx);
                                  setIsPlaying(false);
                                  setCurrentTime(0);
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                                  currentTrackIndex === idx
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'text-muted-foreground hover:text-white'
                                }`}
                              >
                                Track {idx + 1}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Volume & Visualizer */}
                        <div className="flex items-center gap-4 flex-1 md:flex-initial md:ml-auto">
                          {/* Audio Wave Visualizer */}
                          <div className="flex items-end gap-0.5 h-8 px-2 overflow-hidden">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-[3px] bg-purple-400 rounded-full ${isPlaying ? 'bar-animated' : ''}`}
                                style={{
                                  height: isPlaying ? '100%' : '15%',
                                  animationDelay: `${i * 0.08}s`,
                                  opacity: isPlaying ? 0.8 : 0.3,
                                  boxShadow: isPlaying ? '0 0 6px rgba(168,85,247,0.4)' : 'none'
                                }}
                              />
                            ))}
                          </div>

                          {/* Volume controls */}
                          <div className="flex items-center gap-2">
                            <button onClick={toggleMute} className="text-muted-foreground hover:text-purple-400 transition-colors">
                              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Video Trailer / Preview Section */}
              {item.item_type !== 'movie' && externalLinks.some(l => l.url.includes('youtube.com') || l.url.includes('youtu.be')) && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Film className="h-5 w-5 text-rose-500" />
                    Video Preview
                  </h2>
                  <div className="aspect-video w-full overflow-hidden rounded-[24px] border border-white/10 bg-black/40 shadow-2xl">
                    {(() => {
                      const youtubeLink = externalLinks.find(l => l.url.includes('youtube.com') || l.url.includes('youtu.be'));
                      if (!youtubeLink) return null;
                      const videoId = youtubeLink.url.includes('v=') 
                        ? youtubeLink.url.split('v=')[1].split('&')[0]
                        : youtubeLink.url.split('/').pop();
                      return (
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Last.fm Link (stored in legacy `spotify_id` field) */}
            {lastfmUrl && (
              <Card className="overflow-hidden border-sky-500/20 shadow-sky-500/5">
                <CardHeader className="bg-sky-500/5 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center text-sky-600">
                    <Music className="mr-2 h-4 w-4" /> View on Last.fm
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <a
                    href={
                      lastfmUrl && lastfmUrl.startsWith('http')
                        ? lastfmUrl
                        : `https://www.last.fm/search?q=${encodeURIComponent(item.title + ' ' + (details?.artist || ''))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Open on Last.fm
                  </a>
                </CardContent>
              </Card>
            )}

              {/* External streaming / preview links returned from backend */}
              {externalLinks.length > 0 && (
                <Card className="overflow-hidden border-sky-500/20 shadow-sky-500/5">
                  <CardHeader className="bg-sky-500/5 pb-4">
                    <CardTitle className="text-sm font-semibold flex items-center text-sky-600">
                      <ExternalLinkIcon className="mr-2 h-4 w-4" />
                      {t('item_page.streaming_links')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      {externalLinks.map((l, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary underline"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                            <span className="font-medium">{displayProvider(l.provider)}</span>
                          </a>
                          <span className="text-xs text-muted-foreground ml-2 truncate max-w-[50%]">{l.url}</span>
                          <button
                            className="ml-auto text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                            onClick={() => {
                              try {
                                if (navigator && (navigator as any).clipboard && l.url) {
                                  (navigator as any).clipboard.writeText(l.url);
                                  alert('Link copied to clipboard');
                                }
                              } catch (err) {}
                            }}
                            title="Copy link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
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
                    <Activity className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">{t('item_page.eth_genre')}:</span>
                    <span className="text-sm font-medium">{details.ethiopian_genre}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ethiopian Metadata / Cultural Context */}
            {ethiopianMetadata && (
              <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 delay-300">
                <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/10">
                  <CardTitle className="text-xl flex items-center gap-3 text-emerald-400">
                    <Globe className="h-6 w-6" />
                    {t('item_page.eth_heritage')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {ethiopianMetadata.cultural_significance && (
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase text-emerald-500/60 tracking-widest leading-none mb-3">
                        {t('item_page.cultural_sig')}
                      </p>
                      <p className="text-base leading-relaxed text-emerald-100/80">
                        {ethiopianMetadata.cultural_significance}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-emerald-500/10">
                    {ethiopianMetadata.region && (
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-500/60 tracking-widest mb-1">{t('item_page.region')}</p>
                        <p className="text-sm font-bold text-white">{ethiopianMetadata.region}</p>
                      </div>
                    )}
                    {ethiopianMetadata.traditional_genre && (
                      <div>
                        <p className="text-[10px] font-black uppercase text-emerald-500/60 tracking-widest mb-1">{t('item_page.trad_genre')}</p>
                        <p className="text-sm font-bold text-white">{ethiopianMetadata.traditional_genre}</p>
                      </div>
                    )}
                  </div>
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
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleRatingSubmit} disabled={isSubmittingRating}>
                    {isSubmittingRating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {t('item_page.submit_rating')}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleNotInterested} 
                    disabled={isSubmittingFeedback || isNotInterested}
                    className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all rounded-xl"
                  >
                    {isSubmittingFeedback ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsDown className="mr-2 h-4 w-4" />
                    )}
                    {isNotInterested ? "Not Interested Marked" : "Not Interested"}
                  </Button>
                </div>
              </CardContent>
            </Card>


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
