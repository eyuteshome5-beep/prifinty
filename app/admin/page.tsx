"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Coins, TrendingUp, Activity, Star, ShieldCheck, Settings } from "lucide-react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface DashboardStats {
  total_users: number;
  total_items: number;
  total_ratings: number;
  total_credits_purchased: number;
  new_users_today: number;
  new_items_today: number;
  avg_rating: number;
  active_users: number;
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for charts - in a real app, these would come from the API
  const activityData = [
    { name: 'Mon', users: 400, items: 240 },
    { name: 'Tue', users: 300, items: 139 },
    { name: 'Wed', users: 200, items: 980 },
    { name: 'Thu', users: 278, items: 390 },
    { name: 'Fri', users: 189, items: 480 },
    { name: 'Sat', users: 239, items: 380 },
    { name: 'Sun', users: 349, items: 430 },
  ];

  const distributionData = [
    { name: 'Movies', value: 45 },
    { name: 'Music', value: 30 },
    { name: 'Books', value: 25 },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getRecentActivity(),
      ]);
      setStats({
        total_users: statsRes.users.total_users,
        total_items: statsRes.content.total_items,
        total_ratings: statsRes.ratings.total,
        total_credits_purchased: statsRes.users.active_users * 100,
        new_users_today: statsRes.users.new_today,
        new_items_today: 0,
        avg_rating: statsRes.ratings.average,
        active_users: statsRes.users.active_users,
      });
      setRecentActivity(activityRes.activities || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Analyzing platform diagnostics...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: t('admin_panel.total_users'),
      value: stats?.total_users.toLocaleString() || "0",
      change: t('admin_panel.today', { count: stats?.new_users_today || 0 }),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t('admin_panel.total_items'),
      value: stats?.total_items.toLocaleString() || "0",
      change: t('admin_panel.today', { count: stats?.new_items_today || 0 }),
      icon: Package,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: t('admin_panel.avg_rating'),
      value: stats?.avg_rating.toFixed(1) || "0",
      change: t('admin_panel.ratings_count', { count: stats?.total_ratings || 0 }),
      icon: Star,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">{t('admin_panel.dashboard')}</h1>
          <p className="text-muted-foreground">
            {t('admin_panel.overview')}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-primary/20 py-1 px-3">
            <Activity className="h-3 w-3 mr-1" />
            Live Sync
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-white/5 backdrop-blur-md border-white/5 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-black text-foreground mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                    {stat.change}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bgColor} border border-white/5 shadow-inner`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Platform Growth</CardTitle>
            <CardDescription>New users and content items added in the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
                <Area type="monotone" dataKey="items" stroke="#f59e0b" fill="none" strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Content Distribution</CardTitle>
            <CardDescription>Breakdown of catalog items by primary category.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Legend iconType="circle" payload={distributionData.map((d, i) => ({ value: d.name, type: 'circle', color: COLORS[i] }))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/users">
          <Card className="hover:bg-primary/5 transition-all cursor-pointer border-l-4 border-l-primary group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Users</p>
              <div className="text-2xl font-black mt-1">{stats?.total_users.toLocaleString() || "0"}</div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/admin/items">
          <Card className="hover:bg-amber-500/5 transition-all cursor-pointer border-l-4 border-l-amber-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Globe className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                <Badge variant="outline" className="border-amber-500/20 text-amber-500 text-[10px]">REAL TIME</Badge>
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Content</p>
              <div className="text-2xl font-black mt-1">{stats?.total_items.toLocaleString() || "0"}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings">
          <Card className="hover:bg-slate-500/5 transition-all cursor-pointer border-l-4 border-l-slate-400 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Settings className="h-5 w-5 text-slate-400 group-hover:rotate-45 transition-transform" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">System</p>
              <div className="text-2xl font-black mt-1">Configure</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/items">
          <Card className="hover:bg-emerald-500/5 transition-all cursor-pointer border-l-4 border-l-emerald-500 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Import</p>
              <div className="text-2xl font-black mt-1">Unified</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Platform Activity</CardTitle>
            <CardDescription>Key events across the user and content ecosystems.</CardDescription>
          </div>
          <Activity className="h-5 w-5 text-muted-foreground opacity-50" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className={`p-2 rounded-lg bg-primary/10`}>
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No recent activity recorded.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
