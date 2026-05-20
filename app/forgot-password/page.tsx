"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, ShieldCheck, KeyRound, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { authAPI } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/components/ui/use-toast";

type Step = "email" | "code" | "reset" | "success";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // We'll add this to authAPI in lib/api.ts later or use fetch directly
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Failed to send code");
      
      toast({
        title: "Code Sent",
        description: data.code 
          ? `[DEV MODE] Verification Code is: ${data.code}` 
          : "A 6-digit verification code has been sent to your email.",
      });
      setStep("code");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Invalid code");
      
      setStep("reset");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Failed to reset password");
      
      setStep("success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
        
        <Card className="border-white/5 bg-secondary/20 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
                {step === "email" && <Mail className="h-8 w-8 text-primary" />}
                {step === "code" && <ShieldCheck className="h-8 w-8 text-primary" />}
                {step === "reset" && <KeyRound className="h-8 w-8 text-primary" />}
                {step === "success" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">
              {step === "email" && "Reset Password"}
              {step === "code" && "Verify Email"}
              {step === "reset" && "New Password"}
              {step === "success" && "Password Reset!"}
            </CardTitle>
            <CardDescription className="text-center">
              {step === "email" && "Enter your email to receive a verification code"}
              {step === "code" && `We've sent a 6-digit code to ${email}`}
              {step === "reset" && "Create a secure new password for your account"}
              {step === "success" && "Your password has been successfully updated"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Badge variant="destructive" className="w-full mb-4 justify-center py-2 text-sm font-normal">
                {error}
              </Badge>
            )}
            
            {step === "email" && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Verification Code"}
                </Button>
              </form>
            )}
            
            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">6-Digit Code</Label>
                  <Input 
                    id="code" 
                    type="text" 
                    placeholder="000000" 
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-center text-2xl tracking-[0.5em] font-bold h-14"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Code"}
                </Button>
                <div className="text-center">
                  <button 
                    type="button" 
                    onClick={handleRequestCode}
                    className="text-sm text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
            
            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password"}
                </Button>
              </form>
            )}
            
            {step === "success" && (
              <div className="flex flex-col items-center py-4">
                <p className="text-muted-foreground text-center mb-8">
                  You can now log in with your new password.
                </p>
                <Link href="/login" className="w-full">
                  <Button className="w-full h-11 text-base font-semibold">
                    Go to Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
