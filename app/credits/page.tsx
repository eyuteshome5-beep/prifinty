"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Zap, Crown, Gift, ArrowRight, Check, History, TrendingUp } from "lucide-react";
import { creditsAPI, type CreditTransaction } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";

// Transaction interface now uses CreditTransaction from API

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
}
const creditPackages: CreditPackage[] = [
  { id: "starter", name: "Starter", credits: 50, price: 4.99, bonus: 0 },
  { id: "popular", name: "Popular", credits: 150, price: 12.99, bonus: 25, popular: true },
  { id: "pro", name: "Pro", credits: 400, price: 29.99, bonus: 100 },
  { id: "ultimate", name: "Ultimate", credits: 1000, price: 59.99, bonus: 350 },
];

export default function CreditsPage() {
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [creditBalance, setCreditBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCreditData();
    }
  }, [isAuthenticated]);

  const fetchCreditData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        creditsAPI.getBalance(),
        creditsAPI.getTransactions(),
      ]);
      setCreditBalance(balanceRes.credits);
      setTransactions(historyRes.transactions || []);
    } catch (error) {
      console.error("Failed to fetch credit data:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasing(pkg.id);
    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await creditsAPI.purchaseCredits(pkg.credits + pkg.bonus);
      await fetchCreditData();
      toast.success(t('credits_page.success_msg', { amount: pkg.credits + pkg.bonus }));
    } catch (error) {
      console.error("Purchase failed:", error);
      toast.error(t('credits_page.error_msg'));
    } finally {
      setPurchasing(null);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('credits_page.title')}</h1>
          <p className="text-muted-foreground">
            {t('credits_page.subtitle')}
          </p>
        </div>

        {/* Current Balance Card */}
        <Card className="mb-8 bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-colors group-hover:bg-primary/20" />
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-primary/20 rounded-2xl shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                  <Coins className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('credits_page.balance_title')}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black text-foreground tracking-tighter">
                      {loadingBalance ? "..." : creditBalance.toLocaleString()}
                    </p>
                    <span className="text-lg font-bold text-primary italic">{t('credits_page.balance_available')}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="secondary" className="px-4 py-1 rounded-full bg-primary/10 text-primary border-primary/20">
                  <TrendingUp className="h-3.5 w-3.5 mr-2" />
                  {t('credits_page.tier_label', { tier: user?.role === 'admin' ? t('nav.admin') : t('profile.member') })}
                </Badge>
                <p className="text-sm text-muted-foreground italic">
                  {t('credits_page.rate_info')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="packages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="packages">{t('credits_page.tab_buy')}</TabsTrigger>
            <TabsTrigger value="history">{t('credits_page.tab_history')}</TabsTrigger>
          </TabsList>

          <TabsContent value="packages">
            {/* Credit Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {creditPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(var(--primary),0.2)] hover:-translate-y-1 bg-white/5 backdrop-blur-md border-white/10 ${
                    pkg.popular ? "border-primary ring-2 ring-primary/20" : ""
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      {t('credits_page.most_popular')}
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 p-3 bg-muted rounded-full w-fit">
                      {pkg.id === "starter" && <Zap className="h-6 w-6 text-amber-500" />}
                      {pkg.id === "popular" && <Gift className="h-6 w-6 text-primary" />}
                      {pkg.id === "pro" && <Crown className="h-6 w-6 text-orange-500" />}
                      {pkg.id === "ultimate" && <Crown className="h-6 w-6 text-purple-500" />}
                    </div>
                    <CardTitle className="text-xl">{t(`credits_page.pkg_${pkg.id}`)}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">${pkg.price}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold text-foreground">
                        {pkg.credits} {t('dashboard.stats_credits')}
                      </p>
                      {pkg.bonus > 0 && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {t('credits_page.bonus_credits', { amount: pkg.bonus })}
                        </Badge>
                      )}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center justify-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {t('credits_page.feature_recs')}
                      </li>
                      <li className="flex items-center justify-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {t('credits_page.feature_expires')}
                      </li>
                      {pkg.bonus > 0 && (
                        <li className="flex items-center justify-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {t('credits_page.feature_bonus', { percent: Math.round((pkg.bonus / pkg.credits) * 100) })}
                        </li>
                      )}
                    </ul>
                    <Button
                      className="w-full"
                      variant={pkg.popular ? "default" : "outline"}
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing !== null}
                    >
                      {purchasing === pkg.id ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          {t('credits_page.btn_processing')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {t('credits_page.btn_purchase')} <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Credit Usage Info */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  {t('credits_page.how_it_works')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4">
                    <div className="text-3xl font-bold text-primary mb-2">1</div>
                    <h3 className="font-semibold mb-1">{t('credits_page.step1_title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('credits_page.step1_desc')}
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-3xl font-bold text-primary mb-2">1</div>
                    <h3 className="font-semibold mb-1">{t('credits_page.step2_title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('credits_page.step2_desc')}
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-3xl font-bold text-primary mb-2">10</div>
                    <h3 className="font-semibold mb-1">{t('credits_page.step3_title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('credits_page.step3_desc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t('credits_page.tab_history')}
                </CardTitle>
                <CardDescription>{t('credits_page.subtitle_history') || t('credits_page.tab_history')}</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('credits_page.history_empty')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('credits_page.history_start')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-full ${
                              transaction.amount > 0
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600"
                            }`}
                          >
                            <Coins className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            transaction.amount > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
