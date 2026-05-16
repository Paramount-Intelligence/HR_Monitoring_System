'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Breadcrumbs } from './Breadcrumbs';
import { HeaderTimer } from './HeaderTimer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, 
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Menu, LogOut } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout(true);
    setIsLoggingOut(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-xl px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-slate-500 hover:text-slate-900 hover:bg-slate-100" 
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          
          <div className="hidden md:block">
            <Breadcrumbs />
          </div>

          <div className="flex items-center md:hidden gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-200 shadow-sm">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain p-1" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-sm">Paramount</span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-8">
          <HeaderTimer />

          <div className="h-6 w-px bg-slate-200/60 hidden sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger className="group relative flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100/80 transition-all focus:outline-none ring-1 ring-transparent hover:ring-slate-200">
                <Avatar className="h-8 w-8 border-2 border-white shadow-sm ring-1 ring-slate-200 group-hover:ring-indigo-300 transition-all">
                  <AvatarFallback className="bg-slate-900 text-[10px] font-black text-white">
                    {user ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[100px]">
                    {user?.full_name?.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 mt-2 p-1.5 rounded-2xl shadow-premium-lg border-slate-200/60 backdrop-blur-xl bg-white/95" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-sm font-bold leading-none text-slate-900">{user?.full_name}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-emerald-500" />
                      {user?.email || 'Active Session'}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-slate-100" />

              <DropdownMenuItem 
                onClick={() => setShowLogoutDialog(true)} 
                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 m-1 rounded-xl cursor-pointer font-bold text-xs py-2.5 px-3 group"
              >
                <LogOut className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Sign Out Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Confirm Logout"
        description="Are you sure you want to log out? Your active tracking session will be preserved, but you'll need to log in again to access the dashboard."
        confirmLabel="Logout"
        confirmVariant="destructive"
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
      />
    </>
  );
}
