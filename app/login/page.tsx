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
import { Loader2, Coins, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.bonus) {
        toast.success(result.bonus.message, {
          description: `+${result.bonus.amount} credits added to your account!`,
          icon: <Coins className="h-4 w-4" />,
        });
      }
      
      toast.success(t('auth.login_success'));
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -ml-64 -mb-64 animate-pulse delay-1000" />
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center gap-4 mb-12 group">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 p-4 shadow-2xl border border-white/10 backdrop-blur-xl transition-all group-hover:scale-110 group-hover:rotate-6 duration-500">
            <img src="/logo.png" alt="Prefinity" className="h-full w-full object-contain filter drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          </div>
          <span className="text-4xl font-black tracking-tighter text-foreground italic">Prefinity</span>
        </Link>

        <Card className="bg-white/5 backdrop-blur-2xl border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('auth.welcome_back')}</CardTitle>
            <CardDescription>
              {t('auth.welcome_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {t('auth.forgot_password')}
                  </Link>
                </div>
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

              <Button type="submit" className="w-full h-12 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 transform active:scale-95" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('nav.login')}...
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    {t('nav.login')} <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {t('auth.no_account')}{" "}
              </span>
              <Link href="/register" className="text-primary hover:underline font-medium">
                {t('nav.register')}
              </Link>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">{t('auth.demo_mode')}</p>
              <p className="text-xs text-muted-foreground text-pretty">
                {t('auth.demo_desc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
