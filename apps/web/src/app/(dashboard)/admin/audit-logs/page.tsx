'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Search, Filter, Eye } from 'lucide-react';
import { auditLogsApi } from '@/lib/api/auditLogs';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await auditLogsApi.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action_type.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATED') || a.includes('ACTIVATED') || a === 'LOGIN') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (a.includes('DELETED') || a.includes('DEACTIVATED') || a.includes('SUSPENDED') || a === 'LOGIN_FAILED') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (a.includes('UPDATED') || a.includes('CHANGED')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (a.includes('PASSWORD')) return 'bg-violet-100 text-violet-700 border-violet-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Audit Trail</h1>
        <p className="text-slate-500">Full compliance logs of all significant actions in the system.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>Track who did what and when.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search actions or entities..." 
                className="pl-10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading audit data...</TableCell></TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No logs found matching your search.</TableCell></TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        User {log.actor_user_id?.substring(0, 8) || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getActionColor(log.action_type)}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{log.entity_type}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">
                        {log.entity_id ? `${log.entity_id.substring(0, 8)}...` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4 text-slate-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
