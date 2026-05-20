'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth/AuthContext';
import apiClient from '@/lib/api/client';
import { AuthResponse } from '@/types';
import { Loader2, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const payload = {
        email: data.email,
        password: data.password,
      };
      const response = await apiClient.post<AuthResponse>('/auth/login', payload);
      const { access_token, refresh_token, user } = response.data;
      
      toast.success('Logged in successfully');
      login(access_token, refresh_token, user);
    } catch (error: any) {
      console.error('Login error', error);
      let errorMessage = 'Failed to login. Please check your credentials.';
      
      if (!error.response) {
        errorMessage = 'Unable to connect to server. Please check your network connection.';
      } else if (error.response.status === 401) {
        errorMessage = 'Invalid credentials. Please check your email and password.';
      } else if (error.response.status === 404) {
        errorMessage = 'API endpoint not found or backend route unavailable.';
      } else {
        errorMessage = error.response?.data?.detail || error.response?.data?.error?.message || errorMessage;
      }
      
      toast.error(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] p-4 transition-all duration-300">
      {/* BACKGROUND DECORATIONS & RADIAL GLOWS */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Soft Accent Colors Atmospheric Glows */}
        <div 
          className="absolute -top-[25%] -left-[15%] w-[70%] h-[70%] rounded-full bg-[var(--accent-primary)]/8 blur-[120px]" 
        />
        <div 
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[var(--accent-primary)]/4 blur-[100px]" 
        />
        
        {/* Fine Engineering Mesh Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]" 
          style={{
            backgroundImage: `linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* LOGIN CARD */}
      <div className="relative z-10 w-full max-w-[92vw] sm:max-w-[430px] animate-in fade-in zoom-in-95 duration-500 my-8">
        <div 
          className="bg-[var(--bg-surface)]/60 backdrop-blur-xl border border-[var(--border-default)] rounded-[24px] p-6 sm:p-10 shadow-[var(--shadow-card)] flex flex-col"
        >
          {/* Paramount Branding Block */}
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
            <p className="text-xs text-[var(--text-secondary)] mt-3 text-center max-w-[280px] leading-relaxed">
              Secure access to your workforce monitoring and operations platform.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-[var(--text-secondary)]">Email</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[12px] group focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/15 transition-all duration-200">
                        <Mail className="ml-4 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
                        <Input 
                          placeholder="name@company.com" 
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
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold text-[var(--text-secondary)]">Password</FormLabel>
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
                    {form.formState.errors.password && (
                      <FormMessage className="flex items-center gap-1 text-[11px] text-[var(--status-danger-text)] font-semibold mt-1">
                        <AlertCircle className="h-3 w-3 shrink-0" /> {form.formState.errors.password?.message}
                      </FormMessage>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between py-1">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-elevated)] accent-[var(--accent-primary)] cursor-pointer"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
                        Keep me logged in
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <Link 
                  href="/forgot-password" 
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline transition-all"
                >
                  Forgot password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="btn-primary w-full h-12 rounded-[12px] font-semibold text-base tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[var(--shadow-card)]" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
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
      </div>
      
      {/* Toast Notifications */}
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
