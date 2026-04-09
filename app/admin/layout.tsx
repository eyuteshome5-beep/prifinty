"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  Settings,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const adminNavItems = [
  { href: "/admin", labelKey: "admin_panel.sidebar.dashboard", icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "admin_panel.sidebar.users", icon: Users },
  { href: "/admin/items", labelKey: "admin_panel.sidebar.items", icon: Package },
  { href: "/admin/analytics", labelKey: "admin_panel.sidebar.analytics", icon: BarChart3 },
  { href: "/admin/settings", labelKey: "admin_panel.sidebar.settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push("/login");
      else if (user?.role !== "admin") router.push("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r border-border">
          <div className="p-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 p-1 shadow-sm border border-white/10 overflow-hidden">
                <img src="/logo.png" alt="Prefinity" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight block">Prefinity</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Admin Panel
                </span>
              </div>
            </Link>

            <nav className="space-y-1">
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <item.icon className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              ))}
              <Separator className="my-4" />
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                {t("admin_panel.sidebar.back_to_site")}
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
