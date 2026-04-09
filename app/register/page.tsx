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
import { Loader2, Check, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    try {
      await register(username, email, password);
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
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center gap-4 mb-8 group">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 p-3 shadow-2xl border border-white/10 backdrop-blur-xl transition-all group-hover:scale-110 duration-500">
            <img src="/logo.png" alt="Prefinity" className="h-full w-full object-contain filter drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-foreground italic">Prefinity</span>
        </Link>

        <Card className="bg-white/5 backdrop-blur-2xl border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('auth.create_account')}</CardTitle>
            <CardDescription>
              {t('auth.register_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Benefits */}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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

              <Button type="submit" className="w-full h-12 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 transform active:scale-95" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('nav.register')}...
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    {t('nav.register')} <Zap className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('auth.has_account')} </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t('nav.login')}
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground text-pretty px-4">
              {t('auth.legal')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
