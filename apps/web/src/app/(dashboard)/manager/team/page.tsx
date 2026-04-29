'use client';

import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

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
        // Backend /users automatically scopes to team for managers
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team Members</h1>
        <p className="text-sm text-slate-500">View your direct reports.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Direct Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : team.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Users className="h-12 w-12 text-slate-200 mb-4" />
              <p>No team members found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="bg-blue-50 text-blue-700 text-xs">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium text-slate-900">{member.full_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{member.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-slate-500">{member.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {member.status === 'active' 
                          ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge> 
                          : <Badge variant="secondary">Inactive</Badge>
                        }
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
