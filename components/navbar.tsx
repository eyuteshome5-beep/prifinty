"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import {
  LayoutDashboard,
  Compass,
  Music,
  Film,
  BookOpen,
  User,
  LogOut,
  Menu,
  X,
  Coins,
  Settings,
  Languages,
  Check,
  Heart,
  Brain,
  Zap,
  ShieldCheck
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { icon: Film, label: t('nav.movie'), href: '/browse?type=movie', color: 'text-blue-500' },
    { icon: Music, label: t('nav.music'), href: '/browse?type=music', color: 'text-purple-500' },
    { icon: BookOpen, label: t('nav.book'), href: '/browse?type=book', color: 'text-emerald-500' },
    { icon: Zap, label: t('nav.ethiopian'), href: '/ethiopian', color: 'text-amber-500' },
    { icon: Brain, label: t('nav.recommendations'), href: isAuthenticated ? '/dashboard#recommendations' : '/login', color: 'text-rose-500' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white/20 to-white/5 p-1 shadow-[0_8px_32px_rgba(31,38,135,0.37)] border border-white/20 overflow-hidden backdrop-blur-md">
            <img src="/logo.png" alt="Prefinity" className="h-full w-full object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-foreground drop-shadow-sm">Prefinity</span>
        </Link>

        {/* Center Navigation */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex flex-col items-center justify-center rounded-xl px-4 py-1.5 transition-all hover:bg-primary/10",
                pathname === link.href || (link.href !== '/browse' && pathname?.includes(link.href))
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <link.icon className={cn(
                "h-5 w-5 mb-0.5 transition-transform group-hover:scale-110",
                pathname === link.href ? link.color : "text-muted-foreground opacity-80 group-hover:opacity-100",
                pathname !== link.href && `group-hover:${link.color}`
              )} />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                pathname === link.href ? link.color : "text-muted-foreground"
              )}>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Right Side - Auth & Credits + Language */}
        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Languages className="h-4 w-4" />
                <span className="sr-only">Toggle language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('nav.language')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLang('en')} className="flex items-center justify-between">
                English {lang === 'en' && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang('am')} className="flex items-center justify-between">
                አማርኛ {lang === 'am' && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated && user ? (
            <>
              {/* Credits Display */}
              {user.role !== 'admin' && (
                <Link 
                  href="/credits" 
                  className="hidden sm:flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium"
                >
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span>{user.credits}</span>
                </Link>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full group p-0 overflow-visible">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-white/10 group-hover:border-primary/50 transition-all">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background shadow-lg",
                      user.role === 'admin' ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>{t('nav.dashboard')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('nav.profile')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist">
                      <Heart className="mr-2 h-4 w-4" />
                      <span>{t('nav.wishlist')}</span>
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="text-primary font-medium">
                          <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                          <span>Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('nav.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">{t('nav.login')}</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">{t('nav.register')}</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                <link.icon className={cn("h-4 w-4", link.color)} />
                {link.label}
              </Link>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {t('nav.language')}
            </p>
            <div className="flex gap-2 px-3">
              <Button 
                variant={lang === 'en' ? "default" : "outline"} 
                size="sm" 
                className="h-8"
                onClick={() => setLang('en')}
              >
                EN
              </Button>
              <Button 
                variant={lang === 'am' ? "default" : "outline"} 
                size="sm" 
                className="h-8"
                onClick={() => setLang('am')}
              >
                አማ
              </Button>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="border-t pt-4 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-start">
                  <Zap className="mr-2 h-4 w-4" />
                  {t('nav.register')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
