'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { ManagerPageHeader } from '@/components/manager/ManagerPageHeader';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';

export default function ManagerTeamPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !['admin', 'manager', 'hr_operations'].includes(user.role)) {
      router.push('/unauthorized');
    }
  }, [user, router]);
  
  const [team, setTeam] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTeam() {
      try {
        const data = await usersApi.getUsers();
        setTeam(data);
      } catch (error) {
        toast.error('Failed to load team members');
      } finally {
        setIsLoading(false);
      }
    }
    loadTeam();
  }, []);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <ManagerPageShell>
      <ManagerPageHeader
        title="Team Directory"
        subtitle="Your direct reports, roles, and status"
        icon={Users}
      />

      <Card className="rounded-xl shadow-[var(--shadow-soft)] border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={10} cols={4} />
          ) : team.length === 0 ? (
            <EmptyState 
                title="No team members found"
                description="Your roster is currently empty. Contact HR if this is an error."
                icon={Users}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <TableRow className="hover:bg-transparent h-16">
                    <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Employee</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Email</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Department / Shift</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Role</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((member) => (
                    <TableRow key={member.id} className="hover:bg-[var(--bg-subtle)]/30 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-20 text-[var(--text-primary)]">
                      <TableCell className="pl-10">
                        <div className="flex items-center gap-3">
                          <UserProfilePicture name={member.full_name} user={member} size="sm" />
                          <div className="flex flex-col">
                            <span className="font-bold text-[var(--text-primary)] text-sm">{member.full_name}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">{member.designation || 'Team Member'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-bold text-xs">{member.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tight">{member.department_name || 'General'}</span>
                            <span className="text-[9px] font-bold text-[var(--accent-primary)] uppercase tracking-widest">{member.shift_name || 'Standard Shift'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.role} />
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <StatusBadge status={member.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </ManagerPageShell>
  );
}
