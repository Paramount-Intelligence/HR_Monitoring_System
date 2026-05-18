'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import apiClient from '@/lib/api/client';
import { Loader2, ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';
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
      toast.success('Recovery link sent successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send reset request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Success Confirmation State Layout
  if (submitted) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] p-4 transition-all duration-300">
        {/* Soft atmospheric ambient highlights */}
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
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Check your email</h2>
              <p className="text-sm text-[var(--text-secondary)] font-semibold leading-relaxed max-w-[280px] mx-auto">
                If an account exists for that address, we've sent instructions to reset your password.
              </p>
            </div>
            
            <Link href="/login" className="block pt-2 w-full">
              <Button className="btn-primary w-full h-12 rounded-[12px] font-semibold text-base tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[var(--shadow-card)]">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Back to Login
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
      {/* Background radial atmosphere */}
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
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Reset Password</h2>
            <p className="text-xs text-[var(--text-secondary)] font-semibold mt-2 leading-relaxed">
              Enter your work email and we’ll send a secure recovery link.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-[var(--text-secondary)]">Work Email</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[12px] group focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/15 transition-all duration-200">
                        <Mail className="ml-4 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                        <Input 
                          placeholder="name@paramount.com" 
                          {...field} 
                          disabled={isLoading} 
                          className="bg-transparent border-none text-[var(--text-primary)] text-[15px] placeholder:text-[var(--text-muted)] focus-visible:ring-0 h-12 w-full pr-4"
                        />
                      </div>
                    </FormControl>
                    {form.formState.errors.email && (
                      <FormMessage className="flex items-center gap-1 text-[11px] text-[var(--status-danger-text)] font-semibold mt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {form.formState.errors.email?.message}
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
                Send Recovery Link
              </Button>
            </form>
          </Form>

          {/* Footer Branding */}
          <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] text-center">
            <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-wider uppercase">
              © Paramount Intelligence
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors duration-200">
            <ArrowLeft className="h-4 w-4" />
            Return to Login
          </Link>
        </div>
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </div>
  );
}
