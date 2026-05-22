'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '@/lib/api/client';
import { Loader2, Sparkles, Eye, EyeOff, CheckCircle2, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const schema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function ActivateAccountContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing activation token');
    }
  }, [token]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(data: FormValues) {
    if (!token || isLoading) return;

    setIsLoading(true);
    try {
      await apiClient.post('/auth/activate-account', {
        token,
        password: data.password
      });
      setSubmitted(true);
      toast.success('Account activated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to activate account. The link may have expired or already been used.');
    } finally {
      setIsLoading(false);
    }
  }

  // Success Confirmation State Layout
  if (submitted) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] p-4 transition-all duration-300">
        {/* Soft grid background and ambient glow sphere */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[25%] -left-[15%] w-[70%] h-[70%] rounded-full bg-[var(--accent-primary)]/8 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]" style={{
            backgroundImage: `linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 w-full max-w-[92vw] sm:max-w-[430px] animate-in fade-in zoom-in-95 duration-500 my-8">
          <div className="bg-[var(--bg-surface)]/60 backdrop-blur-xl border border-[var(--border-default)] rounded-[24px] p-6 sm:p-10 shadow-[var(--shadow-card)] flex flex-col text-center space-y-6">
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-full bg-[var(--status-success-bg)] flex items-center justify-center ring-8 ring-[var(--status-success-bg)]/50">
                <CheckCircle2 className="h-9 w-9 text-[var(--status-success-text)]" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Profile Activated</h2>
              <p className="text-sm text-[var(--text-secondary)] font-semibold leading-relaxed max-w-[280px] mx-auto">
                Welcome to the team! Your account is now active and your credentials are ready for use.
              </p>
            </div>
            
            <Link href="/login" className="block pt-2 w-full">
              <Button className="btn-primary w-full h-12 rounded-[12px] font-semibold text-base tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[var(--shadow-card)]">
                Sign In to PIMS
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Button>
            </Link>

            <div className="pt-4 border-t border-[var(--border-subtle)] text-center">
              <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-wider uppercase">
                © Paramount Intelligence
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] p-4 transition-all duration-300">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[25%] -left-[15%] w-[70%] h-[70%] rounded-full bg-[var(--accent-primary)]/8 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[var(--accent-primary)]/4 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]" style={{
          backgroundImage: `linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-[92vw] sm:max-w-[430px] animate-in fade-in zoom-in-95 duration-500 my-8">
        {/* Brand Block */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-auto flex items-center justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Paramount Logo" 
              className="h-full w-auto object-contain transition-transform duration-300 hover:scale-105" 
            />
          </div>
          <h1 className="app-title text-2xl font-extrabold tracking-tight text-center">Welcome to PIMS</h1>
          <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent-primary)] mt-1.5 text-center">
            Paramount Intelligence Monitoring System
          </p>
        </div>

        <div className="bg-[var(--bg-surface)]/60 backdrop-blur-xl border border-[var(--border-default)] rounded-[24px] p-6 sm:p-10 shadow-[var(--shadow-card)] flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {!token ? 'Invalid Link' : 'Activate Your Account'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-semibold mt-2 leading-relaxed">
              {!token 
                ? 'This activation link is missing a valid token. Please contact your administrator.' 
                : 'Set your secure password to complete your profile activation and access PIMS.'}
            </p>
          </div>

          {!token ? (
            <div className="space-y-4">
              <div className="flex justify-center my-4">
                <div className="h-12 w-12 rounded-xl bg-[var(--status-danger-bg)] flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-[var(--status-danger-text)]" />
                </div>
              </div>
              <Link href="/login" className="block w-full">
                <Button className="btn-primary w-full h-12 rounded-[12px] font-semibold text-base tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[var(--shadow-card)]">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold text-[var(--text-secondary)]">Set Password</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[12px] group focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/15 transition-all duration-200">
                          <Lock className="ml-4 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                          <Input 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="••••••••" 
                            {...field} 
                            disabled={isLoading} 
                            className="bg-transparent border-none text-[var(--text-primary)] text-[15px] placeholder:text-[var(--text-muted)] focus-visible:ring-0 h-12 w-full pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormDescription className="text-[10px] font-bold text-[var(--text-muted)] ml-1 mt-1 uppercase tracking-tight">
                        Min 8 characters required
                      </FormDescription>
                      {form.formState.errors.password && (
                        <FormMessage className="flex items-center gap-1 text-[11px] text-[var(--status-danger-text)] font-semibold mt-1">
                          <AlertCircle className="h-3 w-3 shrink-0" /> {form.formState.errors.password?.message}
                        </FormMessage>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold text-[var(--text-secondary)]">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[12px] group focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/15 transition-all duration-200">
                          <Lock className="ml-4 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            disabled={isLoading} 
                            className="bg-transparent border-none text-[var(--text-primary)] text-[15px] placeholder:text-[var(--text-muted)] focus-visible:ring-0 h-12 w-full pr-4"
                          />
                        </div>
                      </FormControl>
                      {form.formState.errors.confirmPassword && (
                        <FormMessage className="flex items-center gap-1 text-[11px] text-[var(--status-danger-text)] font-semibold mt-1">
                          <AlertCircle className="h-3 w-3 shrink-0" /> {form.formState.errors.confirmPassword?.message}
                        </FormMessage>
                      )}
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="btn-primary w-full h-12 rounded-[12px] font-semibold text-base tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[var(--shadow-card)]"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                  Activate Account
                </Button>
              </form>
            </Form>
          )}

          {/* Footer Branding */}
          <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] text-center">
            <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-wider uppercase">
              © Paramount Intelligence
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-8 leading-relaxed mt-6">
          By activating, you agree to our <br />
          <span className="text-[var(--text-secondary)] underline cursor-pointer hover:text-[var(--text-primary)] transition-colors">Terms of Service</span> and <span className="text-[var(--text-secondary)] underline cursor-pointer hover:text-[var(--text-primary)] transition-colors">Privacy Policy</span>.
        </p>
      </div>


    </div>
  );
}
