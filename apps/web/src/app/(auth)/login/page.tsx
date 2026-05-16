'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth/AuthContext';
import apiClient from '@/lib/api/client';
import { AuthResponse } from '@/types';
import { Loader2, Eye, EyeOff, Mail, Lock, UserCircle, AlertCircle } from 'lucide-react';
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

// SVG Cherry Blossom Branch Component
const CherryBlossomBranch = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 300 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M20,180 Q60,150 120,160 T220,120 Q260,100 280,40" 
      fill="none" 
      stroke="#4A3728" 
      strokeWidth="2.5" 
      strokeLinecap="round"
    />
    <path 
      d="M80,155 Q100,120 90,80" 
      fill="none" 
      stroke="#4A3728" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path 
      d="M170,140 Q190,110 230,100" 
      fill="none" 
      stroke="#4A3728" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    {/* Flower shapes */}
    {[
      {x: 280, y: 40}, {x: 240, y: 70}, {x: 210, y: 110}, 
      {x: 170, y: 140}, {x: 130, y: 160}, {x: 90, y: 80}, 
      {x: 85, y: 120}, {x: 260, y: 60}, {x: 230, y: 100}
    ].map((f, i) => (
      <g key={i} transform={`translate(${f.x}, ${f.y})`}>
        <circle cx="0" cy="0" r="5" fill="#FFB7C5" />
        <circle cx="4" cy="4" r="5" fill="#FFB7C5" />
        <circle cx="-4" cy="4" r="5" fill="#FFB7C5" />
        <circle cx="-4" cy="-4" r="5" fill="#FFB7C5" />
        <circle cx="4" cy="-4" r="5" fill="#FFB7C5" />
        <circle cx="0" cy="0" r="2.5" fill="#FF8FA3" />
      </g>
    ))}
    {/* Petals */}
    <path d="M100,60 Q105,55 110,60 T120,70" fill="#FFC8D5" opacity="0.7" />
    <path d="M180,40 Q185,35 190,40 T200,50" fill="#FFC8D5" opacity="0.7" />
  </svg>
);

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
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* BACKGROUND LAYERS */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(160deg,_#C8E8F8_0%,_#B8DFF5_40%,_#A8D4F0_100%)]">
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none" 
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
          aria-hidden="true"
        />
        
        {/* Large Rising Sun */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[360px] h-[360px] md:w-[520px] md:h-[520px] bg-[#D94F4F] rounded-full pointer-events-none z-1" 
          aria-hidden="true"
        />

        {/* Cherry Blossom Branches */}
        <CherryBlossomBranch className="absolute bottom-[-20px] left-[-40px] w-[200px] md:w-[300px] rotate-[15deg] z-[2] pointer-events-none scale-75 md:scale-100" />
        <CherryBlossomBranch className="absolute bottom-[-20px] right-[-40px] w-[200px] md:w-[300px] -scale-x-100 rotate-[-15deg] z-[2] pointer-events-none scale-75 md:scale-100" />

        {/* Dotted Triangle */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30 z-[2] pointer-events-none" aria-hidden="true">
          <svg width="40" height="20" viewBox="0 0 40 20">
            {[...Array(10)].map((_, i) => (
              <circle key={i} cx={4 + i * 4} cy={18 - i * 1.5} r="1" fill="#1E4DB7" />
            ))}
          </svg>
        </div>
      </div>

      {/* LOGIN CARD */}
      <div className="relative z-10 w-full max-w-[92vw] sm:max-w-[420px] animate-in fade-in zoom-in-95 duration-500">
        <div 
          className="bg-[rgba(42,72,140,0.82)] backdrop-blur-[24px] border border-white/12 rounded-[24px] p-[28px_20px] sm:p-[40px_36px] shadow-[0_32px_80px_rgba(15,40,100,0.35),0_8px_24px_rgba(0,0,0,0.2)] flex flex-col"
        >
          {/* App Icon & Title */}
          <div className="flex flex-col items-center space-y-4 mb-7">
            <div className="bg-white w-[64px] h-[64px] rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex items-center justify-center">
              <UserCircle className="h-9 w-9 text-[#1E4DB7]" />
            </div>
            <h1 className="text-[20px] font-semibold text-white">Login to your account</h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-medium text-white/85">Email</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center bg-[rgba(20,50,110,0.7)] border border-white/15 rounded-[12px] group focus-within:border-[#4FC3F7]/60 focus-within:ring-3 focus-within:ring-[#4FC3F7]/15 transition-all">
                        <Mail className="ml-4 h-4 w-4 text-[#90CAF9]/80 group-focus-within:text-white" />
                        <Input 
                          placeholder="name@company.com" 
                          {...field} 
                          disabled={isLoading} 
                          className="bg-transparent border-none text-white text-[15px] placeholder:text-[#90CAF9]/70 focus-visible:ring-0 h-12"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="flex items-center gap-1 text-[12px] text-[#FF8A80]">
                      <AlertCircle className="h-3 w-3" /> {form.formState.errors.email?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-medium text-white/85">Password</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center bg-[rgba(20,50,110,0.7)] border border-white/15 rounded-[12px] group focus-within:border-[#4FC3F7]/60 focus-within:ring-3 focus-within:ring-[#4FC3F7]/15 transition-all">
                        <Lock className="ml-4 h-4 w-4 text-[#90CAF9]/80 group-focus-within:text-white" />
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••" 
                          {...field} 
                          disabled={isLoading} 
                          className="bg-transparent border-none text-white text-[15px] placeholder:text-[#90CAF9]/70 focus-visible:ring-0 h-12 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 text-[#90CAF9]/80 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="flex items-center gap-1 text-[12px] text-[#FF8A80]">
                      <AlertCircle className="h-3 w-3" /> {form.formState.errors.password?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between my-4">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#4FC3F7] cursor-pointer"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormLabel className="text-[13px] font-medium text-white/80 cursor-pointer select-none">
                        Keep me logged in
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <Link 
                  href="/forgot-password" 
                  className="text-[13px] font-medium text-[#90CAF9] hover:text-white transition-colors no-underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-[50px] bg-[linear-gradient(135deg,_#4FC3F7_0%,_#1976D2_60%,_#1565C0_100%)] text-white rounded-[12px] font-semibold text-[16px] tracking-[0.3px] shadow-[0_4px_20px_rgba(21,101,192,0.5)] hover:opacity-92 active:scale-[0.99] transition-all" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Login'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
      
      {/* Toast Notifications Custom Styling */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(15, 40, 100, 0.95)',
            border: '1px solid rgba(79, 195, 247, 0.3)',
            color: 'white',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </div>
  );
}
