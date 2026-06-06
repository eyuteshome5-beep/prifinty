"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useLanguage();
  
  // Step 1: Account Info
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 2: Survey
  const [favoriteMediaTypes, setFavoriteMediaTypes] = useState<string[]>([]);
  
  // Movie specific
  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [favoriteCountries, setFavoriteCountries] = useState<string[]>([]);
  
  // Book specific
  const [favoriteAuthors, setFavoriteAuthors] = useState<string[]>([]);
  const [favoriteBookTypes, setFavoriteBookTypes] = useState<string[]>([]);
  
  // Music specific
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([]);
  const [favoriteDecades, setFavoriteDecades] = useState<string[]>([]);
  const [favoriteMusicGenres, setFavoriteMusicGenres] = useState<string[]>([]);
  
  const [authorInput, setAuthorInput] = useState('');
  const [artistInput, setArtistInput] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const MEDIA_TYPES = ['movie', 'book', 'music'];
  const MOVIE_GENRES = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Romance', 'Documentary', 'Fantasy', 'Horror', 'Thriller', 'Animation'];
  const COUNTRIES = ['USA', 'Ethiopia', 'UK', 'France', 'South Korea', 'Japan', 'India', 'Nigeria'];
  
  const BOOK_TYPES = ['Fiction', 'Non-Fiction', 'Biography', 'Science Fiction', 'Mystery', 'History', 'Self-Help', 'Romance', 'Fantasy'];
  
  const MUSIC_GENRES = ['Pop', 'Rock', 'Hip Hop', 'R&B', 'Jazz', 'Classical', 'Electronic', 'Traditional', 'Ethio-Jazz'];
  const MUSIC_DECADES = ['60s', '70s', '80s', '90s', '2000s', '2010s', '2020s'];

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[], item: string) => {
    if (current.includes(item)) {
      setter(current.filter(i => i !== item));
    } else {
      setter([...current, item]);
    }
  };
  
  const addTextItem = (
    e: React.FormEvent, 
    input: string, 
    setInput: React.Dispatch<React.SetStateAction<string>>, 
    setter: React.Dispatch<React.SetStateAction<string[]>>, 
    current: string[]
  ) => {
    e.preventDefault();
    if (input.trim() && !current.includes(input.trim())) {
      setter([...current, input.trim()]);
      setInput('');
    }
  };
  
  const removeTextItem = (
    item: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>, 
    current: string[]
  ) => {
    setter(current.filter(i => i !== item));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.pass_mismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.pass_short'));
      return;
    }

    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      await register(
        username, email, password, 
        preferredGenres, favoriteMediaTypes, favoriteCountries, 
        favoriteAuthors, favoriteBookTypes, favoriteArtists, favoriteDecades, favoriteMusicGenres
      );
      toast.success(t('auth.register_success'), {
        description: t('auth.reg_bonus_desc'),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    t('auth.benefit1'),
    t('auth.benefit2'),
    t('auth.benefit3'),
    t('auth.benefit4'),
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -ml-64 -mt-64 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] -mr-64 -mb-64 animate-pulse delay-1000" />
      
      <div className="w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center gap-4 mb-8 group">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 p-3 shadow-2xl border border-white/10 backdrop-blur-xl transition-all group-hover:scale-110 duration-500">
            <img src="/logo.png" alt="Prefinity" className="h-full w-full object-contain filter drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-foreground italic">Prefinity</span>
        </Link>

        <Card className="bg-white/5 backdrop-blur-2xl border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden flex flex-col max-h-[85vh]">
          <CardHeader className="text-center shrink-0">
            <CardTitle className="text-2xl">{step === 1 ? t('auth.create_account') : 'Personalize Your Experience'}</CardTitle>
            <CardDescription>
              {step === 1 ? t('auth.register_desc') : 'Help us give you the perfect recommendations.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 custom-scrollbar pb-6">
            {step === 1 && (
              <div className="mb-6 rounded-lg bg-primary/5 p-4">
                <p className="text-sm font-medium mb-2">{t('auth.benefits_title')}</p>
                <ul className="space-y-1">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 ? (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('auth.username_placeholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth.password_placeholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirm_password')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t('auth.confirm_placeholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 transform active:scale-95 mt-6" disabled={isLoading}>
                  <span className="flex items-center gap-2">
                    Next Step <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </form>
            ) : (
              <div className="space-y-8 pr-2">
                {/* Media Type Selection */}
                <div className="space-y-3">
                  <Label className="text-md font-bold">What types of media do you prefer?</Label>
                  <p className="text-xs text-muted-foreground -mt-2 mb-2">Select all that apply to reveal specific options.</p>
                  <div className="flex flex-wrap gap-2">
                    {MEDIA_TYPES.map(type => (
                      <Button
                        key={type}
                        type="button"
                        variant={favoriteMediaTypes.includes(type) ? 'default' : 'outline'}
                        className="rounded-full capitalize"
                        onClick={() => toggleSelection(setFavoriteMediaTypes, favoriteMediaTypes, type)}
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Conditional Movie Fields */}
                {favoriteMediaTypes.includes('movie') && (
                  <div className="space-y-4 p-5 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <h3 className="font-black text-lg text-blue-500">Movie Preferences</h3>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Favorite Movie Genres?</Label>
                      <div className="flex flex-wrap gap-2">
                        {MOVIE_GENRES.map(genre => (
                          <Button
                            key={genre}
                            type="button"
                            size="sm"
                            variant={preferredGenres.includes(genre) ? 'default' : 'outline'}
                            className="rounded-full text-xs"
                            onClick={() => toggleSelection(setPreferredGenres, preferredGenres, genre)}
                          >
                            {genre}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-semibold">Which countries' movies do you enjoy?</Label>
                      <div className="flex flex-wrap gap-2">
                        {COUNTRIES.map(country => (
                          <Button
                            key={country}
                            type="button"
                            size="sm"
                            variant={favoriteCountries.includes(country) ? 'default' : 'outline'}
                            className="rounded-full text-xs"
                            onClick={() => toggleSelection(setFavoriteCountries, favoriteCountries, country)}
                          >
                            {country}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Conditional Book Fields */}
                {favoriteMediaTypes.includes('book') && (
                  <div className="space-y-4 p-5 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <h3 className="font-black text-lg text-emerald-500">Book Preferences</h3>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">What types of books?</Label>
                      <div className="flex flex-wrap gap-2">
                        {BOOK_TYPES.map(type => (
                          <Button
                            key={type}
                            type="button"
                            size="sm"
                            variant={favoriteBookTypes.includes(type) ? 'default' : 'outline'}
                            className="rounded-full text-xs"
                            onClick={() => toggleSelection(setFavoriteBookTypes, favoriteBookTypes, type)}
                          >
                            {type}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-semibold">Favorite Authors</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={authorInput}
                          onChange={(e) => setAuthorInput(e.target.value)}
                          placeholder="E.g. Stephen King"
                          className="bg-background"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTextItem(e, authorInput, setAuthorInput, setFavoriteAuthors, favoriteAuthors);
                            }
                          }}
                        />
                        <Button type="button" onClick={(e) => addTextItem(e, authorInput, setAuthorInput, setFavoriteAuthors, favoriteAuthors)}>Add</Button>
                      </div>
                      {favoriteAuthors.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {favoriteAuthors.map(author => (
                            <div key={author} className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full text-xs border border-primary/30">
                              {author}
                              <button type="button" onClick={() => removeTextItem(author, setFavoriteAuthors, favoriteAuthors)} className="text-muted-foreground hover:text-foreground ml-1">&times;</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Conditional Music Fields */}
                {favoriteMediaTypes.includes('music') && (
                  <div className="space-y-4 p-5 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                    <h3 className="font-black text-lg text-purple-500">Music Preferences</h3>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Favorite Music Genres?</Label>
                      <div className="flex flex-wrap gap-2">
                        {MUSIC_GENRES.map(genre => (
                          <Button
                            key={genre}
                            type="button"
                            size="sm"
                            variant={favoriteMusicGenres.includes(genre) ? 'default' : 'outline'}
                            className="rounded-full text-xs"
                            onClick={() => toggleSelection(setFavoriteMusicGenres, favoriteMusicGenres, genre)}
                          >
                            {genre}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-semibold">Favorite Decades?</Label>
                      <div className="flex flex-wrap gap-2">
                        {MUSIC_DECADES.map(decade => (
                          <Button
                            key={decade}
                            type="button"
                            size="sm"
                            variant={favoriteDecades.includes(decade) ? 'default' : 'outline'}
                            className="rounded-full text-xs"
                            onClick={() => toggleSelection(setFavoriteDecades, favoriteDecades, decade)}
                          >
                            {decade}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-semibold">Favorite Artists</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={artistInput}
                          onChange={(e) => setArtistInput(e.target.value)}
                          placeholder="E.g. Michael Jackson"
                          className="bg-background"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTextItem(e, artistInput, setArtistInput, setFavoriteArtists, favoriteArtists);
                            }
                          }}
                        />
                        <Button type="button" onClick={(e) => addTextItem(e, artistInput, setArtistInput, setFavoriteArtists, favoriteArtists)}>Add</Button>
                      </div>
                      {favoriteArtists.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {favoriteArtists.map(artist => (
                            <div key={artist} className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full text-xs border border-primary/30">
                              {artist}
                              <button type="button" onClick={() => removeTextItem(artist, setFavoriteArtists, favoriteArtists)} className="text-muted-foreground hover:text-foreground ml-1">&times;</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-6 mt-8 border-t border-white/10">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)} className="w-1/3 h-12 text-lg rounded-2xl bg-white/5 hover:bg-white/10" disabled={isLoading}>
                    Back
                  </Button>
                  <Button type="button" onClick={handleSubmit} className="w-2/3 h-12 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      'Complete Signup'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">{t('auth.has_account')} </span>
                <Link href="/login" className="text-primary hover:underline font-medium">
                  {t('nav.login')}
                </Link>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-muted-foreground text-pretty px-4">
              {t('auth.legal')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
