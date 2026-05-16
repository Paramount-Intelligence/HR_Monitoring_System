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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setSubmitted(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send reset request. Please try again.');
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
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Check your email</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              If an account exists for that address, we've sent instructions to reset your password.
            </p>
          </div>
          
          <Link href="/login" className="block pt-2">
            <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
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
              <Mail className="h-7 w-7 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reset Password</h1>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              Enter your work email below and we'll send you a secure recovery link.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 font-bold text-[10px] uppercase tracking-[0.15em] ml-1">Work Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="name@paramount.com"
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
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Recovery Link
              </Button>
            </form>
          </Form>
        </div>

        <div className="text-center">
          <Link href="/login" className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
