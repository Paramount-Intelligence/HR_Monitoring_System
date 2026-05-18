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
    <div className="space-y-8 animate-in fade-in duration-500 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Team Directory</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Team Directory</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Directory of your team members and their shifts</p>
        </div>
      </div>

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
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 rounded-xl border border-[var(--border-subtle)] shadow-sm ring-4 ring-[var(--bg-subtle)]/50">
                            <AvatarFallback className="bg-[var(--bg-subtle)] text-[var(--accent-primary)] font-black text-[10px]">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{member.full_name}</span>
                            <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">{member.designation || 'Team Member'}</span>
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
    </div>
  );
}
