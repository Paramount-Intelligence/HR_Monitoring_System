'use client';

import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { getDashboardPath } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto text-center px-6">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-rose-100 flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-rose-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          You don't have permission to access this page. 
          This area requires elevated privileges that your current role doesn't have.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={() => router.push(getDashboardPath())}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to My Dashboard
          </Button>
        </div>
        
        <p className="mt-8 text-xs text-slate-400">
          If you believe this is an error, please contact your system administrator.
        </p>
      </div>
    </div>
  );
}
