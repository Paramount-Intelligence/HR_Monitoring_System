'use client';

import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { useAuth } from '@/lib/auth/AuthContext';
import { PROFILE_NOTIFICATIONS_PATH } from '@/lib/profile/profile-section';
import {
  ArrowLeft,
  Search,
  Settings2,
  User,
  Shield,
  Lock,
  MessageSquare,
  Video,
  Bell,
  ChevronRight,
} from 'lucide-react';

export type MessagesLeftPanelMode = 'chats' | 'settings';

interface SettingsRow {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled?: boolean;
  onClick?: () => void;
}

interface MessagesSettingsPanelProps {
  onBack: () => void;
  settingsSearch: string;
  onSettingsSearchChange: (value: string) => void;
}

export function MessagesSettingsPanel({
  onBack,
  settingsSearch,
  onSettingsSearchChange,
}: MessagesSettingsPanelProps) {
  const { user } = useAuth();
  const router = useRouter();

  const rows: SettingsRow[] = [
    { id: 'general', label: 'General', icon: <Settings2 className="h-5 w-5" />, enabled: false },
    { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" />, enabled: false },
    { id: 'account', label: 'Account', icon: <Shield className="h-5 w-5" />, enabled: false },
    { id: 'privacy', label: 'Privacy', icon: <Lock className="h-5 w-5" />, enabled: false },
    { id: 'chats', label: 'Chats', icon: <MessageSquare className="h-5 w-5" />, enabled: false },
    { id: 'video', label: 'Video & voice', icon: <Video className="h-5 w-5" />, enabled: false },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-5 w-5" />,
      enabled: true,
      onClick: () => router.push(PROFILE_NOTIFICATIONS_PATH),
    },
  ];

  const filtered = rows.filter((row) =>
    row.label.toLowerCase().includes(settingsSearch.trim().toLowerCase())
  );

  return (
    <aside className="flex flex-col h-full min-h-0 w-full lg:w-[360px] shrink-0 border-r border-[var(--border-subtle)] bg-white dark:bg-[#111b21]">
      <div className="shrink-0 px-3 pt-3 pb-2 bg-[#f0f2f5] dark:bg-[#202c33]">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#54656f] hover:bg-[#e9edef] dark:hover:bg-[#374248]"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">Settings</h1>
        </div>

        <button
          type="button"
          className="w-full flex items-center gap-3 px-2 py-3 mb-3 rounded-lg hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942] text-left"
        >
          <UserProfilePicture
            user={user}
            name={user?.full_name || 'You'}
            size="lg"
            className="h-14 w-14"
          />
          <div className="min-w-0">
            <p className="text-[17px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">
              {user?.full_name || 'Your profile'}
            </p>
            <p className="text-sm text-[#667781] truncate">
              {user?.email || 'Account settings'}
            </p>
          </div>
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667781]" />
          <input
            type="text"
            placeholder="Search settings"
            value={settingsSearch}
            onChange={(e) => onSettingsSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg bg-white dark:bg-[#2a3942] border-0 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40 text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {filtered.map((row) => (
          <button
            key={row.id}
            type="button"
            disabled={!row.enabled}
            onClick={row.onClick}
            className={cn(
              'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors',
              row.enabled
                ? 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            )}
          >
            <span className="text-[#54656f] dark:text-[#aebac1]">{row.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-[#111b21] dark:text-[#e9edef]">{row.label}</p>
              {!row.enabled && (
                <p className="text-xs text-[#667781] mt-0.5">Coming soon</p>
              )}
            </div>
            {row.enabled ? (
              <ChevronRight className="h-5 w-5 text-[#8696a0] shrink-0" />
            ) : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
