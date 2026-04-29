'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '@/lib/api/client';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email: data.email });
      setSubmitted(true);
      // Show debug token in dev (remove in production)
      if (response.data.debug_token) {
        setDebugToken(response.data.debug_token);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send reset request. Please try again.');
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
            <h2 className="text-2xl font-semibold text-slate-900">Check your email</h2>
            <p className="mt-2 text-slate-500">
              If an account exists for that email, we've sent a password reset link.
            </p>
          </div>
          
          {debugToken && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <p className="text-xs font-bold text-amber-700 mb-1">🔧 DEV MODE — Reset Token</p>
              <code className="text-xs text-amber-800 break-all">{debugToken}</code>
            </div>
          )}

          <Link href="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
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
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Forgot password?</h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter your work email and we'll send you a reset link.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">Work Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="name@paramount.com"
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
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
          </Form>
        </div>

        <div className="text-center">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
