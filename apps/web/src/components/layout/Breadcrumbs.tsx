'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const [customLabel, setCustomLabel] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      if (typeof window !== 'undefined') {
        setCustomLabel((window as any).__BREADCRUMB_LABEL__ || null);
      }
    };
    
    handleUpdate();
    window.addEventListener('breadcrumb-update', handleUpdate);
    return () => {
      window.removeEventListener('breadcrumb-update', handleUpdate);
    };
  }, [pathname]);

  if (pathname === '/' || pathname === '/login') return null;

  const paths = pathname.split('/').filter(Boolean);
  
  // Skip the first part if it's a role (admin, employee, etc.) for display but keep for links
  const breadcrumbItems = paths.map((path, index) => {
    const href = `/${paths.slice(0, index + 1).join('/')}`;
    
    // Check if the current path segment is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path);
    let label = isUuid 
      ? (customLabel || 'Employee Profile')
      : path.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      
    if (path.toLowerCase() === 'eod') {
      label = 'EOD';
    }
      
    const isLast = index === paths.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center space-x-1 text-xs text-[var(--text-secondary)] font-medium">
      <Link 
        href="/" 
        className="flex items-center hover:text-[var(--text-primary)] transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
          {item.isLast ? (
            <span className="text-[var(--text-primary)] font-semibold truncate max-w-[200px]" title={item.label}>
              {item.label}
            </span>
          ) : (
            <Link 
              href={item.href}
              className="hover:text-[var(--text-primary)] transition-colors truncate max-w-[150px]"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
