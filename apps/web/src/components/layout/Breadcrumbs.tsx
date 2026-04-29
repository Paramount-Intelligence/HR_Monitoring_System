'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Breadcrumbs() {
  const pathname = usePathname();
  
  if (!pathname || pathname === '/') return null;

  const paths = pathname.split('/').filter(Boolean);
  
  // Don't show breadcrumbs on login/auth pages
  if (paths[0] === 'login' || paths[0] === 'forgot-password' || paths[0] === 'unauthorized') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-500 mb-6">
      <Link 
        href="/" 
        className="flex items-center hover:text-slate-900 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join('/')}`;
        const isLast = index === paths.length - 1;
        const title = path
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        return (
          <div key={href} className="flex items-center space-x-1">
            <ChevronRight className="h-4 w-4 text-slate-400" />
            {isLast ? (
              <span className="font-medium text-slate-900 truncate max-w-[150px] sm:max-w-none">
                {title}
              </span>
            ) : (
              <Link 
                href={href}
                className="hover:text-slate-900 transition-colors truncate max-w-[100px] sm:max-w-none"
              >
                {title}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
