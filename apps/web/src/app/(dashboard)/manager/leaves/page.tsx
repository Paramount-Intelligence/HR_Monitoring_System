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
      const data = await leavesApi.getLeaves();
      setLeaves(data);
    } catch (error) {
      toast.error('Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await leavesApi.updateLeaveStatus(id, status);
      toast.success(`Leave ${status.toLowerCase()} successfully`);
      fetchLeaves();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>;
      case 'PENDING': return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leave Approvals</h1>
        <p className="text-sm text-slate-500">Review and manage your team's time-off requests.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                      No leave requests to review.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium text-slate-900">{leave.user_name || 'Team Member'}</TableCell>
                      <TableCell className="capitalize text-slate-600">{leave.leave_type.replace('_', ' ')}</TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-[200px] truncate">{leave.reason}</TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell className="text-right">
                        {leave.status === 'PENDING' && (
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" size="icon" 
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8"
                              onClick={() => handleAction(leave.id, 'APPROVED')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" 
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
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
