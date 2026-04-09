"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { usersAPI, type UserStats, type UserPreferences } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar, 
  Star, 
  Heart, 
  Coins,
  Zap,
  Loader2,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [ethiopianPref, setEthiopianPref] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const data = await usersAPI.getProfile();
      setStats(data.stats);
      setPreferences(data.preferences);
      setEthiopianPref(data.preferences?.ethiopian_content_preference || false);
      setNotificationsEnabled(data.preferences?.notification_enabled ?? true);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await usersAPI.updatePreferences({
        ethiopian_content_preference: ethiopianPref,
        notification_enabled: notificationsEnabled,
      });
      toast.success(t('profile.prefs_saved'));
      refreshUser();
    } catch (error) {
      toast.error(t('profile.prefs_failed'));
    } finally {
      setIsSaving(false);
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
      
      <main className="container py-8 max-w-4xl">
        <div className="relative mb-12 p-8 md:p-12 rounded-[40px] overflow-hidden border border-white/5 bg-white/5 backdrop-blur-xl group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-colors group-hover:bg-primary/20" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="h-24 w-24 rounded-3xl bg-primary/20 flex items-center justify-center border-2 border-primary/30 shadow-2xl transition-transform group-hover:scale-110">
              <User className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 italic">
                {user?.username}
              </h1>
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Account Info */}
            <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden relative group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('profile.account_info')}
                </CardTitle>
                <CardDescription>
                  {t('profile.basic_details')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('auth.username')}</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{user?.username}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('auth.email')}</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user?.email}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                    {user?.role === 'admin' ? t('profile.admin') : t('profile.member')}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {t('profile.joined')} {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden relative group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  {t('profile.activity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-[24px] bg-white/5 border border-white/10 p-6 text-center transition-all hover:bg-white/10 hover:shadow-xl">
                    <div className="mx-auto h-12 w-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 text-amber-500 shadow-lg shadow-amber-500/20">
                      <Coins className="h-6 w-6" />
                    </div>
                    <p className="text-3xl font-black tracking-tighter">{user?.credits || 0}</p>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">{t('dashboard.stats_credits')}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/5 border border-white/10 p-6 text-center transition-all hover:bg-white/10 hover:shadow-xl">
                    <div className="mx-auto h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-lg shadow-primary/20">
                      <Star className="h-6 w-6" />
                    </div>
                    <p className="text-3xl font-black tracking-tighter">{stats?.total_ratings || 0}</p>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">{t('dashboard.stats_ratings')}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/5 border border-white/10 p-6 text-center transition-all hover:bg-white/10 hover:shadow-xl">
                    <div className="mx-auto h-12 w-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-4 text-rose-500 shadow-lg shadow-rose-500/20">
                      <Heart className="h-6 w-6" />
                    </div>
                    <p className="text-3xl font-black tracking-tighter">{stats?.wishlist_items || 0}</p>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">{t('dashboard.stats_wishlist')}</p>
                  </div>
                  <div className="rounded-[24px] bg-white/5 border border-white/10 p-6 text-center transition-all hover:bg-white/10 hover:shadow-xl">
                    <div className="mx-auto h-12 w-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 text-amber-500 shadow-lg shadow-amber-500/20">
                      <Star className="h-6 w-6" />
                    </div>
                    <p className="text-3xl font-black tracking-tighter">{stats?.average_rating?.toFixed(1) || '0.0'}</p>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">{t('dashboard.stats_avg_rating')}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{stats?.movie_ratings || 0}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.tab_movies')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{stats?.music_ratings || 0}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.tab_music')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{stats?.book_ratings || 0}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.tab_books')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden relative group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {t('profile.preferences')}
                </CardTitle>
                <CardDescription>
                  {t('profile.customize_exp')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('profile.ethiopian_boost')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.ethiopian_boost_desc')}
                    </p>
                  </div>
                  <Switch
                    checked={ethiopianPref}
                    onCheckedChange={setEthiopianPref}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('profile.notifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.notifications_desc')}
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <Button onClick={handleSavePreferences} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('profile.save_prefs')}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
