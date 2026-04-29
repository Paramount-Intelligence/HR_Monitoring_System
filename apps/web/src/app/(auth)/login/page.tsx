'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth/AuthContext';
import apiClient from '@/lib/api/client';
import { AuthResponse } from '@/types';
import { Loader2, Eye, EyeOff, CheckCircle2, BarChart3, Users, Network } from 'lucide-react';
import { toast } from 'sonner';

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
      toast.error(
        error.response?.data?.detail || 'Failed to login. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-[#f8f9fa]">
      
      {/* Right Side - Dashboard Preview & Abstract Illustration */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#020617]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        
        <div className="relative z-20 flex flex-col gap-1">
          <div className="flex items-center text-xl font-bold tracking-tight text-white gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl overflow-hidden shrink-0 bg-white p-1.5 shadow-lg border border-white/20">
              <img src="/logo.png" alt="Paramount Logo" className="h-full w-full object-contain" />
            </div>
            <span>Paramount Intelligence</span>
          </div>
          <span className="text-sm text-slate-400 font-medium ml-[3.25rem]">Workforce Intelligence & Execution OS</span>
        </div>
        
        {/* Abstract Dashboard Visual */}
        <div className="relative z-20 mt-auto mb-auto w-full max-w-lg mx-auto transform translate-x-8 hover:translate-x-6 transition-transform duration-700 ease-out">
          <div className="rounded-2xl border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/5">
            {/* Mock Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded-md bg-white/20" />
                <div className="h-3 w-48 rounded-md bg-white/10" />
              </div>
              <div className="flex space-x-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#3b82f6]/40 to-white/20 border border-white/20" />
              </div>
            </div>
            
            {/* Mock KPI Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="h-28 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <Users className="h-5 w-5 text-[#93c5fd]" />
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-white/20" />
                  <div className="h-5 w-20 rounded bg-white/40" />
                </div>
              </div>
              <div className="h-28 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between hover:bg-white/10 transition-colors">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-white/20" />
                  <div className="h-5 w-20 rounded bg-white/40" />
                </div>
              </div>
              <div className="h-28 rounded-xl bg-gradient-to-br from-[#3b82f6]/20 to-[#1d4ed8]/20 border border-[#3b82f6]/30 p-4 flex flex-col justify-between shadow-inner">
                <BarChart3 className="h-5 w-5 text-white" />
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-white/30" />
                  <div className="h-5 w-20 rounded bg-white/60" />
                </div>
              </div>
            </div>

            {/* Mock List */}
            <div className="space-y-3">
              <div className="h-12 w-full rounded-lg bg-white/5 border border-white/5 flex items-center px-4">
                <div className="h-3 w-3/4 rounded bg-white/20" />
              </div>
              <div className="h-12 w-full rounded-lg bg-white/5 border border-white/5 flex items-center px-4">
                <div className="h-3 w-1/2 rounded bg-white/20" />
              </div>
            </div>
          </div>
          
          {/* Decorative floating element */}
          <div className="absolute -bottom-8 -left-12 h-40 w-40 rounded-full bg-[#3b82f6]/10 backdrop-blur-3xl border border-white/5 blur-xl -rotate-12" />
        </div>

        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-3">
            <p className="text-lg text-slate-300 font-medium leading-relaxed">
              "Paramount Intelligence has built an operating system that completely transformed how our enterprise tracks performance, manages daily operations, and maintains governance at scale."
            </p>
            <footer className="text-sm text-slate-400">Sofia Davis, Operations Director</footer>
          </blockquote>
        </div>
      </div>

      {/* Left Side - Login Form */}
      <div className="p-4 sm:p-8 flex items-center justify-center h-full">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px]">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="flex flex-col gap-1 lg:hidden mb-4 items-center">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg overflow-hidden shrink-0 bg-white p-1.5 shadow-sm border border-slate-200">
                <img src="/logo.png" alt="Paramount Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Paramount Intelligence</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Workforce Intelligence & Execution OS</span>
          </div>

          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500">
              Sign in to manage work, teams, and performance insights.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Email address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="name@paramount.com" 
                          {...field} 
                          disabled={isLoading} 
                          className="h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#0f172a]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                        <Link 
                          href="/forgot-password" 
                          className="text-sm text-[#3b82f6] hover:text-[#2563eb] font-medium transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="••••••••" 
                            {...field} 
                            disabled={isLoading} 
                            className="h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#0f172a] pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-[#0f172a] focus:ring-[#0f172a]"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal text-slate-600 cursor-pointer">
                        Remember me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#0f172a] hover:bg-[#1e293b] text-white font-medium text-base shadow-sm transition-all" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <p className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
              Role-Based Access
            </p>
            <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-2">
                <div className="font-semibold text-slate-900">Admin</div>
                <div className="text-slate-500">Full system access</div>
                <div className="font-semibold text-slate-900">HR & Operations</div>
                <div className="text-slate-500">People operations</div>
                <div className="font-semibold text-slate-900">Manager</div>
                <div className="text-slate-500">Team oversight</div>
                <div className="font-semibold text-slate-900">Team Lead</div>
                <div className="text-slate-500">Limited team view</div>
                <div className="font-semibold text-slate-900">Employee</div>
                <div className="text-slate-500">Own work only</div>
                <div className="font-semibold text-slate-900">Intern / Junior</div>
                <div className="text-slate-500">Restricted employee access</div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 text-slate-500 text-center">
                Default password: <strong className="text-slate-700">password123</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
