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
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-10 max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Account Activated!</h2>
            <p className="mt-2 text-slate-500">
              Welcome to Paramount Intelligence. Your account is now active and your password has been set.
            </p>
          </div>
          <Link href="/login" className="block">
            <Button className="w-full bg-[#0f172a] hover:bg-[#1e293b]">
              Sign In to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-white border border-slate-200 p-1.5 shadow-sm">
            <img src="/logo.png" alt="Paramount Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Paramount Intelligence</p>
            <p className="text-xs text-slate-500">Workforce OS</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60">
          <div className="mb-6">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <Sparkles className={`h-6 w-6 ${!token ? 'text-slate-400' : 'text-blue-600'}`} />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {!token ? 'Invalid Link' : 'Activate your account'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {!token 
                ? 'This activation link is missing a valid token. Please check your email or contact support.' 
                : 'Please set a secure password to complete your account setup.'}
            </p>
          </div>

          {!token ? (
            <Link href="/login" className="block">
              <Button className="w-full h-11 bg-[#0f172a] hover:bg-[#1e293b] text-white font-medium">
                Back to Login
              </Button>
            </Link>
          ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Choose Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...field}
                          disabled={isLoading}
                          className="h-11 bg-slate-50/50 border-slate-200 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Use at least 8 characters with a mix of letters and numbers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                        className="h-11 bg-slate-50/50 border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-[#0f172a] hover:bg-[#1e293b] text-white font-medium"
                disabled={isLoading || !token}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Activate & Set Password
              </Button>
            </form>
          </Form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          By activating, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
