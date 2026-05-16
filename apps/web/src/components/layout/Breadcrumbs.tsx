'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/login') return null;

  const paths = pathname.split('/').filter(Boolean);
  
  // Skip the first part if it's a role (admin, employee, etc.) for display but keep for links
  const breadcrumbItems = paths.map((path, index) => {
    const href = `/${paths.slice(0, index + 1).join('/')}`;
    const label = path.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const isLast = index === paths.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-500 font-medium">
      <Link 
        href="/" 
        className="flex items-center hover:text-slate-900 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4 text-slate-300" />
          {item.isLast ? (
            <span className="text-slate-900 font-semibold truncate max-w-[150px]">
              {item.label}
            </span>
          ) : (
            <Link 
              href={item.href}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
