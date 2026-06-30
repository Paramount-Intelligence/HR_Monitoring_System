'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, RefreshCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceExceptionsApi, AttendanceExceptionItem } from '@/lib/api/attendanceExceptions';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';

export function AttendanceExceptionsCenter({ scope = 'my_team' }: { scope?: 'my_team' | 'organization' }) {
  const [data, setData] = useState<{ summary: Record<string, number>; exceptions: AttendanceExceptionItem[] } | null>(null);
  const [status, setStatus] = useState('open');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { scope, status };
      if (type !== 'all') params.type = type;
      if (search.trim()) params.search = search.trim();
      setData(await attendanceExceptionsApi.list(params));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [scope, status, type]);

  const act = async (item: AttendanceExceptionItem, action: 'resolve' | 'dismiss') => {
    try {
      if (action === 'resolve') {
        await attendanceExceptionsApi.resolve(item.id, 'Reviewed and resolved from exceptions center.');
      } else {
        await attendanceExceptionsApi.dismiss(item.id, 'Dismissed after review.');
      }
      await load();
      toast.success(action === 'resolve' ? 'Exception resolved' : 'Exception dismissed');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const summary = data?.summary ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Attendance Exceptions</h1>
          <p className="text-sm text-[var(--text-secondary)]">Review abnormal attendance cases from real attendance records.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {['open', 'late', 'early', 'missing_checkout', 'absent', 'overtime'].map((key) => (
          <Card key={key} className="border-[var(--border-subtle)]">
            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs uppercase text-[var(--text-muted)]">{key.replace('_', ' ')}</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 text-2xl font-bold">{summary[key] ?? 0}</CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search employee" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><span>{status}</span></SelectTrigger>
          <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="dismissed">Dismissed</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-56"><span>{type.replace('_', ' ')}</span></SelectTrigger>
          <SelectContent>
            {['all', 'late', 'early', 'missing_checkout', 'absent', 'overtime', 'active_too_long', 'correction_request'].map((value) => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={load}>Apply</Button>
      </div>

      <Card className="border-[var(--border-subtle)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Shift</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10}>Loading...</TableCell></TableRow>
              ) : !data?.exceptions.length ? (
                <TableRow><TableCell colSpan={10} className="py-10 text-center text-[var(--text-muted)]">No attendance exceptions found for this filter.</TableCell></TableRow>
              ) : data.exceptions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><div className="font-semibold">{item.user_name}</div><div className="text-xs text-[var(--text-muted)]">{item.user_email}</div></TableCell>
                  <TableCell>{item.department || 'Unassigned'}</TableCell>
                  <TableCell>{item.type.replace('_', ' ')}</TableCell>
                  <TableCell>{item.business_date}</TableCell>
                  <TableCell>{item.shift_name || 'No shift'} {item.shift_start && item.shift_end ? `(${item.shift_start}-${item.shift_end})` : ''}</TableCell>
                  <TableCell>{item.check_in_at ? new Date(item.check_in_at).toLocaleTimeString() : '-'}</TableCell>
                  <TableCell>{item.check_out_at ? new Date(item.check_out_at).toLocaleTimeString() : '-'}</TableCell>
                  <TableCell><StatusBadge status={item.severity} /></TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" title={item.reason || 'View details'}><Eye className="h-4 w-4" /></Button>
                      {item.status === 'open' && <Button size="icon" variant="outline" onClick={() => act(item, 'resolve')}><CheckCircle2 className="h-4 w-4" /></Button>}
                      {item.status === 'open' && <Button size="icon" variant="outline" onClick={() => act(item, 'dismiss')}><XCircle className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
