'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Palmtree, Check, X, Loader2 } from 'lucide-react';
import { leavesApi, LeaveRequest } from '@/lib/api/leaves';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function ManagerLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const data = await leavesApi.getPendingQueue();
      setLeaves(data);
    } catch (error) {
      toast.error('Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await leavesApi.resolveRequest(id, { action: status.toLowerCase() as any });
      toast.success(`Leave ${status.toLowerCase()} successfully`);
      fetchLeaves();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold text-[10px] uppercase tracking-wider">Approved</Badge>;
      case 'REJECTED': return <Badge variant="destructive" className="font-bold text-[10px] uppercase tracking-wider">Rejected</Badge>;
      case 'PENDING': return <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-bold text-[10px] uppercase tracking-wider">Pending</Badge>;
      default: return <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-wider">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Leave Requests</h1>
        <p className="text-sm text-[var(--text-secondary)]">Review and resolve employee leave and time-off requests</p>
      </div>

      <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-xl overflow-hidden text-[var(--text-primary)]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)]">
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Employee</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Type</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Dates</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Reason</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Status</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-[var(--text-muted)] italic font-medium">
                      No leave requests to review.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((leave) => (
                    <TableRow key={leave.id} className="hover:bg-[var(--bg-subtle)]/50 border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-primary)]">
                      <TableCell className="font-bold text-[var(--text-primary)] px-6 py-4">{leave.user_name || 'Team Member'}</TableCell>
                      <TableCell className="capitalize text-[var(--text-secondary)] font-medium px-6 py-4">{leave.leave_type.replace('_', ' ')}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-medium text-xs px-6 py-4">
                        {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-medium max-w-[200px] truncate px-6 py-4">{leave.reason}</TableCell>
                      <TableCell className="px-6 py-4">{getStatusBadge(leave.status)}</TableCell>
                      <TableCell className="text-right px-6 py-4">
                        {leave.status === 'PENDING' && (
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" size="icon" 
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8 rounded-lg"
                              onClick={() => handleAction(leave.id, 'APPROVED')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" 
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 rounded-lg"
                              onClick={() => handleAction(leave.id, 'REJECTED')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
