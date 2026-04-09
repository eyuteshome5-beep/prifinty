"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Users,
  Star,
  Eye,
  MousePointerClick,
  Clock,
  Target,
} from "lucide-react";

interface AnalyticsData {
  daily_active_users: number[];
  recommendation_accuracy: number;
  avg_session_duration: number;
  conversion_rate: number;
  top_categories: { name: string; count: number }[];
  top_items: { title: string; views: number; ratings: number }[];
  user_retention: { week: string; rate: number }[];
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated analytics data
    setTimeout(() => {
      setAnalytics({
        daily_active_users: [120, 145, 132, 168, 189, 201, 178],
        recommendation_accuracy: 87.5,
        avg_session_duration: 8.5,
        conversion_rate: 23.4,
        top_categories: [
          { name: "Ethiopian Cuisine", count: 1250 },
          { name: "Coffee", count: 980 },
          { name: "Music", count: 756 },
          { name: "Art", count: 543 },
          { name: "Fashion", count: 421 },
        ],
        top_items: [
          { title: "Doro Wat", views: 2340, ratings: 156 },
          { title: "Ethiopian Coffee Ceremony", views: 2100, ratings: 234 },
          { title: "Injera", views: 1890, ratings: 189 },
          { title: "Tibs", views: 1560, ratings: 145 },
          { title: "Kitfo", views: 1320, ratings: 98 },
        ],
        user_retention: [
          { week: "Week 1", rate: 100 },
          { week: "Week 2", rate: 72 },
          { week: "Week 3", rate: 58 },
          { week: "Week 4", rate: 48 },
          { week: "Week 5", rate: 42 },
          { week: "Week 6", rate: 38 },
        ],
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const keyMetrics = [
    {
      title: "Recommendation Accuracy",
      value: `${analytics?.recommendation_accuracy}%`,
      description: "ML model prediction accuracy",
      icon: Target,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Avg Session Duration",
      value: `${analytics?.avg_session_duration} min`,
      description: "Time spent per visit",
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Conversion Rate",
      value: `${analytics?.conversion_rate}%`,
      description: "Users who rate items",
      icon: MousePointerClick,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Weekly Active Users",
      value: analytics?.daily_active_users.reduce((a, b) => a + b, 0).toString() || "0",
      description: "Past 7 days",
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into user behavior and system performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </div>
                 <div className={`p-3 rounded-2xl ${metric.bgColor} border border-white/5`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Active Users Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Active Users
                </CardTitle>
                <CardDescription>Past 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {analytics?.daily_active_users.map((count, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                       <div
                        className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                        style={{
                          height: `${(count / 250) * 100}%`,
                          minHeight: "20px",
                        }}
                      ></div>
                      <span className="text-xs text-muted-foreground">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Retention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  User Retention
                </CardTitle>
                <CardDescription>Cohort analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.user_retention.map((week) => (
                    <div key={week.week} className="flex items-center gap-4">
                      <span className="text-sm w-20">{week.week}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${week.rate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {week.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>By user interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.top_categories.map((category, index) => (
                    <div key={category.name} className="flex items-center gap-4">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                       <div className="flex-1">
                        <p className="font-medium">{category.name}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div
                            className={`h-full rounded-full ${
                              category.name.includes('Ethiopian') ? 'bg-amber-500' :
                              category.name.includes('Music') ? 'bg-purple-500' :
                              'bg-primary'
                            }`}
                            style={{
                              width: `${(category.count / 1250) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        {category.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Items */}
            <Card>
              <CardHeader>
                <CardTitle>Top Items</CardTitle>
                <CardDescription>Most viewed and rated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.top_items.map((item, index) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {item.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {item.ratings}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Algorithm Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Collaborative Filtering</p>
                  <p className="text-2xl font-bold">89.2%</p>
                  <p className="text-xs text-emerald-600">+2.3% from last week</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Content-Based</p>
                  <p className="text-2xl font-bold">85.7%</p>
                  <p className="text-xs text-emerald-600">+1.1% from last week</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Hybrid Model</p>
                  <p className="text-2xl font-bold">91.4%</p>
                  <p className="text-xs text-emerald-600">+3.5% from last week</p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recommendation Metrics</CardTitle>
                <CardDescription>Model evaluation metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Precision@10</p>
                    <p className="text-3xl font-bold">0.847</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Recall@10</p>
                    <p className="text-3xl font-bold">0.723</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">NDCG</p>
                    <p className="text-3xl font-bold">0.891</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Mean Reciprocal Rank</p>
                    <p className="text-3xl font-bold">0.756</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
