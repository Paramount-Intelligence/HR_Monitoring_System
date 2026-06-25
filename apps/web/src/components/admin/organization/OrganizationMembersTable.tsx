'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrganizationMember } from '@/lib/api/organizationMembers';

interface OrganizationMembersTableProps {
  members: OrganizationMember[];
  emptyMessage?: string;
}

export function OrganizationMembersTable({
  members,
  emptyMessage = 'No employees assigned.',
}: OrganizationMembersTableProps) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No employees"
        description={emptyMessage}
        icon={Users}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--bg-subtle)]">
            <TableHead className="text-xs font-bold">Name</TableHead>
            <TableHead className="text-xs font-bold">Role</TableHead>
            <TableHead className="text-xs font-bold">Designation</TableHead>
            <TableHead className="text-xs font-bold">Department</TableHead>
            <TableHead className="text-xs font-bold">Shift</TableHead>
            <TableHead className="text-xs font-bold">Manager</TableHead>
            <TableHead className="text-xs font-bold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium text-sm">{member.full_name}</TableCell>
              <TableCell className="text-xs capitalize">{member.role.replace(/_/g, ' ')}</TableCell>
              <TableCell className="text-xs">{member.designation || '—'}</TableCell>
              <TableCell className="text-xs">{member.department_name || '—'}</TableCell>
              <TableCell className="text-xs">{member.shift_name || '—'}</TableCell>
              <TableCell className="text-xs">{member.manager_name || '—'}</TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    'text-[10px] font-bold',
                    member.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-700'
                      : 'bg-slate-500/15 text-slate-600'
                  )}
                >
                  {member.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
