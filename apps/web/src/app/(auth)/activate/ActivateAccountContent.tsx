'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '@/lib/api/client';
import { Loader2, Sparkles, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
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
  const router = useRouter();
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
    if (!token) return;

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

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-premium-lg border border-slate-100 p-10 max-w-md w-full text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Profile Activated</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Welcome to the team! Your account is now active and your credentials are ready for use.
            </p>
          </div>
          <Link href="/login" className="block pt-2">
            <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all">
              Launch Workforce OS
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl overflow-hidden bg-white border border-slate-200 p-2 shadow-premium">
            <img src="/logo.png" alt="Paramount Logo" className="h-full w-full object-contain" />
          </div>
          <div className="text-center">
            <p className="font-extrabold text-slate-900 tracking-tight">Paramount Intelligence</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Workforce OS</p>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-premium-lg border border-slate-100/80 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
          <div className="mb-8">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 ring-1 ring-indigo-100/50">
              <Sparkles className={`h-7 w-7 ${!token ? 'text-slate-400' : 'text-indigo-600'}`} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {!token ? 'Invalid Link' : 'Begin Onboarding'}
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              {!token 
                ? 'This activation link is missing a valid token. Please contact your administrator.' 
                : 'Set your secure password to complete your profile activation.'}
            </p>
          </div>

          {!token ? (
            <Link href="/login" className="block">
              <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all">
                Back to Login
              </Button>
            </Link>
          ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 font-bold text-[10px] uppercase tracking-[0.15em] ml-1">Set Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                          disabled={isLoading}
                          className="h-12 bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-600 rounded-2xl px-4 pr-12 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-[10px] font-bold text-slate-400 ml-1 mt-1 uppercase tracking-tight">
                      Min 8 characters required
                    </FormDescription>
                    <FormMessage className="text-xs font-bold text-rose-500 ml-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 font-bold text-[10px] uppercase tracking-[0.15em] ml-1">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                        className="h-12 bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-600 rounded-2xl px-4 font-medium"
                      />
                    </FormControl>
                    <FormMessage className="text-xs font-bold text-rose-500 ml-1" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all rounded-2xl active:scale-[0.98]"
                disabled={isLoading || !token}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </form>
          </Form>
          )}
        </div>

        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 leading-relaxed">
          By activating, you agree to our <br />
          <span className="text-slate-500 underline cursor-pointer">Terms of Service</span> and <span className="text-slate-500 underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
