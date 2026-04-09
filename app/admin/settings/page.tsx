"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Save, 
  Key, 
  Globe, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ShieldCheck,
  Smartphone,
  Server
} from "lucide-react";
import { adminApi } from "@/lib/api";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getSettings();
      setSettings(response.settings || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setMessage({ type: "error", text: "Failed to load system settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setSettings(prev => 
      prev.map(s => s.config_key === key ? { ...s, config_value: value } : s)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const updates = settings.map(s => ({ key: s.config_key, value: s.config_value }));
      await adminApi.updateSettingsBatch(updates);
      setMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Failed to save settings. Please check your connection." });
    } finally {
      setSaving(false);
    }
  };

  const groupedSettings = settings.reduce((acc: any, curr) => {
    const group = curr.config_group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(curr);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading system configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Manage platform identity, API integrations, and global parameters.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving Changes..." : "Save Configuration"}
        </Button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm animate-in zoom-in-95 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* API Integrations */}
        <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden group">
          <CardHeader className="bg-indigo-500/10 border-b border-indigo-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Key className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <CardTitle>API Integrations</CardTitle>
                <CardDescription>Configure external services for real-world data syncing.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {groupedSettings.api_keys?.map((setting: any) => (
              <div key={setting.config_key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold tracking-wide uppercase text-indigo-300/80">{setting.config_key.replace(/_/g, ' ')}</Label>
                  {setting.config_value ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Configured</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Missing Key</Badge>
                  )}
                </div>
                <Input
                  type="password"
                  value={setting.config_value || ""}
                  onChange={(e) => handleValueChange(setting.config_key, e.target.value)}
                  placeholder="Enter API key or token..."
                  className="bg-white/5 border-white/10 focus:border-indigo-500/50 transition-all font-mono"
                />
                <p className="text-[10px] text-muted-foreground italic">{setting.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Site Identity */}
        <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden group">
          <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Globe className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle>Platform Identity</CardTitle>
                <CardDescription>Global branding and SEO configuration.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             {groupedSettings.general?.map((setting: any) => (
              <div key={setting.config_key} className="space-y-2">
                <Label className="text-sm font-bold tracking-wide uppercase text-emerald-300/80">{setting.config_key.replace(/_/g, ' ')}</Label>
                {setting.config_key.includes('DESCRIPTION') ? (
                  <Textarea
                    value={setting.config_value || ""}
                    onChange={(e) => handleValueChange(setting.config_key, e.target.value)}
                    rows={3}
                    className="bg-white/5 border-white/10 focus:border-emerald-500/50 transition-all"
                  />
                ) : (
                  <Input
                    value={setting.config_value || ""}
                    onChange={(e) => handleValueChange(setting.config_key, e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-emerald-500/50 transition-all"
                  />
                )}
                 <p className="text-[10px] text-muted-foreground italic">{setting.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security & System Status */}
        <Card className="bg-white/5 backdrop-blur-md border-white/5 shadow-2xl col-span-full">
          <CardHeader>
            <CardTitle>Diagnostics & Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/20 transition-all">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Admin Protection</p>
                  <p className="font-bold text-emerald-500">Active</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-blue-500/20 transition-all">
                <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                  <Server className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">API Status</p>
                  <p className="font-bold text-blue-500">Healthy</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-amber-500/20 transition-all">
                <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                  <RefreshCcw className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Auto-Migration</p>
                  <p className="font-bold text-amber-500">Enabled</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
